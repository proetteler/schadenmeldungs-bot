# Handtests Übergabe-Webhook

- **Datum:** 2026-11-05
- **Workflows:** Handover (Webhook → Store Handover → Respond OK), Bot Core mit Send Handover und Restore Reply
- **Entscheidung:** [ADR 0003](../docs/adr/0003-handover-webhook.md)

## Webhook direkt (curl, Test-URL)

| # | Aufruf | Erwartung | Ergebnis |
|---|---|---|---|
| W1 | POST ohne Header `X-Handover-Token` | `403 Forbidden`, Workflow startet nicht | ✅ `403`, keine Zeile in der Tabelle |
| W2 | POST mit gültigem Token | `200`, Zeile in `handovers` | ✅ Zeile mit allen Feldern, `slots` als JSON-Text |
| W3 | Bot Core ruft Produktiv-URL auf, Workflow Handover nicht publiziert | Fehler sichtbar | ❗ `404 webhook not registered`, siehe Finding |

## Übergabe aus dem Chat

Jede Zeile in einer neuen Session.

| # | Fall | Handover | Erwartung | Ergebnis |
|---|---|---|---|---|
| U1 | «Ich will mit einem Menschen sprechen» | publiziert | Bot-Antwort im Chat, neue Zeile `typ: uebergabe`, `uebergabe_gesendet: true` | ✅ |
| U2 | «Ich will mit einem Menschen sprechen» | nicht publiziert | Hinweis «Ihre Meldung konnte gerade nicht übermittelt werden…», keine Zeile, `uebergabe_gesendet: false` | ✅ |
| U3 | alle Angaben in einer Nachricht, dann «ja» | publiziert | neue Zeile `typ: abgeschlossen`, `grund` leer, alle Slots gefüllt | ✅ alle 6 Slots, `schadendatum: 2026-11-03` |

✅ erfüllt · ❗ Fehler gefunden

## Findings

| Finding | Massnahme |
|---|---|
| W3: Mit «Continue on Error» lief der Workflow trotz 404 weiter. Der Kunde las «Ich leite Ihr Anliegen weiter», angekommen ist nichts. | Restore Reply ersetzt die Antwort bei einem Fehler und setzt `uebergabe_gesendet`. Für den Produktivbetrieb: Queue und Alarm |
| U1, U3: Der Bot kündigt weiterhin «einen Moment Geduld» und «Ein Mitarbeiter wird sich melden» an. | bekannt aus [Handtests Prompt v1](handtests-prompt-v1.md), feste Formulierungen in Prompt v2 |
| U3: Mit vollständigem Datum im Text speichert das Modell `2026-11-03`, bei «gestern» nicht. | bestätigt das Finding zum relativen Datum für Prompt v2 |
