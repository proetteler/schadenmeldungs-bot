// n8n Code-Node «Validate Status» im Workflow Bot Core (Mode: Run Once for All Items).
// Prüft die Antwort des Claims Assistant und gibt eine flache, einheitliche Struktur weiter.
// Siehe docs/adr/0002-structured-json-output.md

// Erlaubte Werte für status. Alles andere wird sicherheitshalber zur Übergabe.
const ALLOWED = ['sammeln', 'bestaetigen', 'abgeschlossen', 'uebergabe'];

// Pflichtangaben für «abgeschlossen»: Slot-Name → Bezeichnung für den Kunden.
const REQUIRED = {
  policennummer: 'Policennummer',
  schadendatum: 'Schadendatum',
  objekt: 'Objekt',
  ursache: 'Ursache',
  fotos_vorhanden: 'Fotos vorhanden',
  rueckruf_telefon: 'Rückruf-Telefon',
};

const sessionId = $('Bot Core Input').first().json.sessionId;

return $input.all().map(item => {
  const output = item.json.output ?? {};
  const slots = output.slots ?? {};
  let status = output.status;
  let antwort = output.antwort ?? '';
  let grund = output.uebergabe_grund ?? '';

  if (!ALLOWED.includes(status)) {
    grund = `Ungültiger Status vom Modell: ${status}`;
    status = 'uebergabe';
  }

  // Das LLM darf nicht allein entscheiden, dass alles vorliegt. Fehlt etwas, übernimmt ein Mensch.
  if (status === 'abgeschlossen') {
    const missing = Object.keys(REQUIRED).filter(name => String(slots[name] ?? '').trim() === '');
    if (missing.length > 0) {
      const labels = missing.map(name => REQUIRED[name]).join(', ');
      status = 'uebergabe';
      grund = `Pflichtangaben fehlen: ${missing.join(', ')}`;
      antwort = `Vielen Dank. Für die Meldung fehlt noch: ${labels}. ` +
        'Eine Mitarbeiterin oder ein Mitarbeiter übernimmt Ihr Anliegen.';
    }
  }

  return {
    json: { sessionId, antwort, status, slots, uebergabe_grund: grund },
  };
});
