# ADR 0002: Strukturierte JSON-Ausgabe mit dem Structured Output Parser

- **Status:** Akzeptiert
- **Datum:** 2026-11-04
- **Umgebung:** n8n 2.36.9 (self-hosted), AI Agent v3.1, Structured Output Parser v1.3, Anthropic Chat Model

## Kontext

Der Bot-Kern entscheidet nicht per Freitext, wie es weitergeht. Ein Switch-Node routet nach dem Feld `status`
(`sammeln`, `bestaetigen`, `abgeschlossen`, `uebergabe`), und bei einer Übergabe gehen die Slots als JSON an
einen Webhook. Dafür muss jede Antwort des Modells dieselbe Struktur haben:

```json
{
  "antwort": "Text an den Kunden",
  "status": "sammeln",
  "slots": {
    "policennummer": "",
    "schadendatum": "",
    "objekt": "",
    "ursache": "",
    "fotos_vorhanden": "",
    "rueckruf_telefon": ""
  },
  "uebergabe_grund": ""
}
```

## Entscheidung

1. Die Struktur wird mit dem **Structured Output Parser** am AI Agent erzwungen, Schema-Typ
   *Generate from JSON Example* mit dem Beispiel oben.
2. Das Format wird **nur an dieser einen Stelle** definiert. Der System-Prompt beschreibt die Felder in zwei
   Sätzen, enthält aber kein eigenes JSON-Beispiel.
3. Unbekannte Slots sind ein **leerer Text `""`**, nicht `null`.
4. Die erlaubten Werte von `status` prüft ein Code-Node nach dem Agent, nicht das Schema.
5. Schlägt das Parsen fehl, greift ein Fallback mit fester Antwort und Status `uebergabe`.

## Begründung

Beim Aufbau trat ab der zweiten Nachricht der Fehler *Model output doesn't fit required format* auf.
Die gespeicherten Ausführungen zeigen die Ursache: Die Typen in Prompt und Parser passten nicht zusammen.

| Versuch | Parser erwartet | Modell liefert (gemäss Prompt) | Ergebnis |
|---|---|---|---|
| Beispiel-JSON mit `null` als Slot-Werte | nur `null` | `"HR-123456"` für den erfassten Slot | Fehler |
| Beispiel-JSON mit `""` als Slot-Werte | nur Text | `null` für die leeren Slots | Fehler |
| Beispiel-JSON mit `""`, Prompt ohne eigenes Format | nur Text | `""` für die leeren Slots | läuft |

- **Zwei Formatvorgaben widersprachen sich.** Der System-Prompt enthielt ein JSON-Beispiel mit `null`, der
  Parser leitet die Typen aus seinem eigenen Beispiel ab. Das Modell folgte dem Prompt, der Parser lehnte ab.
  Sobald das Format nur noch im Parser stand, liefen die Antworten durch.
- **n8n ergänzt das Schema selbst.** Der Parser verpackt das Schema in `{ "output": ... }` und gibt es dem
  Modell als Tool `format_final_json_response`. Ein eigenes Formatbeispiel im Prompt ist darum doppelt.
- **Routing gehört nicht ins LLM.** Ob `status` gültig ist, prüft deterministischer Code. Das ist verlässlicher
  als eine Regel, an die sich das Modell halten soll.

## Verworfene Alternativen

- **JSON Schema im Parser (Schema-Typ *Define using JSON Schema*):** würde `["string", "null"]` und `enum`
  erlauben. Nicht gewählt, weil das Beispiel-JSON einfacher zu pflegen ist und die `status`-Prüfung im
  Code-Node ohnehin stattfindet. Eine Option, falls das Schema später strenger werden muss.
- **Kein Parser, JSON nur per Prompt und `JSON.parse` im Code-Node:** volle Kontrolle, aber mehr eigener Code.
  Bleibt Plan B, falls der Parser in der Evaluation zu oft scheitert.
- **Auto-Fix Format im Parser:** repariert Fehler mit einem zweiten Modellaufruf, verdeckt aber die Ursache.
  Beim Aufbau ausgeschaltet, damit Fehler sichtbar bleiben.

## Konsequenzen

- Leere Slots sind `""`. Alle Prüfungen (Switch, Code-Node, Evaluation) behandeln `""` als «nicht erfasst».
- Ändert sich das Format, wird nur das Beispiel im Parser angepasst und der Prompt bei Bedarf nachgezogen.
- Nach einer Format-Änderung muss mit einer neuen `sessionId` getestet werden. Das Memory enthält sonst alte
  Antworten im alten Format, und das Modell orientiert sich daran.
- Ungültiges JSON zählt in der Evaluation als Fehler, auch wenn der Fallback den Dialog rettet.
- Das Ausgabelimit im Chat Model ist bewusst auf **1024 Tokens** gesetzt. Eine Antwort braucht etwa 150 bis
  300 Tokens, das Limit lässt Luft für die Zusammenfassung bei `bestaetigen` und deckelt Kosten und
  Antwortzeit. Wird es erreicht, bricht das JSON ab und der Fallback übernimmt. Getestet mit einem Limit von
  5 Tokens.
