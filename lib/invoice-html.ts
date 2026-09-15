// Styled, print-friendly invoice HTML — same "HTML instead of a real PDF"
// pattern as app/api/soap-notes/[id]/pdf/route.ts, since no PDF library is
// installed. English-only by design (UK patients/clients).

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceBusinessInfo {
  name: string;
  tradingName?: string | null;
  addressLines?: string[];
  email?: string | null;
  phone?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankSortCode?: string | null;
  bankAccountNumber?: string | null;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate?: Date | null;
  business: InvoiceBusinessInfo;
  clientName: string;
  clientEmail?: string | null;
  items: InvoiceItem[];
  notes?: string | null;
  acceptsCash?: boolean;
  acceptsBankTransfer?: boolean;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function fmtMoney(n: number): string {
  return `£${n.toFixed(2)}`;
}

export function buildInvoiceHtml(data: InvoiceData): string {
  const total = data.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  const rows = data.items
    .map(
      (it) => `
        <tr>
          <td class="desc">${it.description}</td>
          <td class="num">${it.quantity}</td>
          <td class="num">${fmtMoney(it.unitPrice)}</td>
          <td class="num">${fmtMoney(it.quantity * it.unitPrice)}</td>
        </tr>`
    )
    .join("");

  const addressBlock = (data.business.addressLines || []).filter(Boolean).join("<br>");

  const paymentBlocks: string[] = [];
  if (data.acceptsCash) {
    paymentBlocks.push(`
      <div class="pay-option">
        <h4>Cash</h4>
        <p>Payable in person at the time of your appointment.</p>
      </div>`);
  }
  if (data.acceptsBankTransfer && data.business.bankAccountNumber) {
    paymentBlocks.push(`
      <div class="pay-option">
        <h4>Bank Transfer</h4>
        <table class="bank-table">
          <tr><td>Account name</td><td>${data.business.bankAccountName || data.business.name}</td></tr>
          <tr><td>Bank</td><td>${data.business.bankName || ""}</td></tr>
          <tr><td>Sort code</td><td>${data.business.bankSortCode || ""}</td></tr>
          <tr><td>Account number</td><td>${data.business.bankAccountNumber || ""}</td></tr>
          <tr><td>Reference</td><td>${data.invoiceNumber}</td></tr>
        </table>
      </div>`);
  }

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<title>Invoice ${data.invoiceNumber}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; max-width: 720px; margin: 0 auto; padding: 40px; color: #26332B; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4F7361; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { color: #4F7361; margin: 0 0 6px; font-size: 22px; }
  .header p { margin: 2px 0; color: #555; font-size: 13px; }
  .invoice-meta { text-align: right; }
  .invoice-meta h2 { margin: 0 0 8px; color: #26332B; font-size: 20px; letter-spacing: 1px; }
  .invoice-meta p { margin: 2px 0; font-size: 13px; color: #555; }
  .bill-to { margin-bottom: 30px; }
  .bill-to h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #8A6D3B; margin: 0 0 6px; }
  .bill-to p { margin: 2px 0; font-size: 14px; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  table.items th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; background: #4F7361; padding: 10px 12px; }
  table.items td { padding: 10px 12px; border-bottom: 1px solid #E4E1D8; font-size: 14px; }
  table.items td.num, table.items th.num { text-align: right; }
  .total-row td { font-weight: bold; font-size: 15px; border-top: 2px solid #4F7361; border-bottom: none; }
  .payment-section { margin-top: 30px; padding: 20px; background: #F5F4F1; border-radius: 8px; }
  .payment-section h3 { margin: 0 0 12px; font-size: 14px; color: #26332B; }
  .pay-option { margin-bottom: 16px; }
  .pay-option:last-child { margin-bottom: 0; }
  .pay-option h4 { margin: 0 0 6px; font-size: 13px; color: #4F7361; }
  .pay-option p { margin: 0; font-size: 13px; color: #444; }
  table.bank-table td { padding: 2px 0; font-size: 13px; border: none; }
  table.bank-table td:first-child { color: #777; width: 130px; }
  .notes { margin-top: 24px; font-size: 13px; color: #555; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E4E1D8; text-align: center; color: #888; font-size: 11px; }
  .download-bar { text-align: right; margin-bottom: 16px; }
  .download-bar button { background: #4F7361; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-size: 13px; cursor: pointer; font-family: inherit; }
  .download-bar button:hover { background: #435F52; }
  @media print { body { padding: 20px; } .no-print { display: none !important; } }
</style>
</head>
<body>
  <div class="download-bar no-print">
    <button onclick="window.print()">Download PDF</button>
  </div>
  <div class="header">
    <div>
      <h1>${data.business.tradingName || data.business.name}</h1>
      ${addressBlock ? `<p>${addressBlock}</p>` : ""}
      ${data.business.phone ? `<p>${data.business.phone}</p>` : ""}
      ${data.business.email ? `<p>${data.business.email}</p>` : ""}
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p><strong>Number:</strong> ${data.invoiceNumber}</p>
      <p><strong>Date:</strong> ${fmtDate(data.issueDate)}</p>
      ${data.dueDate ? `<p><strong>Due:</strong> ${fmtDate(data.dueDate)}</p>` : ""}
    </div>
  </div>

  <div class="bill-to">
    <h3>Billed to</h3>
    <p>${data.clientName}</p>
    ${data.clientEmail ? `<p>${data.clientEmail}</p>` : ""}
  </div>

  <table class="items">
    <thead>
      <tr><th>Description</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Amount</th></tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row"><td colspan="3">Total</td><td class="num">${fmtMoney(total)}</td></tr>
    </tbody>
  </table>

  ${paymentBlocks.length ? `<div class="payment-section"><h3>How to pay</h3>${paymentBlocks.join("")}</div>` : ""}

  ${data.notes ? `<div class="notes">${data.notes}</div>` : ""}

  <div class="footer">
    <p>${data.business.tradingName || data.business.name}${data.business.email ? " · " + data.business.email : ""}</p>
    <p>Thank you for your trust in our care.</p>
  </div>
</body>
</html>`;
}
