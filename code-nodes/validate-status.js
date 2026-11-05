// n8n Code-Node «Validate Status» im Workflow Bot Core (Mode: Run Once for All Items).
// Prüft die Antwort des Claims Assistant und gibt eine flache, einheitliche Struktur weiter.
// Siehe docs/adr/0002-structured-json-output.md

// Erlaubte Werte für status. Alles andere wird sicherheitshalber zur Übergabe.
const ALLOWED = ['sammeln', 'bestaetigen', 'abgeschlossen', 'uebergabe'];
const sessionId = $('Bot Core Input').first().json.sessionId;

return $input.all().map(item => {
  const output = item.json.output ?? {};
  const valid = ALLOWED.includes(output.status);

  return {
    json: {
      sessionId,
      antwort: output.antwort ?? '',
      status: valid ? output.status : 'uebergabe',
      slots: output.slots ?? {},
      uebergabe_grund: valid ? (output.uebergabe_grund ?? '') : `Ungültiger Status vom Modell: ${output.status}`,
    },
  };
});
