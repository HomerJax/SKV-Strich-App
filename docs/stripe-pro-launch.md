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
- Free Launch ist abgeschaltet; neue und bestehende reguläre Vereine werden ausschließlich anhand ihres gespeicherten Free-/Stripe-Pro-Tarifs bewertet. Founder bleiben dauerhaft Pro.
- Preise werden per Stripe Lookup Key aufgelöst; Price IDs müssen nicht in Vercel gepflegt werden

## Free/Pro-Berechtigung in Production
- `NEXT_PUBLIC_FREE_LAUNCH=false` ist in Production gesetzt; die Berechtigungslogik wertet keinen Free-Launch-Schalter oder Club-Bypass mehr aus.
- Neue Vereine starten mit `plan_key=free`.
- Founder mit aktivem Founder-Plan behalten dauerhaft Pro; Stripe-Pro wird ausschließlich über eine aktive Stripe-Berechtigung freigeschaltet.
- Reguläre Pro-Testphasen und manuelle Pro-Zuteilungen sind deaktiviert.

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
8. Free-/Pro-Berechtigungen mit Founder-, Free- und Stripe-Abo-Regressionsprüfungen verifizieren.
9. Vor Freigabe in den nativen Stores prüfen, wie PRO-Kauf in iOS/Android angeboten wird.
10. Umsatzsteuer/Steuerdarstellung für Live-Betrieb festlegen.

## Rollout-Prinzip
Bestehende frühe Kunden können auf alten Stripe Price IDs bleiben. Für spätere Neukunden wird ein neuer Preis erstellt und der jeweilige Lookup Key auf den neuen Preis übertragen.

## Neuer 28-Tage-PRO-Test (Feature Branch – noch NICHT live, Oktober 2026)
- Neue Clubs erhalten **nur bei** `STRIKR_PRO_TRIAL_ENABLED=true` einmalig 28 Tage `pro_trial`, gerechnet ab Erstellung in UTC; keine Kreditkarte, keine Stripe-Subscription, kein automatischer Kauf.
- Ohne Flag bleiben neue Clubs im bisherigen Free-Plan. Bestehende Free-, Founder-, historische Supercup- und Stripe-Abos werden beim Rollout nicht umgestellt.
- Die zentrale `getBillingAccess`-Berechtigungsprüfung gewährt Trial-PRO nur bei aktivem `pro_trial`-Plan, `trial_ends_at>now()`, ohne Stripe-Anbieter/Subscription. Nach Ablauf gelten **ohne Cron** automatisch die Free-Limits; keine Datenlöschung.
- Stripe-Upgrade während der Testphase ist freiwillig möglich. Der Stripe-Webhook aktualisiert den Plan auf `pro_monthly` oder `pro_yearly`, sodass Trial-Ablauf danach keinen Einfluss auf das Abo hat.
- Bei einmaliger Neuanlage schreibt der Creation-Flow einen Trial-Billing-Eintrag. Konflikte werden nicht überschrieben, um bestehende Club-Billing-Daten zu schützen.
- Die Pro-Seite zeigt den verbleibenden Zeitraum oder den Free-Fallback an und erklärt den freiwilligen Checkout (DE/EN). Die öffentlichen Testversprechen erscheinen erst bei aktivem Feature-Flag.

### Rollout / Freigabe
1. Vorab **Staging-DB sichern**, Migration `20261030213000_add_28_day_pro_trial.sql` auf Staging anwenden und den Constraint prüfen.
2. Branch deployen, `STRIKR_PRO_TRIAL_ENABLED=true` **nur in Staging** setzen. `npm run test:trial`, Typecheck sowie einen echten Staging-Neuclub mit End-to-End-Pro-Funktionen prüfen.
3. Testzeitraum bei einer Testgruppe kontrolliert bis nach die Deadline setzen und sicherstellen, dass Free greift, ohne Daten zu verlieren. Bereits zahlende Clubs, Founder, Trial→Stripe und mobile Clients regressionsprüfen.
4. Auf Production **erst die DB-Migration** anwenden; Code deployen mit fehlendem/false Flag; nach erfolgreicher Verifikation das Flag aktivieren und Production Redeploy durchführen.
5. Erst nach erfolgreichem Live-Test `28 Tage Pro kostenlos` in Akquise/Website werben.
6. Vor Produktionsfreigabe explizit klären: Anzahl Trials pro Gründer/Club, missbräuchliche Teamneuanlagen, persistiertes Trial-Ende in Auswertungen, sowie mögliche App-Store-Richtlinien für Pro-Upgrades.

### Diagnostik
- `npm run test:trial` prüft unter anderem Trial-Dauer, Ablauf, Provider-/Status-Prüfung, Legacy-Supercup, Founder, Stripe und Rollout-Flag.
- CI: `.github/workflows/pro-trial.yml` auf PRs.
- Weitere Growth-Analytics für `trial_started`, `trial_expired` und `trial_to_paid` werden gesondert geplant, da derzeit nur vier `growth_funnel_events` definiert sind. Keine unkontrollierten neuen Event-Typen in Production schreiben.
