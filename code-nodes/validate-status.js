// n8n Code-Node «Validate Status» im Workflow Bot Core (Mode: Run Once for All Items).
// Prüft die Antwort des Claims Assistant und gibt eine flache, einheitliche Struktur weiter.
// Siehe docs/adr/0002-structured-json-output.md

// Erlaubte Werte für status. Alles andere wird sicherheitshalber zur Übergabe.
const ERLAUBT = ['sammeln', 'bestaetigen', 'abgeschlossen', 'uebergabe'];
const sessionId = $('Bot Core Input').first().json.sessionId;

return $input.all().map(item => {
  const o = item.json.output ?? {};
  const gueltig = ERLAUBT.includes(o.status);

  return {
    json: {
      sessionId,
      antwort: o.antwort ?? '',
      status: gueltig ? o.status : 'uebergabe',
      slots: o.slots ?? {},
      uebergabe_grund: gueltig ? (o.uebergabe_grund ?? '') : `Ungültiger Status vom Modell: ${o.status}`,
    },
  };
});
