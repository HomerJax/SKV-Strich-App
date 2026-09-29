import { NextResponse } from "next/server";
import { confirmSumUpBeerPayment } from "@/lib/cashbox/sumup-confirm";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const consumptionId = Number(url.searchParams.get("consumption_id") ?? "");
  if (!Number.isFinite(consumptionId)) {
    return NextResponse.json({ error: "invalid consumption" }, { status: 400 });
  }

  try {
    const result = await confirmSumUpBeerPayment(consumptionId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("SumUp beer callback failed", error);
    return NextResponse.json({ error: "verification failed" }, { status: 500 });
  }
}
