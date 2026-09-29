import { NextResponse } from "next/server";
import { confirmSumUpBeerPayment } from "@/lib/cashbox/sumup-confirm";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const consumptionId = Number(url.searchParams.get("consumption_id") ?? "");
  if (!Number.isFinite(consumptionId)) {
    return NextResponse.redirect(new URL("/home?beer_error=SumUp-Zahlung konnte nicht zugeordnet werden.", url.origin));
  }

  try {
    const result = await confirmSumUpBeerPayment(consumptionId);
    const target =
      result.status === "paid"
        ? "/home?beer_saved=sumup"
        : "/home?beer_error=SumUp-Zahlung ist noch nicht bestätigt.";
    return NextResponse.redirect(new URL(target, url.origin));
  } catch (error) {
    console.error("SumUp beer return verification failed", error);
    return NextResponse.redirect(new URL("/home?beer_error=SumUp-Zahlung konnte nicht geprüft werden.", url.origin));
  }
}
