// Tests für den Code-Node Build Simulator Prompt, ohne n8n und ohne Pakete.
// Ausführen: node tests/build-simulator-prompt.test.js

const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'code-nodes');
const source = fs.readFileSync(path.join(dir, 'build-simulator-prompt.js'), 'utf8');
const cases = new Function(fs.readFileSync(path.join(dir, 'eval-cases.js'), 'utf8'))();

// Simuliert $('Run Case Input') und $('Load Turns') aus n8n mit festen Daten.
function runBuild(turnRows) {
  const nodes = {
    'Run Case Input': [{ json: { sessionId: 'eval-v1-N1-1', testfall: cases[0].json } }],
    'Load Turns': turnRows.map(json => ({ json })),
  };
  const $ = name => ({ first: () => nodes[name][0], all: () => nodes[name] });
  return new Function('$', source)($)[0].json;
}

let passed = 0;
let total = 0;
function check(name, actual, expected) {
  total++;
  const ok = actual === expected;
  if (ok) passed++;
  console.log(ok ? '✅' : '❌', name, '→', actual);
}

// Neue Session: Load Turns liefert ein leeres Item
const start = runBuild([{}]);
check('neue Session → Runde 1', start.runde, 1);
check('neue Session → Gesprächsbeginn', start.prompt.includes('Du beginnst das Gespräch'), true);
check('Verhalten aus dem Testfall', start.prompt.includes(cases[0].json.kunde), true);
check('Fakten aus dem Testfall', start.prompt.includes('- policennummer: HR-482913'), true);
check('erwartet bleibt geheim', start.prompt.includes('2026-11-04'), false);
check('sessionId weitergegeben', start.sessionId, 'eval-v1-N1-1');

// Zwei Runden, in falscher Reihenfolge geladen
const later = runBuild([
  { session_id: 'eval-v1-N1-1', runde: '2', kunde: 'HR-482913', bot: 'Wann ist es passiert?' },
  { session_id: 'eval-v1-N1-1', runde: '1', kunde: 'Mein Fenster ist kaputt', bot: 'Wie lautet Ihre Policennummer?' },
]);
check('zwei Runden → Runde 3', later.runde, 3);
check('Dialog sortiert', later.prompt.indexOf('Mein Fenster') < later.prompt.indexOf('Kunde: HR-482913'), true);
check('kein Hinweis auf Gesprächsbeginn', later.prompt.includes('Du beginnst das Gespräch'), false);

// Testfälle
check('6 Testfälle', cases.length, 6);
check('Fallnummern eindeutig', new Set(cases.map(c => c.json.fall)).size, 6);

console.log(`\n${passed}/${total} bestanden`);
process.exitCode = passed === total ? 0 : 1;
