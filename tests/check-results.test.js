// Tests für den Code-Node Check Results, ohne n8n und ohne Pakete.
// Ausführen: node tests/check-results.test.js

const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'code-nodes');
const source = fs.readFileSync(path.join(dir, 'check-results.js'), 'utf8');
const cases = new Function(fs.readFileSync(path.join(dir, 'eval-cases.js'), 'utf8'))().map(item => item.json);

// Simuliert $('Prepare Run') und $input aus n8n: ein Lauf pro Testfall, Ergebnisse in anderer Reihenfolge.
const runs = cases.map(testfall => ({ json: { sessionId: `eval-v1-${testfall.fall}-1`, testfall } }));
function runCheck(results) {
  const $ = () => ({ all: () => runs });
  const $input = { all: () => results.map(json => ({ json })) };
  return new Function('$', '$input', source)($, $input).map(item => item.json);
}

let passed = 0;
let total = 0;
function check(name, actual, expected) {
  total++;
  const ok = actual === expected;
  if (ok) passed++;
  console.log(ok ? '✅' : '❌', name, '→', actual);
}

const n1Slots = {
  policennummer: 'HR-482913', schadendatum: '4. November 2026', objekt: 'Fenster',
  ursache: 'Fussball', fotos_vorhanden: 'ja', rueckruf_telefon: '0795554127',
};

const [g2, n1, u1, n2] = runCheck([
  { fall: 'G2', sessionId: 'eval-v1-G2-1', status: 'uebergabe', slots: {}, runden: 1, uebergabe_gesendet: true },
  { fall: 'N1', sessionId: 'eval-v1-N1-1', status: 'abgeschlossen', slots: n1Slots, runden: 8, uebergabe_gesendet: true },
  { fall: 'Ü1', sessionId: 'eval-v1-Ü1-1', status: 'sammeln', slots: {}, runden: 10, uebergabe_gesendet: false },
  { fall: 'N2', sessionId: 'eval-v1-N2-1', status: 'abgeschlossen', runden: 3, uebergabe_gesendet: false,
    slots: { policennummer: 'hr-731406', schadendatum: '2026-11-02', objekt: 'Spiegel',
      fotos_vorhanden: 'nein', rueckruf_telefon: '078 555 90 12' } },
]);

// N1 wie im echten Lauf: Datum im falschen Format, Telefon ohne Leerzeichen gilt als gleich
check('N1 Status', n1.status_ok, true);
check('N1 falsches Datum', JSON.stringify(n1.slots_falsch), '["schadendatum"]');
check('N1 slots_ok', n1.slots_ok, false);
check('N1 Übergabe angekommen', n1.uebergabe_ok, true);
check('N1 Runden', n1.runden, 8);

// N2: alles richtig (Gross/Klein egal), aber Übergabe nicht angekommen
check('N2 Slots', n2.slots_ok, true);
check('N2 Übergabe fehlt', n2.uebergabe_ok, false);

// Ü1: nach 10 Runden ohne Abschluss abgebrochen
check('Ü1 Status falsch', u1.status_ok, false);
check('Ü1 nicht beendet', u1.beendet, false);
check('Ü1 keine Slots erwartet', u1.slots_ok, true);

// G2: jeder Endstatus erlaubt
check('G2 Status egal', g2.status_ok, true);
check('Zuordnung über sessionId', g2.fall, 'G2');

console.log(`\n${passed}/${total} bestanden`);
process.exitCode = passed === total ? 0 : 1;
