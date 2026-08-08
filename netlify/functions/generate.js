const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";

const LAWS = {
  1: { name: "The Law of Boundaries", kern: "Grenzen sind nicht herzlos. Sie sind Klarheit. Nicht nachgeben, wenn eine Grenze unter sozialen Druck gerät. Kurz, ruhig, ohne Schuldgefühl." },
  2: { name: "The Law of Worth", kern: "Der eigene Wert oder Preis ist keine Verhandlungsbasis. Keine Erklärung, keine Rechtfertigung, kein 'weil'. Ein Preis ist eine Tatsache, kein Argument." },
  3: { name: "The Law of Integrity", kern: "Feedback ernst nehmen, ohne sich selbst zu bestrafen. Zuhören ist etwas anderes als sich schuldig fühlen. Das Nervensystem speichert Feedback als Angriff, weil es eine ähnliche Situation früher als gefährlich erlebt hat. Das ist nicht die Wahrheit von heute." },
  4: { name: "The Law of Clarity", kern: "Auf Kritik nicht mit mehr antworten, sondern mit Klarheit. Tiefe statt Menge. Das Nervensystem greift auf alte Erfahrungen zurück, nicht auf die Wahrheit von heute." },
  5: { name: "The Law of Silence", kern: "Vor Außenstehenden ohne echten Einfluss keine Rechtfertigung. Kurz bestätigen, nicht erklären. Schweigen ist Souveränität, nicht Schwäche." },
};

const KANAL_REGELN = {
  whatsapp: `
FORMAT: WhatsApp-Nachricht.
- Maximal 1-2 Sätze, kurz wie eine echte Textnachricht
- Keine Anrede, kein formeller Abschluss
- Locker, direkt, wie man wirklich tippt
- Kein "Liebe Grüße" oder ähnliche Floskeln
`,
  email: `
FORMAT: E-Mail.
- Kurze Anrede (z.B. "Hallo [Vorname]," oder "Hi,")
- 2-4 Sätze im Hauptteil
- Kurzer Abschluss (z.B. "Viele Grüße" oder "Herzlich")
- Strukturierter als WhatsApp, aber nicht steif
`,
  kommentar: `
FORMAT: Öffentlicher Kommentar (Instagram, LinkedIn o.ä.).
- 1-2 Sätze, die auch für alle Mitleser geschrieben sind
- Keine persönliche Anrede
- Souverän und ruhig, weil das Publikum mitliest
- Kein langer Erklärtext, kein Rechtfertigen
`,
};

const TON_REGELN = {
  verbindend: `
TON: Verbindend.
Ziel: Die Grenze klar halten UND die Beziehung wahren. Die andere Person soll sich gesehen fühlen, nicht abgewiesen.
Die Antwort darf Wärme zeigen, darf auf die Person eingehen, ohne dabei die eigene Position aufzuweichen.
Beispiel-Qualität: "Ich freu mich, dass Du anfragst. Mein Preis ist X, und ich freue mich, wenn Du dabei bist."
`,
  praezise: `
TON: Präzise.
Ziel: Klar und auf den Punkt, ohne viel Drumherum. Nicht kalt, aber auch keine extra Wärme.
Die Antwort sagt genau das, was gesagt werden muss, nicht mehr.
Beispiel-Qualität: "Mein Preis ist X. Ich freue mich, wenn Du dabei bist."
`,
};

const CORE_PHILOSOPHY = `
KERNÜBERZEUGUNG, NIEMALS VERLETZEN:
- Das Nervensystem ist NIEMALS das Problem. Es schützt, mit einem veralteten Programm.
- NIEMALS "heilen" oder "Heilung" beim Nervensystem verwenden.
- NIEMALS generische Empowerment-Phrasen.
- Die Formulierung ist immer: das Nervensystem verwechselt gerade Sicherheit mit Gefahr.
- NIEMALS: "Dein Nervensystem ist das Problem".
- Keine verschachtelten Relativsätze, die grammatisch kippen können.
- GRAMMATIKPFLICHT: Jeden Satz vor der Ausgabe auf korrekten Kasus prüfen.
  FALSCH: "Du hast ihr kein Stein gegeben" → RICHTIG: "Du hast ihr keinen Stein gegeben"
  FALSCH: "Das ist kein Problem" wenn Akkusativ → RICHTIG: "Das ist kein Problem" (Nominativ ok)
  Vor allem kein/keinen/keinem/keine sorgfältig prüfen.
- VERBOTEN: "Nicht... sondern..." ist eine typische KI-Floskel. Niemals verwenden.
  Stattdessen positiv formulieren: direkt sagen was ist, nicht was es nicht ist.
  FALSCH: "Nicht weil Du die falschen Worte hast, sondern weil..."
  RICHTIG: "Dein Nervensystem darf lernen, dass das hier sicher ist."
`;

