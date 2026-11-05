// n8n Code-Node «Build Simulator Prompt» im Workflow Run Case (Mode: Run Once for All Items).
// Baut aus dem Testfall und den bisherigen Runden den Auftrag an den Kunden-Simulator.
// Der Dialog liegt in der Data Table eval_turns, weil LLM-Nodes in der Schleife keine Daten weiterreichen.

const input = $('Run Case Input').first().json;
const testCase = input.testfall;

// Load Turns liefert bei einer neuen Session ein leeres Item (Always Output Data). Das zählt nicht als Runde.
const turns = $('Load Turns').all()
  .map(item => item.json)
  .filter(turn => turn.session_id)
  .sort((a, b) => Number(a.runde) - Number(b.runde));

const facts = Object.entries(testCase.fakten)
  .map(([name, value]) => `- ${name}: ${value}`)
  .join('\n');

const dialog = turns.length === 0
  ? '(Noch keine Nachrichten. Du beginnst das Gespräch.)'
  : turns.map(turn => `Kunde: ${turn.kunde}\nBot: ${turn.bot}`).join('\n\n');

const prompt = `Du spielst eine Kundin oder einen Kunden der Muster Versicherung, der einen Glasbruch meldet.
Du testest einen Chatbot. Schreib nur deine nächste Nachricht an den Bot, ohne Anführungszeichen und ohne Erklärung.

REGELN
- Kurz und natürlich, Schweizer Rechtschreibung (ss statt ß).
- Nenne nur Fakten aus deiner Liste. Fragt der Bot nach etwas anderem, sag, dass du es nicht weisst.
- Zeigt der Bot eine Zusammenfassung und stimmt sie mit deinen Fakten überein, antworte nur: ja
- Stimmt etwas in der Zusammenfassung nicht, korrigiere es.

DEIN VERHALTEN
${testCase.kunde}

DEINE FAKTEN
${facts}

BISHERIGER DIALOG
${dialog}`;

return [{
  json: {
    sessionId: input.sessionId,
    runde: turns.length + 1,
    prompt,
  },
}];
