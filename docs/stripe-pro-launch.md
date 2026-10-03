# strikr PRO – Stripe Launch Checklist

## Einführungspreise
- Monatlich: **4,99 €**
- Jährlich: **49,99 €**
- Stripe Lookup Keys:
  - `strikr_pro_monthly`
  - `strikr_pro_yearly`

Die aktuellen Preise sind bewusst als Early-Adopter-/Einführungspreise gedacht. Bei einer späteren Preiserhöhung wird ein neuer Stripe-Preis erstellt und der Lookup Key auf den neuen Preis übertragen. Bestehende Abos bleiben dadurch auf ihrem alten Price-ID-Preis.

## Testmodus – erledigt
- Produkt `strikr PRO` angelegt
- Monatsabo 4,99 € angelegt
- Jahresabo 49,99 € angelegt
- Test-Checkout für 4,99 € erfolgreich bezahlt
- Stripe Subscription wurde `active`
- `club_id` und `plan_key` werden als Metadata mitgegeben
- Kundenportal eingerichtet
- Zahlungsmittel-Update aktiviert
- Rechnungsverlauf aktiviert
- Wechsel Monat/Jahr aktiviert
- Kündigung zum Periodenende aktiviert
- Kündigungsgründe aktiviert
- Jahres-Checkout für 49,99 € erfolgreich erzeugt

## App-Code – erledigt
- `/pro`
- Checkout API: `/api/billing/checkout`
- Customer Portal API: `/api/billing/portal`
- Stripe Webhook: `/api/billing/webhook`
- automatische Synchronisierung nach `club_billing`
- Stripe-Felder in Staging-Supabase migriert
- Free Launch bleibt fail-safe aktiv, solange Monetarisierung nicht bewusst eingeschaltet wird
- Preise werden per Stripe Lookup Key aufgelöst; Price IDs müssen nicht in Vercel gepflegt werden

## Noch vor Live
1. Live-Stripe-Konto vollständig aktivieren.
2. Live-Produkt `strikr PRO` mit denselben Lookup Keys anlegen.
3. In Vercel setzen:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
4. Stripe Webhook anlegen:
   - Staging: `https://staging.strikr.team/api/billing/webhook`
   - Live: `https://www.strikr.team/api/billing/webhook`
5. Events aktivieren:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Produktionsmigration `202610021330_add_stripe_billing_fields.sql` anwenden.
7. Live-Testzahlung mit echtem Club durchführen.
8. Erst danach `NEXT_PUBLIC_FREE_LAUNCH=false` setzen.
9. Vor Freigabe in den nativen Stores prüfen, wie PRO-Kauf in iOS/Android angeboten wird.
10. Umsatzsteuer/Steuerdarstellung für Live-Betrieb festlegen.

## Rollout-Prinzip
Bestehende frühe Kunden können auf alten Stripe Price IDs bleiben. Für spätere Neukunden wird ein neuer Preis erstellt und der jeweilige Lookup Key auf den neuen Preis übertragen.