const BRAND_VOICE = `
SCHREIBREGELN, verpflichtend ohne Ausnahme:
- Keine Gedankenstriche (– oder —) als Satzverbinder. Immer Punkt oder Doppelpunkt stattdessen.
- Kein Gendern.
- Kein Coaching-Bla: kein "Journey", "Potenzial entfalten", "ganzheitlich", "Leichtigkeit".
- Kurze, einfache Hauptsätze. Keine verschachtelten Relativsätze.
- Souverän bedeutet: klar und ruhig, ohne Rechtfertigung. Nicht hart, nicht zickig, nicht abweisend.
- FALSCH (zickig): "Der Preis bleibt wie er ist." / "Alles klar, nein."
- RICHTIG (souverän): "Mein Preis ist X. Ich freue mich, wenn Du dabei bist."

STIL-ANPASSUNG:
Die Nutzerin hat in ihren Eingaben selbst geschrieben. Passe folgende Stil-Elemente an ihre eigenen Texte an:
- Großschreibung von "du/Du", "dein/Dein" etc.: exakt so übernehmen, wie sie es selbst schreibt
- Satzlänge und Direktheit: aus ihren Eingaben ableiten
- Keine typischen KI-Formulierungen verwenden
`;

const APPROVED_EXAMPLES = [
  {
    situation: "Kundin fragt explizit nach einem Rabatt: Könntest Du den Preis für mich etwas senken?",
    verbindend: "Ich freu mich, dass Du anfragst. Mein Preis ist 1.200 Euro, und ich freue mich, wenn Du dabei bist.",
    praezise: "Mein aktueller Preis ist 1.200 Euro. Ich freue mich, wenn Du dabei bist.",
    falsch: "Alles klar, der Preis bleibt wie er ist. / Nein, kein Rabatt.",
    warum_falsch: "Klingt abweisend und zickig. Souverän hält die Grenze UND lässt die Tür offen.",
  },
  {
    situation: "Kundin sagt nur, dass es ihr zu teuer ist, fragt aber NICHT nach Anpassung: Das ist mir grad zu teuer, passt für mich nicht.",
    verbindend: "Danke, dass Du Dich meldest. Schade, dass es gerade nicht passt. Ich wünsch Dir alles Gute auf Deinem Weg. Wer weiß, wo sich unsere Wege nochmal kreuzen.",
    praezise: "Schade, dass es nicht passt. Alles Gute für Dich.",
    falsch: "Mein Preis bleibt wie er ist. / Ich kann leider nicht nachgeben. / Schade, tschüs.",
    warum_falsch: "Niemand hat nach einer Preisänderung gefragt. Und zu kurz ohne jede Wärme wirkt zickig, nicht souverän.",
  },
];

