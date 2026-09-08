# strikr Badge Visual System

Die Hall of Fame trennt bewusst **Badge-Typ** und **visuelle Seltenheit**:

- Die **Kategorie** sagt, *was* erreicht wurde (Karriere, Disziplin, Siegeserie, Pechserie, Special).
- Das **Material/Finish** sagt, *wie hoch bzw. selten* die Stufe ist.

Damit ist z. B. „Disziplin“ keine eigene Farbe. Ein Disziplin-Badge kann Blech, Bronze, Silber, Gold oder Legendär sein.

## Materialien / Seltenheit

| Interner Tier | Anzeige | Bedeutung | Asset |
| --- | --- | --- | --- |
| `copper` | Blech | Einstieg / erste Stufe | `blech.webp` |
| `bronze` | Bronze | etabliert / mittlere Stufe | `bronze.webp` |
| `silver` | Silber | starke Stufe | `silber.webp` |
| `gold` | Gold | Elite-Stufe | `gold.webp` |
| `goat` | Legendär / Rainbow | höchste bzw. besonders seltene Stufe | `goat.webp` |

## Aktuelle Zuordnung je Badge

### Karriere – Teilnahmen

| Badge | Finish |
| --- | --- |
| 10 Einsätze | Blech |
| 25 Einsätze | Bronze |
| 50 Einsätze | Silber |
| 100 Einsätze | Gold |
| 250 Einsätze | Legendär / Rainbow |
| 500 Einsätze | Legendär / Rainbow |

### Karriere – Siege

| Badge | Finish |
| --- | --- |
| 1. Karrieresieg | Blech |
| 10 Siege | Bronze |
| 25 Siege | Silber |
| 50 Siege | Gold |
| 100 Siege | Legendär / Rainbow |
| 250 Siege | Legendär / Rainbow |

### Disziplin – Teilnahme-Serien

| Badge | Voraussetzung | Finish |
| --- | ---: | --- |
| Warmgelaufen | 3 Trainings in Folge | Blech |
| Dauerläufer | 5 Trainings in Folge | Bronze |
| Unkaputtbar | 10 Trainings in Folge | Silber |
| Inventar | 15 Trainings in Folge | Gold |
| Immer da | 20 Trainings in Folge | Legendär / Rainbow |

### Siegeserien

| Badge | Voraussetzung | Finish |
| --- | ---: | --- |
| Erster Dreier | 1. Sieg der Badge-Saison | Blech |
| Lauf | 3 Siege in Folge | Bronze |
| Auf einer Mission | 5 Siege in Folge | Silber |
| Nicht zu stoppen | 7 Siege in Folge | Gold |
| Seriensieger | 10 Siege in Folge | Legendär / Rainbow |

### Pechserien

Hier gibt es bewusst keine Legendär-Stufe – lange Niederlagenserien sollen witzig sein, aber nicht als höchste Trophäe inszeniert werden.

| Badge | Voraussetzung | Finish |
| --- | ---: | --- |
| Pechvogel | 3 Niederlagen in Folge | Bronze |
| Unglücksrabe | 5 Niederlagen in Folge | Silber |
| Schwarze Serie | 7 Niederlagen in Folge | Gold |

### Specials

| Badge | Finish | Gedanke |
| --- | --- | --- |
| Saisonauftakt | Blech | Einstieg in eine neue Badge-Saison |
| Leidensfähig | Bronze | ungewöhnlicher Saisonverlauf |
| Comeback | Silber | Rückkehr nach Pause + Sieg |
| Fluch gebrochen | Gold | Negativserie beendet |
| Glücksbringer | Legendär / Rainbow | seltenes starkes Saisonprofil |

## Datenlogik A / B / C

- **A**: bestehende Daten zählen rückwirkend auch für das Badge.
- **B**: bestehende Daten bleiben für Stats, Badge-Vergabe startet erst mit einer neuen Saison.
- **C**: bestehende Daten bleiben für Stats, Badge-Vergabe startet ab Feature-Aktivierung.

Aktuell vereinbart:

- Karriere Teilnahmen: **A**
- Karriere Siege: **A**
- Saison-Teilnahmen-Meilensteine: **B**
- Saisonauftakt: **B**
- Teilnahme-Serien: **C**
- Siegesserien: **C**
- Niederlagenserien: **C**
- geheime Badges / Specials: **C**
- Treue-Badges über Saisons: **A**
- Halbzeit-/Saison-Awards: **C**, noch zu definieren

## Noch nicht final definiert

Folgende vereinbarte Bereiche brauchen noch konkrete Namen/Schwellen bzw. Logik, bevor sie in den finalen Katalog aufgenommen werden:

- Saison-Teilnahmen-Meilensteine (B)
- Treue-Badges über mehrere Saisons (A)
- Halbzeit-/Saison-Awards (C)
- manuelle Saison-Specials wie „schönstes Tor“ oder „Moment des Jahres“

Die visuelle Logik soll auch für diese Badges gelten: **Kategorie = Art des Erfolgs, Material = Schwierigkeit/Seltenheit**.
