import "server-only";

type SumUpCheckout = {
  id: string;
  status: "PENDING" | "FAILED" | "PAID" | "EXPIRED";
  hosted_checkout_url?: string | null;
  transaction_id?: string | null;
  transaction_code?: string | null;
};

function apiKey() {
  const key = process.env.SUMUP_API_KEY?.trim();
  if (!key) throw new Error("SUMUP_API_KEY is not configured");
  return key;
}

export async function createSumUpCheckout(params: {
  reference: string;
  amountCents: number;
  merchantCode: string;
  description: string;
  returnUrl: string;
  redirectUrl: string;
}) {
  const response = await fetch("https://api.sumup.com/v0.1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      checkout_reference: params.reference,
      amount: Number((params.amountCents / 100).toFixed(2)),
      currency: "EUR",
      merchant_code: params.merchantCode,
      description: params.description,
      return_url: params.returnUrl,
      redirect_url: params.redirectUrl,
      hosted_checkout: { enabled: true },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`SumUp checkout creation failed: ${response.status}`);
  }

  const checkout = (await response.json()) as SumUpCheckout;
  if (!checkout.id || !checkout.hosted_checkout_url) {
    throw new Error("SumUp returned no hosted checkout URL");
  }

  return checkout;
}

export async function getSumUpCheckout(checkoutId: string) {
  const response = await fetch(
    `https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(checkoutId)}`,
    {
      headers: { Authorization: `Bearer ${apiKey()}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`SumUp checkout lookup failed: ${response.status}`);
  }

  return (await response.json()) as SumUpCheckout;
}
