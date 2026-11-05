// n8n Code-Node «Unmask PII» im Workflow Bot Core (Mode: Run Once for All Items).
// Setzt in Antwort und Slots die Originalwerte wieder ein, bevor sie an den Kunden und an die Übergabe gehen.
// Siehe docs/adr/0004-pii-masking.md

const mapping = JSON.parse($('Mask PII').first().json.mapping);

// Platzhalter: eckige Klammer, Grossbuchstaben, Unterstrich, Zahl, eckige Klammer, zum Beispiel [TEL_1].
const PLACEHOLDER = /\[[A-Z]+_\d+\]/g;

// Unbekannte Platzhalter (vom Modell erfunden) bleiben stehen, damit der Fehler sichtbar wird.
const unmask = text => typeof text === 'string'
  ? text.replace(PLACEHOLDER, p => mapping[p] ?? p)
  : text;

return $input.all().map(item => {
  const slots = {};
  for (const [name, value] of Object.entries(item.json.slots ?? {})) {
    slots[name] = unmask(value);
  }

  return {
    json: {
      sessionId: item.json.sessionId,
      antwort: unmask(item.json.antwort),
      status: item.json.status,
      slots,
      uebergabe_grund: item.json.uebergabe_grund,
    },
  };
});
