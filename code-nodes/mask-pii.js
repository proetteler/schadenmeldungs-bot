// n8n Code-Node «Mask PII» im Workflow Bot Core (Mode: Run Once for All Items).
// Ersetzt Telefonnummern und IBAN durch Platzhalter wie [TEL_1], bevor der Text an das LLM geht.
// Das Mapping (Platzhalter → Original) gilt pro sessionId und wird über alle Nachrichten weitergeführt.
// Siehe docs/adr/0004-pii-masking.md

// IBAN Schweiz: «CH», zwei Prüfziffern, dann 17 Ziffern oder Buchstaben, jedes mit optionalem Leerzeichen davor.
const IBAN = /\bCH\d{2}(?:\s?[0-9A-Z]){17}\b/gi;
// Telefon Schweiz: +41, 0041 oder 0, dann zwei Ziffern Vorwahl (nicht mit 0 beginnend) und 7 weitere Ziffern,
// jede mit optionalem Leerzeichen, Punkt oder Bindestrich davor. Direkt davor und danach darf keine Ziffer stehen.
const TEL = /(?<!\d)(?:\+41|0041|0)[\s.-]?[1-9]\d(?:[\s.-]?\d){7}(?!\d)/g;

const input = $('Bot Core Input').first().json;
const stored = $('Load PII Map').first().json.mapping;
const mapping = stored ? JSON.parse(stored) : {};

// Vergleichswert ohne Leerzeichen, Punkte und Bindestriche: «079 123 45 67» und «0791234567» sind dieselbe Nummer.
const normalize = value => value.replace(/[\s.-]/g, '').toUpperCase();

function replaceMatches(text, regex, type) {
  return text.replace(regex, match => {
    // Schon bekannter Wert bekommt denselben Platzhalter wie in einer früheren Nachricht.
    const known = Object.keys(mapping).find(p => normalize(mapping[p]) === normalize(match));
    if (known) return known;

    const count = Object.keys(mapping).filter(p => p.startsWith(`[${type}_`)).length;
    const placeholder = `[${type}_${count + 1}]`;
    mapping[placeholder] = match;
    return placeholder;
  });
}

// IBAN zuerst, damit ihre Ziffern nicht als Telefonnummer erkannt werden.
let text = input.chatInput ?? '';
text = replaceMatches(text, IBAN, 'IBAN');
text = replaceMatches(text, TEL, 'TEL');

return [{
  json: {
    sessionId: input.sessionId,
    chatInput: text,
    mapping: JSON.stringify(mapping),
  },
}];
