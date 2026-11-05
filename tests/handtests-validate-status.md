# Tests Pflichtangaben-Check

- **Datum:** 2026-11-05
- **Code:** [`code-nodes/validate-status.js`](../code-nodes/validate-status.js)
- **Anlass:** Finding P2 in den [Tests PII-Maskierung](handtests-pii.md): Der Bot schloss ohne Policennummer ab.

## Automatische Tests (ohne n8n)

```bash
node tests/validate-status.test.js
```

11 von 11 bestanden: vollständige Slots, fehlende Policennummer, mehrere fehlende Slots, Slot nur mit Leerzeichen,
Status `sammeln` ohne Prüfung, ungültiger Status, leere Ausgabe des Modells, feste Ausgabefelder.

## Handtests im Chat

Jede Zeile in einer neuen Session. Geprüft wurden die Ausgabe des Modells und die Data Table `handovers`.

| # | Fall | Erwartung | Ergebnis |
|---|---|---|---|
| V1 | Alle Angaben ausser Policennummer, «Habe ich nicht», dann «ja» | Modell sagt `abgeschlossen`, Code macht daraus `uebergabe` mit festem Text | ✅ Das Modell antwortete «Policennummer können Sie später nachreichen. Ein Mitarbeiter wird sich bei Ihnen melden» mit `abgeschlossen`. Der Kunde las stattdessen «Für die Meldung fehlt noch: Policennummer». Übergabe mit Grund `Pflichtangaben fehlen: policennummer` und der echten Telefonnummer |
| V2 | Alle Angaben mit Policennummer, dann «ja» | `abgeschlossen` bleibt | ✅ im vierten Versuch, mit Auto-Fix Format: Die erste Antwort kam wieder als Text, die Korrektur lieferte gültiges JSON. Nach «ja» Übergabe mit typ `abgeschlossen`, allen 6 Slots und der echten Telefonnummer. Vorher: Versuch 1: Das Modell übernahm «gestern» nicht als Datum und fragte nach, bei der Antwort darauf kam ein Parser-Fehler. Versuch 2 (Datum ausgeschrieben): Parser-Fehler schon bei der ersten Nachricht, als das Modell die Zusammenfassung schreiben wollte. Versuch 3 mit Retry On Fail (2 Versuche): beide Versuche mit demselben Fehler |

## Findings

| Finding | Massnahme |
|---|---|
| In 6 Chats mit 22 Nachrichten kamen 5 Parser-Fehler. Das Modell ruft das Format-Werkzeug des Parsers auf, füllt das Feld `output` aber mit einem Text statt einem Objekt, und dieser Text hat am Ende eine Klammer `}` zu viel (`Extra data` beim Parsen). Die erste Vermutung (es ahmt das Memory nach) ist widerlegt: Drei Fehler kamen bei der ersten Nachricht einer Session. 4 der 5 Fehler betrafen längere Antworten mit Zusammenfassung. Retry On Fail half nicht: Bei gleicher Eingabe scheiterten beide Versuche, der Fehler ist also nicht zufällig. | Auto-Fix Format im Output Parser eingeschaltet: Scheitert das Parsen, bekommt ein zweites Modell die kaputte Ausgabe und die Fehlermeldung und korrigiert nur das Format. In V2 hat das funktioniert. Wie oft Auto-Fix nötig ist und ob es immer reicht, wird in der Evaluation gemessen |
| Nach einem Parser-Fehler kommt die Übergabe mit leeren Slots an, obwohl der Kunde schon fast alles angegeben hatte. | Roadmap: Slots pro Session speichern, damit der Fallback sie mitschicken kann |
| Eine Frage zum Auto wurde richtig abgelehnt, ging aber durch einen Parser-Fehler verloren. Das Schadenteam bekam eine Übergabe ohne Inhalt. | wie oben |
| «gestern» wurde einmal als Datum übernommen, einmal nicht. | Datumsformat und Umgang mit relativen Angaben in Prompt v2 |
| «Ich war nicht zuhause» wurde vom Modell als möglicher Einbruch gedeutet und übergeben. | vertretbar, aber konkrete Kriterien in Prompt v2 |
| Das Modell schreibt «außen» statt «aussen» und «eine Glaskeramik-Kochfeld». | Schweizer Rechtschreibung in Prompt v2 vorgeben |
