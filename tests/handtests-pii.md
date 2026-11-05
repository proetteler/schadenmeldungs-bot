# Tests PII-Maskierung

- **Datum:** 2026-11-05
- **Code:** [`code-nodes/mask-pii.js`](../code-nodes/mask-pii.js), [`code-nodes/unmask-pii.js`](../code-nodes/unmask-pii.js)
- **Entscheidung:** [ADR 0004](../docs/adr/0004-pii-masking.md)

## Automatische Tests (ohne n8n)

```bash
node tests/pii.test.js
```

17 von 17 bestanden. Geprüft werden:

- 7 Schreibweisen für Telefonnummern (mit und ohne Leerzeichen, `+41`, `0041`, Punkte, Festnetz)
- IBAN mit und ohne Leerzeichen
- Policennummer und Datum bleiben unverändert
- eine zu kurze Nummer bleibt unverändert
- zwei verschiedene Nummern
- dieselbe Nummer in einer späteren Nachricht
- Demaskieren von Antwort und Slots
- ein unbekannter Platzhalter bleibt stehen

## Handtests im Chat

Jede Zeile in einer neuen Session. Geprüft wurden die Prompts an das LLM in der n8n-Datenbank.

| # | Fall | Erwartung | Ergebnis |
|---|---|---|---|
| P1 | Alle Angaben in einer Nachricht, Rückruf `079 123 45 67`, dann «ja» | LLM sieht `[TEL_1]`, Kunde und Übergabe sehen die Nummer | ✅ kein Klartext in 2 Prompts, Mapping 1 Zeile, Übergabe mit Nummer |
| P2 | Nummer `+41 79 123 45 67` erst in Nachricht 4 von 8 | Mapping entsteht dort und hält bis zum Abschluss | ✅ kein Klartext in 8 Prompts, Übergabe mit Nummer |
| P3 | «Kann ich Ihnen meine IBAN geben? CH93 0076 2011 6238 5295 7» | LLM sieht `[IBAN_1]` | ✅ Bot: «benötigen wir keine Bankverbindung», keine Aussage zur Zahlung |

## Findings

| Finding | Massnahme |
|---|---|
| Die Originale stehen weiterhin in den n8n-Executions (Eingabe, Mapping, Ausgabe von Unmask PII). | Grenze dokumentiert (ADR 0004). Produktiv: Speicherung von Execution-Daten einschränken |
| P2: Status `abgeschlossen`, obwohl die Policennummer fehlt. Der Bot hat selbst entschieden, dass sie «später nachgereicht» werden kann. | Umgesetzt: Validate Status prüft die Pflichtangaben vor `abgeschlossen`, sonst Übergabe (`node tests/validate-status.test.js`) |
| P1, P2: `schadendatum` einmal `2026-11-03`, einmal «3. November 2026», einmal «heute». | Datumsformat in Prompt v2 vorgeben |
| P1, P2: «Wir melden uns unter der angegebenen Rufnummer» | bekannt, feste Abschlussformulierung in Prompt v2 |