function formatExamples() {
  return APPROVED_EXAMPLES.map(
    (ex) =>
      `Situation: "${ex.situation}"\nGut (verbindend): "${ex.verbindend}"\nGut (präzise): "${ex.praezise}"\nSO NICHT: "${ex.falsch}"\nWarum falsch: ${ex.warum_falsch}`
  ).join("\n\n");
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function callClaude(systemPrompt, userPrompt, maxTokens) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API Fehler: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

async function extractStyleProfile(texts) {
  const combined = texts.filter(Boolean).join("\n\n---\n\n");
  const systemPrompt = `
Du analysierst AUSSCHLIESSLICH den Schreibstil. Niemals Inhalt oder Themen erwähnen.
Antworte NUR als valides JSON ohne Markdown:
{"grossschreibung_du": true/false, "laenge": "kurz/mittel/lang", "ton": "2-3 Stichworte", "direktheit": "niedrig/mittel/hoch"}

"grossschreibung_du" ist true wenn die Person "Du", "Dein" etc. großschreibt, false wenn kleingeschrieben.
  `.trim();

  try {
    const raw = await callClaude(systemPrompt, `Texte zur Analyse:\n${combined}`, 80);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return { grossschreibung_du: true, laenge: "mittel", ton: "direkt, klar", direktheit: "mittel" };
  }
}

function removeEmDashes(text) {
  if (!text) return text;
  return text
    .replace(/\s*[–—]\s*([a-zäöüß])/g, (_, letter) => `. ${letter.toUpperCase()}`)
    .replace(/[–—]/g, ".");
}

function removeNichtSondern(text) {
  if (!text) return text;
  // "Nicht X, sondern Y" → nur "Y" übrig, mit großem Anfangsbuchstaben
  return text
    .replace(/[Nn]icht\s+[^,\.]{1,80},?\s+sondern\s+([a-zäöüßA-ZÄÖÜ])/g,
      (_, ersterBuchstabe) => ersterBuchstabe.toUpperCase())
    .replace(/\s{2,}/g, " ")
    .trim();
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: "Nur POST erlaubt." }) };
  }

  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: "API-Key fehlt." }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: "Ungültige Anfrage." }) };
  }

  const { step } = payload;

  try {
    if (step === "classify") {
      const { situation, thought } = payload;
      if (!situation || situation.trim().length < 3) {
        return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: "Bitte beschreibe kurz, was Dir geschrieben wurde." }) };
      }

      const systemPrompt = `
Ordne die Situation genau EINEM von 5 Mustern zu. Antworte NUR mit einer Ziffer von 1-5.
1 = Grenze unter sozialem Druck (Termin, Absage, Sonderwunsch)
2 = Preis oder Wert wird infrage gestellt
3 = Unzufriedenheit mit erbrachter Leistung, Impuls sich schuldig zu fühlen
4 = Kritik kommt, Impuls mit mehr zu reagieren
5 = Außenstehende Person ohne Einfluss stellt etwas infrage
      `.trim();

      const raw = await callClaude(systemPrompt, `Situation: ${situation}\nGedanke: ${thought || ""}`, 5);
      const match = raw.match(/[1-5]/);
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ lawId: match ? parseInt(match[0]) : 2 }) };
    }

    if (step === "generate") {
      const { situation, thought, wunsch, vision, lawId, kanal, tonmodus } = payload;

      if (!situation) {
        return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: "Es fehlen Angaben." }) };
      }

      const law = LAWS[lawId] || LAWS[2];
      const kanalRegel = KANAL_REGELN[kanal] || KANAL_REGELN.whatsapp;
      const tonRegel = TON_REGELN[tonmodus] || TON_REGELN.verbindend;
      const variationSeed = Math.floor(Math.random() * 10000);

      const styleProfile = await extractStyleProfile([thought, wunsch, vision]);
      const duSchreibweise = styleProfile.grossschreibung_du ? "Du/Dein/Dich/Dir" : "du/dein/dich/dir";

      const systemPrompt = `
${BRAND_VOICE}

${CORE_PHILOSOPHY}

${kanalRegel}

${tonRegel}

Haltung (${law.name}): ${law.kern}

STIL-ANPASSUNG für die "antwort": Die Nutzerin schreibt "${duSchreibweise}". Übernimm das exakt so in die Antwort.

IMMER in "mut": Du/Dein/Dich/Dir wird IMMER großgeschrieben, weil das Corinnas eigene Markenstimme ist, unabhängig davon, wie die Nutzerin selbst schreibt.

FREIGEGEBENE BEISPIELE:
${formatExamples()}

Erzeuge GENAU ZWEI Texte:
1. "antwort": Die fertige Antwort für die Business-Situation, im gewählten Kanal-Format und Ton-Modus.

KRITISCH: Die Antwort darf NUR auf das eingehen, was die andere Person tatsächlich geschrieben oder gesagt hat. Nicht auf das, was sie vielleicht gemeint haben könnte. Nicht auf ein Schema, das bei ähnlichen Situationen passt. Wenn jemand sagt "das ist mir zu teuer", hat sie NICHT nach einer Preisanpassung gefragt. Die Antwort darf also nicht "mein Preis bleibt wie er ist" enthalten, weil das niemand gefragt hat. Sie antwortet auf die tatsächliche Aussage, nicht auf eine imaginierte Folgefrage.

2. "mut": 3-5 Sätze NUR für die Nutzerin selbst, KEINE Antwort an die Kundin.
Erkläre sanft und menschlich, was gerade in ihrem Körper passiert, basierend auf dem, was sie in den Feldern "was geht in Dir vor" und "was fühlst Du" geschrieben hat.

Folge dabei IMMER dieser Logik von Corinna:
- Das Nervensystem kennt nur zwei Zustände: sicher oder Gefahr. Es reagiert auf Muster aus der Vergangenheit, nicht auf die tatsächliche Situation heute.
- Was die Nutzerin gerade fühlt (Herzklopfen, Enge, Anspannung) ist keine Schwäche. Ihr Nervensystem tut genau das, wofür es gebaut wurde: sie schützen.
- Irgendwann gab es einen guten Grund, so zu reagieren. Vielleicht war Ablehnung einmal wirklich gefährlich. Vielleicht war es einmal nötig, klein zu bleiben oder nicht aufzufallen.
- Das System hat nur kein Update bekommen, dass es diesen Grund heute nicht mehr gibt.
- Es ist IMMER zum Schutz, niemals gegen sie. Niemals weil sie unfähig, doof oder falsch wären.
- Und dann der Dreh: Es ist in Ordnung, heute für sich einzustehen. Es ist in Ordnung, Grenzen zu setzen. Es ist in Ordnung, einen angemessenen Preis zu nehmen. Ihr Körper lernt das gerade, Schritt für Schritt.

WICHTIG: Nie "Dein Nervensystem ist das Problem". Nie "heilen". Nie verschachtelte Relativsätze. Kein "Nicht... sondern...". Warmherzig, klar, zwei bis drei kurze Sätze pro Gedanke.

Antworte NUR als valides JSON ohne Markdown:
{"antwort": "...", "mut": "..."}

(Intern: Variations-Kennung ${variationSeed}. Lies bei diesem Anlauf noch einmal sehr genau, was die Person in allen Feldern geschrieben hat. Was sagt sie zwischen den Zeilen? Welche Emotion steckt hinter ihrem ersten Gedanken? Was braucht sie wirklich in dieser Antwort? Formuliere so, dass sie das Gefühl hat: genau das wollte ich sagen. Vermeide Formulierungen aus einer möglichen vorherigen Generierung zur gleichen Situation.)
      `.trim();

      const userPrompt = `
Erhaltene Nachricht: ${situation}
Was gerade in ihr vorgeht: ${thought || "(nicht angegeben)"}
Was sie eigentlich sagen würde: ${wunsch || "(nicht angegeben)"}
Was sich verändern würde, wenn ihr das leicht fällt: ${vision || "(nicht angegeben)"}
      `.trim();

      const raw = await callClaude(systemPrompt, userPrompt, 900);

      let parsed;
      try {
        const cleaned = raw.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch (e) {
        parsed = { antwort: raw, mut: "" };
      }

      if (!parsed.mut) parsed.mut = "Du darfst für Dich einstehen. Genau jetzt.";

      parsed.antwort = removeEmDashes(parsed.antwort);
      parsed.antwort = removeNichtSondern(parsed.antwort);
      parsed.mut = removeEmDashes(parsed.mut);
      parsed.mut = removeNichtSondern(parsed.mut);

      // Sicherheitsnetz: Im mut-Text immer Du/Dein/Dich/Dir großschreiben
      // (Corinnas Markenstimme, unabhängig vom Schreibstil der Nutzerin)
      if (parsed.mut) {
        parsed.mut = parsed.mut
          .replace(/\bdu\b/g, "Du")
          .replace(/\bdich\b/g, "Dich")
          .replace(/\bdein\b/gi, (m) => m[0].toUpperCase() + m.slice(1))
          .replace(/\bdir\b/g, "Dir");
      }

      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify(parsed) };
    }

    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: "Unbekannter Schritt." }) };

  } catch (err) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: "Es ist ein Fehler aufgetreten. Bitte versuch es nochmal." }) };
  }
};
