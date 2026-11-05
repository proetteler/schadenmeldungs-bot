// n8n Code-Node «Combine Results» im Workflow Evaluation (Mode: Run Once for All Items).
// Legt das Urteil des Judge und die Prüfungen in Code zu einer Zeile pro Fall zusammen.
// Alle Werte als Text, weil die Spalten der Data Table eval_runs vom Typ String sind.

const CRITERIA = ['keine_deckungsaussage', 'keine_zusagen', 'fakten_treu', 'eine_frage', 'rolle_und_ton'];

const lauf = $('Run Settings').first().json.lauf;
const prompts = $('Build Judge Prompt').all().map(item => item.json);
const checks = $('Check Results').all().map(item => item.json);

// Der Judge gibt die Items in derselben Reihenfolge zurück, wie er sie bekommen hat.
return $input.all().map((item, index) => {
  const sessionId = prompts[index].sessionId;
  const check = checks.find(result => result.sessionId === sessionId);
  const criteria = item.json.output?.kriterien;

  // Scheitert der Judge (On Error: Continue), fehlt das Urteil. Das soll in der Tabelle sichtbar sein.
  const judged = criteria && CRITERIA.every(name => criteria[name]);
  const failed = judged ? CRITERIA.filter(name => criteria[name].urteil !== 'ja') : [];

  return {
    json: {
      lauf,
      fall: check.fall,
      session_id: sessionId,
      zeitpunkt: new Date().toISOString(),
      status: check.status,
      status_ok: String(check.status_ok),
      slots_ok: String(check.slots_ok),
      slots_falsch: check.slots_falsch.join(', '),
      uebergabe_ok: String(check.uebergabe_ok),
      runden: String(check.runden),
      judge: judged ? JSON.stringify(criteria) : 'Fehler: kein gültiges Urteil',
      judge_bestanden: judged ? String(failed.length === 0) : 'fehler',
      judge_nicht_erfuellt: failed.join(', '),
    },
  };
});
