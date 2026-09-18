import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/tenant-access";
import { servicePricesForClinic } from "@/lib/service-price";

export const dynamic = "force-dynamic";

// GET — the active service prices of the caller's own tenant (activity 52,
// T-4). This used to list every tenant's prices, so the booking form could
// show — and charge — another tenant's consultation fee.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(await servicePricesForClinic(actor.clinicId));
  } catch (error: any) {
    console.error("[patient/service-prices GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
