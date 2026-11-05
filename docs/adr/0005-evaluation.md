# ADR 0005: Evaluation mit Kunden-Simulator, Prüfung in Code und LLM-as-a-Judge

- **Status:** angenommen
- **Datum:** 2026-11-05

## Kontext

Bisher wurde der Bot nur von Hand im Chat getestet. Das ist langsam, nicht wiederholbar und hängt davon ab, was man
gerade tippt. Für jede Änderung (zum Beispiel einen neuen System-Prompt) braucht es einen Test, der dieselben Fälle
gleich prüft und eine vergleichbare Tabelle liefert.

## Entscheidung

Zwei Workflows in n8n:

- **Evaluation** lädt die Testfälle, ruft pro Fall **Run Case** auf, prüft das Ergebnis und speichert eine Zeile pro
  Fall in der Data Table `eval_runs`.
- **Run Case** spielt einen Dialog durch: Ein **Kunden-Simulator** (LLM mit Fakten und Verhalten aus dem Testfall)
  schreibt die nächste Kundennachricht, der unveränderte **Bot Core** antwortet. Das wiederholt sich, bis der Bot
  `abgeschlossen` oder `uebergabe` meldet oder 10 Runden erreicht sind. Jede Runde steht in der Data Table `eval_turns`.

Bewertet wird in zwei Stufen:

1. **Prüfung in Code** (`Check Results`) für alles, was sich exakt prüfen lässt: Endstatus, erwartete Slots,
   angekommene Übergabe, Anzahl Runden.
2. **Judge** (LLM) nur für das, was Code nicht kann: keine Aussage zur Deckung, keine Zusagen, Treue zu den Fakten,
   eine Frage pro Nachricht, Rolle und Ton. Pro Kriterium zuerst Begründung mit Zitat, dann `ja` oder `nein`. Der Judge
   sieht weder das erwartete Ergebnis noch die Prüfung in Code.

Modelle: Bot und Simulator `claude-haiku-5-5`, Judge `claude-sonnet-5`, also ein anderes und stärkeres Modell als der
Bot. Der Output Parser des Judge hat Auto-Fix Format eingeschaltet.

## Begründung

- **Simulator statt fester Nachrichten:** Feste Kundennachrichten passen nicht mehr, sobald der Bot in anderer
  Reihenfolge fragt. Der Simulator reagiert wie ein Kunde und bleibt dabei bei festen Fakten.
- **Zustand in einer Data Table:** LLM-Nodes und Sub-Workflows geben in n8n nur ihr eigenes Ergebnis weiter. In einer
  Schleife ginge der bisherige Dialog verloren. Die Tabelle hält ihn und liefert ihn danach auch dem Judge.
- **Code vor Judge:** Code ist exakt, kostet nichts und streut nicht. Ein LLM-Urteil braucht man nur, wo Text
  verstanden werden muss.
- **Bot Core unverändert:** Der Bot weiss nicht, dass er getestet wird. Getestet wird genau das, was im Chat läuft.
- **Sonnet 5 statt Sonnet 5.5:** Der Anthropic-Node von n8n schickt bei ausgeschaltetem Thinking
  `{"type": "disabled"}`. Sonnet 5.5 lehnt das ab. Sonnet 5 akzeptiert es, ist stärker als Haiku und ein anderes
  Modell als der Bot.

## Verworfene Alternativen

- **Eingebaute Evaluations-Funktion von n8n:** für einzelne Frage-Antwort-Paare gedacht, nicht für ganze Dialoge
  mit mehreren Runden.
- **Haiku als Judge:** gleiches Modell wie der Bot, übersieht eher die eigenen Muster.
- **Jev (TypeSafe AI) als Judge:** sehr günstig und schnell, liefert aber keine Begründung. Bei 6 Fällen zählt die
  Begründung mehr als der Preis. Als zweiter Judge zum Vergleich vorgesehen.
- **Judge prüft auch Status und Slots:** unnötig unsicher, das kann Code exakt.

## Konsequenzen

- Ein Lauf kostet wenige Rappen und dauert rund 80 Sekunden. Er lässt sich nach jeder Änderung wiederholen
  (`lauf` in Run Settings).
- Eval-Läufe erzeugen echte Zeilen in `handovers` und `pii_mappings`, erkennbar an Session-IDs mit `eval-`.
- **Der Simulator ist selbst ein LLM und kann vom Fall abweichen** (Lauf v1, G1: Deckungsfrage nicht gestellt).
  Kritische Nachrichten sollten fest vorgegeben werden.
- **Der Judge kann irren** (Lauf v1, Ü1). Seine Urteile müssen kalibriert werden, bevor man Lauf v2 mit Lauf v1
  vergleicht.
- Ein Lauf pro Fall ist eine Stichprobe. Für belastbare Quoten braucht es mehrere Läufe oder mehr Fälle.
- Die n8n-Datenbank (SQLite) darf nicht von aussen gelesen werden, solange der Container läuft. Das hat einmal
  einen I/O-Fehler ausgelöst. Auswertungen laufen auf einer Kopie.
