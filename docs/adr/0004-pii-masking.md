# ADR 0004: Telefonnummer und IBAN vor dem LLM maskieren

- **Status:** Akzeptiert
- **Datum:** 2026-11-05
- **Umgebung:** n8n 2.36.9 (self-hosted), Code-Node v2, Data Table v1.1

## Kontext

Jede Kundennachricht geht an die API eines externen LLM-Anbieters und landet im Gesprächsverlauf (Memory).
Kunden nennen dabei Personendaten, vor allem die Rückrufnummer, manchmal ungefragt eine IBAN. Das Modell
braucht diese Werte nicht. Es muss nur wissen, dass eine Angabe vorliegt. Das Schadenteam dagegen braucht die
echten Werte in der Übergabe.

## Entscheidung

1. Der Code-Node **Mask PII** ersetzt vor dem Claims Assistant Schweizer Telefonnummern und IBAN durch
   nummerierte Platzhalter wie `[TEL_1]` und `[IBAN_1]`. Erkannt wird per Regex, nur mit eingebautem
   JavaScript.
2. Das Mapping (Platzhalter → Original) wird **pro `sessionId`** in der Data Table `pii_mappings`
   gespeichert und mit jeder Nachricht weitergeführt. Derselbe Wert bekommt immer denselben Platzhalter.
3. Der Code-Node **Unmask PII** setzt die Originale in `antwort` und in den Slots wieder ein, bevor die
   Antwort an den Kunden und die Slots an die Übergabe gehen. Unbekannte Platzhalter bleiben stehen.
4. Nur zwei Nodes greifen auf den Speicher zu: **Load PII Map** und **Save PII Map**.

```
Bot Core Input → Load PII Map → Mask PII → Save PII Map → Claims Assistant → … → Unmask PII → Continue or Close
```

## Begründung

- **Was das Modell nicht braucht, bekommt es nicht.** Datensparsamkeit gegenüber dem Anbieter, und auch der
  Gesprächsverlauf enthält nur Platzhalter.
- **Das Mapping muss ausserhalb gespeichert werden.** Jede Nachricht ist eine eigene Execution, ein Code-Node
  vergisst nach jedem Lauf alles. Die Nummer kommt vielleicht in Nachricht 4, die Übergabe erst in Nachricht 8.
- **Auch die Antwort an den Kunden wird demaskiert,** nicht nur die Übergabe. Sonst liest der Kunde in der
  Zusammenfassung «Rückruf: [TEL_1]».
- **Save PII Map steht in der Reihe, nicht als Seitenast.** Der letzte ausgeführte Node bestimmt, was Call
  Bot Core zurückbekommt. Ein Seitenast könnte als letzter laufen.
- **Der Speicher bleibt austauschbar.** Weil nur zwei Nodes ihn kennen, ist ein Wechsel auf Postgres eine
  lokale Änderung.

## Verworfene Alternativen

- **Mapping im Workflow Static Data:** kein eigener Speicher nötig, wird aber nur bei produktiven Executions
  gespeichert, nicht bei Tests im Editor. Schwer nachvollziehbar.
- **Mapping nur im Memory oder im Prompt:** dann hätte das LLM die Originale doch wieder.
- **NER-Tool wie Microsoft Presidio:** erkennt auch Namen und Adressen. Für den Prototyp zu viel
  Infrastruktur, für den Produktivbetrieb die richtige Richtung.
- **Postgres statt Data Table:** robuster und mit Verschlüsselung möglich, für den Prototyp zusätzlicher
  Aufwand. Roadmap-Punkt für einen Pilot.

## Konsequenzen

- Erkannt werden nur Schweizer Telefonnummern (`+41`, `0041`, `0`, mit oder ohne Trennzeichen) und
  Schweizer IBAN. **Namen, Adressen, E-Mail und AHV-Nummer gehen weiterhin im Klartext an das LLM.**
- `+41 79 …` und `079 …` gelten als verschiedene Werte und bekommen verschiedene Platzhalter.
- Das Mapping liegt **im Klartext** in der Data Table. Produktiv gehört es verschlüsselt in einen eigenen
  Dienst (Token-Vault) und wird nach einer festen Frist gelöscht.
- Die **n8n-Executions enthalten die Originale** weiterhin (Eingabe, Mapping, Ausgabe von Unmask PII). Die
  Maskierung schützt vor dem LLM-Anbieter und dem Gesprächsverlauf, nicht vor den eigenen Logs. Produktiv:
  Speicherung von Execution-Daten einschränken und automatisch löschen.
- Die Regex sind mit 17 Tests ohne n8n abgesichert: `node tests/pii.test.js`.
