# ADR 0003: Übergabe an das Contact Center per Webhook

- **Status:** Akzeptiert
- **Datum:** 2026-11-05
- **Umgebung:** n8n 2.36.9 (self-hosted), HTTP Request v4.5, Webhook v2.1, Data Table v1.1

## Kontext

Endet ein Gespräch mit `abgeschlossen` oder `uebergabe`, muss die Meldung bei Menschen ankommen: eine
vollständige Schadenmeldung beim Schadenteam, eine Übergabe mit Grund im Contact Center. Bis hier hat der Bot
die Übergabe nur angekündigt. Gebraucht wird eine Schnittstelle, die vom empfangenden System unabhängig ist.

## Entscheidung

1. Der Bot Core schickt bei beiden Status ein **HTTP-POST mit JSON** an einen Webhook. Beide Fälle nutzen
   denselben Empfänger und werden über das Feld `typ` unterschieden:

   ```json
   {
     "typ": "uebergabe",
     "sessionId": "…",
     "grund": "Kunde wünscht Menschen",
     "slots": { "policennummer": "HR-123456", "…": "" },
     "zeitpunkt": "2026-11-05T10:16:26.000+01:00",
     "kanal": "chat"
   }
   ```

2. Den Empfänger simuliert ein eigener Workflow **Handover**. Er speichert jede Übergabe als Zeile in einer
   n8n Data Table `handovers` und antwortet mit `{ "ok": true, "id": … }`.
3. Der Webhook ist mit **Header Auth** gesichert (`X-Handover-Token`). Webhook und HTTP Request nutzen
   dieselbe n8n-Credential, das Secret steht in keiner Datei.
4. Der Aufruf wird bei einem Fehler **einmal wiederholt**. Scheitert er trotzdem, läuft der Workflow weiter.
5. Ein Set-Node danach gibt wieder genau die Felder des Bot Core aus und ergänzt `uebergabe_gesendet`.
   Ist die Übergabe gescheitert, ersetzt er die Antwort an den Kunden durch einen ehrlichen Hinweis:
   «Entschuldigung, Ihre Meldung konnte gerade nicht übermittelt werden. Bitte versuchen Sie es in ein paar
   Minuten noch einmal.»

## Begründung

- **Ein Vertrag statt einer Anbindung.** Der Bot kennt nur URL und JSON-Format. Ob dahinter ein Ticketsystem,
  ein CRM oder eine Mail steht, lässt sich austauschen, ohne den Bot Core anzufassen.
- **Ohne Absicherung kann jeder Übergaben einspielen,** der die URL kennt. Header Auth ist die einfachste
  Absicherung, die n8n auf beiden Seiten direkt unterstützt. Getestet: ohne Header `403 Forbidden`, der
  Workflow startet gar nicht.
- **Der Kunde darf kein falsches Versprechen bekommen.** Beim ersten Test war der Workflow Handover nicht
  publiziert. Der Webhook antwortete mit 404, der Kunde las trotzdem «Ich leite Ihr Anliegen weiter», und
  niemand bemerkte den Fehler. Ohne Queue bedeutet ein gescheiterter Aufruf, dass die Meldung verloren ist.
  Darum muss der Kunde es erfahren.
- **Die Ausgabe des Bot Core bleibt stabil.** Ein HTTP Request gibt nur die Antwort des Servers weiter. Der
  Set-Node baut die Ausgabe Feld für Feld neu auf, statt alles durchzureichen. So kommen immer dieselben
  Felder heraus, egal welcher Weg im Workflow genommen wurde.

## Verworfene Alternativen

- **Fehler schlucken, Kunde merkt nichts:** im Produktivbetrieb üblich, aber nur mit einer Queue, die den
  Aufruf später wiederholt. Ohne Queue wäre die Ankündigung «ich leite weiter» falsch.
- **Fehler an Chat Error Reply weitergeben:** der Kunde bekäme «Dienst nicht erreichbar», obwohl der Bot
  funktioniert hat. Die Meldung wäre zu allgemein.
- **Speichern direkt im Bot Core, ohne Webhook:** einfacher, vermischt aber Bot und Empfänger. Ein späterer
  Wechsel auf ein echtes System würde den Bot Core ändern.
- **Eigene Datenbank (Postgres) statt Data Table:** robuster, für den Prototyp aber zusätzlicher Aufwand.
  Die Data Table ist in n8n eingebaut und als Tabelle direkt vorzeigbar.

## Konsequenzen

- Der Workflow Handover muss **publiziert** sein. Nur dann gibt es die Produktiv-URL `/webhook/handover`.
- Der Bot Core ruft den Webhook **innerhalb des Containers** auf: `http://localhost:5678/webhook/handover`.
  Port 5679 gilt nur von aussen.
- Eine gescheiterte Übergabe ist **verloren**. Der Kunde wird informiert, `uebergabe_gesendet: false` steht
  in der Execution, ein Alarm fehlt. Für den Produktivbetrieb braucht es eine Queue mit Wiederholung und eine
  Überwachung.
- Das Memory enthält weiterhin die ursprüngliche Antwort des Modells. Schreibt der Kunde nach einem Fehler
  erneut, übergibt das Modell in der Regel noch einmal. Doppelte Übergaben sind möglich und müssten vom
  Empfänger über `sessionId` erkannt werden.
- `kanal` ist vorerst fest `chat`, weil der Bot Core den Kanal nicht kennt. Kommt ein zweiter Kanal dazu, wird
  er als Input an den Bot Core übergeben.
- In der Evaluation wird `uebergabe_gesendet` mitgezählt.
