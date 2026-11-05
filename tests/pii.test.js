// Tests für die Code-Nodes Mask PII und Unmask PII, ohne n8n und ohne Pakete.
// Ausführen: node tests/pii.test.js

const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'code-nodes');
const maskSource = fs.readFileSync(path.join(dir, 'mask-pii.js'), 'utf8');
const unmaskSource = fs.readFileSync(path.join(dir, 'unmask-pii.js'), 'utf8');

// Simuliert $('Node-Name') aus n8n mit festen Daten.
function runMask(chatInput, storedMapping) {
  const nodes = {
    'Bot Core Input': { sessionId: 's1', chatInput },
    'Load PII Map': storedMapping ? { mapping: storedMapping } : {},
  };
  const $ = name => ({ first: () => ({ json: nodes[name] }) });
  return new Function('$', maskSource)($)[0].json;
}

function runUnmask(maskOutput, items) {
  const $ = () => ({ first: () => ({ json: maskOutput }) });
  const $input = { all: () => items };
  return new Function('$', '$input', unmaskSource)($, $input)[0].json;
}

let passed = 0;
let total = 0;
function check(name, actual, expected) {
  total++;
  const ok = actual === expected;
  if (ok) passed++;
  console.log(ok ? '✅' : '❌', name, '→', actual);
}

// Telefon: Schreibweisen
const phoneFormats = ['079 123 45 67', '0791234567', '+41 79 123 45 67', '+41791234567',
  '0041 79 123 45 67', '079.123.45.67', '044 123 45 67'];
for (const number of phoneFormats) {
  check(number, runMask(`Rückruf unter ${number}`).chatInput, 'Rückruf unter [TEL_1]');
}

// IBAN und Dinge, die nicht maskiert werden dürfen
check('IBAN mit Leerzeichen', runMask('IBAN CH93 0076 2011 6238 5295 7 bitte').chatInput, 'IBAN [IBAN_1] bitte');
check('IBAN ohne Leerzeichen', runMask('CH9300762011623852957').chatInput, '[IBAN_1]');
check('Policennummer und Datum bleiben', runMask('Police HR-123456 am 03.11.2026, 2026-11-03').chatInput,
  'Police HR-123456 am 03.11.2026, 2026-11-03');
check('zu kurze Nummer bleibt', runMask('Fall 079 123 45').chatInput, 'Fall 079 123 45');
check('zwei Nummern', runMask('079 123 45 67 oder 078 765 43 21').chatInput, '[TEL_1] oder [TEL_2]');

// Session über zwei Nachrichten
const first = runMask('Nummer 079 123 45 67');
const second = runMask('nochmal 0791234567, und 078 765 43 21', first.mapping);
check('gleiche Nummer später', second.chatInput, 'nochmal [TEL_1], und [TEL_2]');
check('Mapping weitergeführt', second.mapping, '{"[TEL_1]":"079 123 45 67","[TEL_2]":"078 765 43 21"}');

// Unmask
const result = runUnmask(second, [{ json: {
  sessionId: 's1',
  antwort: 'Rückruf: [TEL_1], IBAN [IBAN_9]',
  status: 'bestaetigen',
  slots: { rueckruf_telefon: '[TEL_2]', objekt: 'Fenster', fotos_vorhanden: '' },
  uebergabe_grund: '',
} }]);
check('Unmask antwort, unbekannter Platzhalter bleibt', result.antwort, 'Rückruf: 079 123 45 67, IBAN [IBAN_9]');
check('Unmask slot', result.slots.rueckruf_telefon, '078 765 43 21');
check('feste Ausgabefelder', JSON.stringify(Object.keys(result)),
  '["sessionId","antwort","status","slots","uebergabe_grund"]');

console.log(`\n${passed}/${total} bestanden`);
process.exitCode = passed === total ? 0 : 1;
