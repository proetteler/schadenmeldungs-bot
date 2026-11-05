// Tests für den Code-Node Validate Status, ohne n8n und ohne Pakete.
// Ausführen: node tests/validate-status.test.js

const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'code-nodes', 'validate-status.js'), 'utf8');

// Simuliert $('Bot Core Input') und $input aus n8n mit festen Daten.
function runValidate(output) {
  const $ = () => ({ first: () => ({ json: { sessionId: 's1' } }) });
  const $input = { all: () => [{ json: { output } }] };
  return new Function('$', '$input', source)($, $input)[0].json;
}

let passed = 0;
let total = 0;
function check(name, actual, expected) {
  total++;
  const ok = actual === expected;
  if (ok) passed++;
  console.log(ok ? '✅' : '❌', name, '→', actual);
}

const complete = {
  policennummer: 'HR-123456', schadendatum: '2026-11-03', objekt: 'Fenster',
  ursache: 'Ball', fotos_vorhanden: 'ja', rueckruf_telefon: '[TEL_1]',
};

// Vollständig: abgeschlossen bleibt, Antwort des LLM bleibt
const ok = runValidate({ antwort: 'Danke, abgeschlossen.', status: 'abgeschlossen', slots: complete, uebergabe_grund: '' });
check('alle Slots gefüllt → status', ok.status, 'abgeschlossen');
check('alle Slots gefüllt → antwort', ok.antwort, 'Danke, abgeschlossen.');

// Policennummer fehlt (Finding P2)
const noPolicy = runValidate({ antwort: 'Danke, abgeschlossen.', status: 'abgeschlossen',
  slots: { ...complete, policennummer: '' }, uebergabe_grund: '' });
check('Policennummer fehlt → status', noPolicy.status, 'uebergabe');
check('Policennummer fehlt → grund', noPolicy.uebergabe_grund, 'Pflichtangaben fehlen: policennummer');
check('Policennummer fehlt → antwort', noPolicy.antwort,
  'Vielen Dank. Für die Meldung fehlt noch: Policennummer. Eine Mitarbeiterin oder ein Mitarbeiter übernimmt Ihr Anliegen.');

// Mehrere fehlen, nur Leerzeichen zählt als leer, Slot fehlt ganz
const several = runValidate({ antwort: 'x', status: 'abgeschlossen',
  slots: { ...complete, ursache: '   ', rueckruf_telefon: undefined }, uebergabe_grund: '' });
check('mehrere fehlen → grund', several.uebergabe_grund, 'Pflichtangaben fehlen: ursache, rueckruf_telefon');

// Andere Status werden nicht auf Vollständigkeit geprüft
check('sammeln mit leeren Slots bleibt', runValidate({ antwort: 'Frage', status: 'sammeln', slots: {} }).status, 'sammeln');

// Ungültiger Status wie bisher
const invalid = runValidate({ antwort: 'x', status: 'fertig', slots: complete });
check('ungültiger Status → status', invalid.status, 'uebergabe');
check('ungültiger Status → grund', invalid.uebergabe_grund, 'Ungültiger Status vom Modell: fertig');

// Fehlende Ausgabe des LLM
check('leere Ausgabe → uebergabe', runValidate(undefined).status, 'uebergabe');
check('feste Ausgabefelder', JSON.stringify(Object.keys(ok)),
  '["sessionId","antwort","status","slots","uebergabe_grund"]');

console.log(`\n${passed}/${total} bestanden`);
process.exitCode = passed === total ? 0 : 1;
