# Handtests Prompt v1

- **Datum:** 2026-11-04
- **Prompt:** [`prompts/system-v1.md`](../prompts/system-v1.md)
- **Modell:** `claude-haiku-5-5`, Temperature 0.2, max. 1024 Ausgabe-Tokens
- **Kanal:** n8n Chat (Workflow Chat → Bot Core), jede Zeile eine neue Session

## Dialogtests

| # | Fall | Eingabe (Auszug) | Erwartung | Ergebnis | Auffälligkeiten |
|---|---|---|---|---|---|
| 1 | Normalfall, Schritt für Schritt | «Hallo, bei mir ist ein Fenster kaputt» → Policennummer → «gestern» → Ursache → Fotos → Telefon → «ja passt» | Slots nacheinander, Zusammenfassung, `abgeschlossen` | ✅ `sammeln` → `bestaetigen` → `abgeschlossen`, eine Frage pro Nachricht, nichts doppelt gefragt | `schadendatum: "gestern"` statt Datum · Zusage «Ein Mitarbeiter wird sich bei Ihnen melden» (nicht freigegeben) · ungefragter Hinweis zur Deckung · «Haben Sie noch eine Frage?» nach Abschluss |
| 2 | Alles in einer Nachricht | Policennummer, Datum, «Sturm hat mein Küchenfenster zerbrochen», Fotos, Telefon in einem Satz | alle Slots erkannt; Sturm mit offenem Fenster ist ein Notfall → `uebergabe` | 🟡 alle 6 Slots erkannt, direkt `bestaetigen` | ❗ Notfall nicht erkannt, keine Frage nach Sicherung der Öffnung · Datum «2. November» ohne Jahr |
| 3 | Deckungsfrage | «Hallo, mein Spiegel ist kaputt. Ist das gedeckt?» | keine Aussage zur Deckung, Rückführung zur Meldung | ✅ «kann ich Ihnen leider nicht beurteilen», fragt nach Policennummer | nur die direkte Frage getestet, kein Nachbohren |
| 4 | Kunde verlangt Menschen | «Ich will mit einem Menschen sprechen» | `uebergabe` mit Grund | ✅ `uebergabe`, Grund «Kunde wünscht Menschen» | «Bitte haben Sie einen Moment Geduld» deutet eine Live-Übergabe an, die es nicht gibt · 1 von 2 Versuchen mit Parser-Fehler (Fallback, siehe F2) |
| 5 | Schweizerdeutsch | «Grüezi, bi mir isch s Glaskeramikfäld vom Herd verheit, mir isch e Pfanne druf abegheit.» | verstanden, Objekt und Ursache erkannt | 🟡 verstanden, `objekt: Glaskeramik-Kochfeld`, Antwort in Hochdeutsch | ❗ `ursache`: «… nachdem es heiss war», das Detail hat der Kunde nicht genannt |

✅ erfüllt · 🟡 teilweise erfüllt · ❗ Verstoss gegen eine Regel des Prompts

## Fehlerpfade

| # | Auslöser | Erwarteter Weg | Ergebnis |
|---|---|---|---|
| F1 | Ausgabelimit testweise auf 5 Tokens, JSON bricht ab | Claims Assistant → Fallback Handover → Übergabe | ✅ |
| F2 | zufälliger Parser-Fehler: `output` als String statt Objekt | Fallback Handover, fester Text im Chat | ✅ |
| F3 | zufälliger Parser-Fehler | Fallback Handover mit überarbeitetem Text | ✅ |
| F4 | Code-Node Validate Status wirft testweise einen Fehler | Bot Core bricht ab → Call Bot Core → Chat Error Reply | ✅ |

F2 und F3 traten ohne Absicht auf: 2 Parser-Fehler in rund einem Dutzend Nachrichten.

## Findings für Prompt v2

| Finding | Regel | Massnahme |
|---|---|---|
| Relatives Datum («gestern») und Datum ohne Jahr | Pflichtangabe korrekt erfassen | heutiges Datum in den Prompt geben, Format `JJJJ-MM-TT` verlangen, im Code «nicht in der Zukunft» prüfen |
| Nicht freigegebene Zusagen («Ein Mitarbeiter wird sich melden», «Moment Geduld») | nichts erfinden | feste Formulierungen für Abschluss und Übergabe vorgeben |
| Notfall bei Sturmschaden nicht erkannt | Übergabe bei Notfall | Notfall konkret beschreiben (offene Scheibe, eindringender Regen, Verletzungsgefahr) |
| Erfundenes Detail im Slot `ursache` | nichts erfinden | Slots nur mit Angaben des Kunden füllen; Prüfkriterium: jeder Slot im Kundentext belegbar |
| Zufällige Parser-Fehler | gültiges JSON | Fehlerquote in der Evaluation messen, Vergleich mit einem stärkeren Modell |

Diese Fälle gehen als Testfälle in die automatische Evaluation.
