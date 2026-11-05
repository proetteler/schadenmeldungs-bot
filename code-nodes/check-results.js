// n8n Code-Node «Check Results» im Workflow Evaluation (Mode: Run Once for All Items).
// Vergleicht das Ergebnis jedes Dialogs mit dem erwarteten Ergebnis aus dem Testfall.
// Hier steht nur, was sich exakt prüfen lässt. Freitext und Verhalten bewertet später der Judge.

const FINAL = ['abgeschlossen', 'uebergabe'];

// Telefonnummern ohne Leerzeichen, Punkte und Bindestriche vergleichen, alles andere ohne Gross/Klein.
const normalize = (name, value) => {
  const text = String(value ?? '').trim();
  return name === 'rueckruf_telefon' ? text.replace(/[\s.-]/g, '') : text.toLowerCase();
};

// Den Testfall zum Ergebnis über die sessionId finden, nicht über die Reihenfolge.
const runs = $('Prepare Run').all().map(item => item.json);

return $input.all().map(item => {
  const result = item.json;
  const expected = runs.find(run => run.sessionId === result.sessionId).testfall.erwartet;
  const slots = result.slots ?? {};

  const finished = FINAL.includes(result.status);
  const statusOk = expected.status === null || result.status === expected.status;
  const wrongSlots = Object.keys(expected.slots)
    .filter(name => normalize(name, slots[name]) !== normalize(name, expected.slots[name]));

  return {
    json: {
      fall: result.fall,
      sessionId: result.sessionId,
      status: result.status,
      status_erwartet: expected.status,
      status_ok: statusOk,
      slots_ok: wrongSlots.length === 0,
      slots_falsch: wrongSlots,
      // Endet der Dialog ohne Abschluss (10 Runden), gibt es keine Übergabe zu prüfen. Das zeigt beendet.
      beendet: finished,
      uebergabe_ok: !finished || result.uebergabe_gesendet === true,
      runden: result.runden,
      slots,
    },
  };
});
