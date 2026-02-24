const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  // Fetch real data from Companies House API
  const API_KEY = "9c19155c-3814-4783-98cf-cb3c221d06a6";
  const CRN = "16548405";

  console.log("Fetching from Companies House API...");
  const [profileRes, officersRes] = await Promise.all([
    fetch(`https://api.company-information.service.gov.uk/company/${CRN}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${API_KEY}:`).toString("base64")}` },
    }),
    fetch(`https://api.company-information.service.gov.uk/company/${CRN}/officers`, {
      headers: { Authorization: `Basic ${Buffer.from(`${API_KEY}:`).toString("base64")}` },
    }),
  ]);

  const profile = await profileRes.json();
  const officers = await officersRes.json();

  console.log("Company:", profile.company_name);
  console.log("Status:", profile.company_status);
  console.log("SIC codes:", profile.sic_codes);
  console.log("Officers:", officers.items?.length || 0);

  // Map to CompanyProfile fields
  const activeOfficers = (officers.items || []).filter((o) => !o.resigned_on);
  const directorsJson = JSON.stringify(
    activeOfficers.map((o) => ({
      name: o.name || "",
      role: o.officer_role ? o.officer_role.charAt(0).toUpperCase() + o.officer_role.slice(1).replace(/_/g, " ") : "Director",
      appointedDate: o.appointed_on || "",
      nationality: o.nationality || "",
      occupation: o.occupation || "",
      address: [o.address?.premises, o.address?.address_line_1, o.address?.address_line_2, o.address?.locality, o.address?.region, o.address?.postal_code, o.address?.country].filter(Boolean).join(", "),
    })),
    null,
    2
  );

  const SIC_LOOKUP = {
    "86900": "Other human health activities",
    "93130": "Fitness facilities",
    "96040": "Physical well-being activities",
  };

  const sicDescriptions = (profile.sic_codes || []).map((c) => SIC_LOOKUP[c] || c).join(", ");
  const accRefDate = profile.accounts?.accounting_reference_date;
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const taxYearEnd = accRefDate ? `${accRefDate.day} ${months[parseInt(accRefDate.month) - 1]}` : "";

  // Helper to convert YYYY-MM-DD to DateTime or null
  const toDate = (d) => d ? new Date(`${d}T00:00:00.000Z`) : null;

  const companyData = {
    companyName: profile.company_name || "BRUNO PHYSICAL REHABILITATION LTD",
    companyNumber: profile.company_number || CRN,
    companyType: "Private Limited Company",
    companyStatus: "Active",
    dateOfIncorporation: toDate(profile.date_of_creation),
    countryOfOrigin: "United Kingdom",
    sicCodes: (profile.sic_codes || []).join(", "),
    sicDescriptions,
    regAddressLine1: profile.registered_office_address?.address_line_1 || "",
    regAddressLine2: profile.registered_office_address?.address_line_2 || "",
    regAddressCity: profile.registered_office_address?.locality || "",
    regAddressCounty: profile.registered_office_address?.region || "",
    regAddressPostcode: profile.registered_office_address?.postal_code || "",
    regAddressCountry: profile.registered_office_address?.country || "England",
    nextAccountsDue: toDate(profile.accounts?.next_due),
    lastAccountsFiled: toDate(profile.accounts?.last_accounts?.made_up_to),
    nextConfirmationDue: toDate(profile.confirmation_statement?.next_due),
    lastConfirmationFiled: toDate(profile.confirmation_statement?.last_made_up_to),
    accountingPeriodEnd: toDate(profile.accounts?.next_accounts?.period_end_on),
    accountingPeriodStart: toDate(profile.accounts?.next_accounts?.period_start_on),
    taxYearEnd,
    directorsJson,
    secretaryName: activeOfficers.find((o) => o.officer_role === "secretary")?.name || "",
  };

  // Find clinic
  const clinic = await p.clinic.findFirst();
  if (!clinic) {
    console.log("No clinic found!");
    await p.$disconnect();
    return;
  }

  console.log("Clinic:", clinic.id, clinic.name);

  // Upsert company profile
  const existing = await p.companyProfile.findUnique({ where: { clinicId: clinic.id } });

  if (existing) {
    await p.companyProfile.update({
      where: { clinicId: clinic.id },
      data: companyData,
    });
    console.log("Updated company profile");
  } else {
    await p.companyProfile.create({
      data: { clinicId: clinic.id, ...companyData },
    });
    console.log("Created company profile");
  }

  // Verify
  const saved = await p.companyProfile.findUnique({ where: { clinicId: clinic.id } });
  console.log("\nSaved profile:");
  console.log("  Name:", saved.companyName);
  console.log("  CRN:", saved.companyNumber);
  console.log("  Status:", saved.companyStatus);
  console.log("  SIC:", saved.sicCodes, "->", saved.sicDescriptions);
  console.log("  Address:", saved.regAddressLine1, saved.regAddressCity, saved.regAddressPostcode);
  console.log("  Accounts due:", saved.nextAccountsDue);
  console.log("  Confirmation due:", saved.nextConfirmationDue);
  console.log("  Tax year end:", saved.taxYearEnd);
  console.log("  Directors:", saved.directorsJson ? JSON.parse(saved.directorsJson).length : 0);

  await p.$disconnect();
})();
