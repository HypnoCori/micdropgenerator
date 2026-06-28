// netlify/functions/generate.js
//
// Diese Funktion läuft NICHT im Browser, sondern auf dem Server.
// Der API-Key ist hier sicher, weil dieser Code beim Nutzer nie sichtbar ist.
//
// Sie übernimmt zwei Aufgaben, je nach "step":
//   step "classify" -> ordnet die Situation einem der 5 Gesetze zu
//   step "generate" -> erzeugt die zwei finalen Antwortvarianten (Warm / Klar)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-haiku-4-5-20251001";

// Die 5 Gesetze, im Hintergrund-Prompt als Haltung verwendet.
const LAWS = {
  1: {
    name: "The Law of Boundaries",
    kern: "Grenzen sind nicht herzlos. Sie sind Klarheit. Nicht nachgeben, wenn eine Grenze unter sozialen Druck gerät. Kurz, ruhig, ohne Schuldgefühl.",
  },
  2: {
    name: "The Law of Worth",
    kern: "Der eigene Wert oder Preis ist keine Verhandlungsbasis. Keine Erklärung, keine Rechtfertigung, kein 'weil'. Ein Preis oder eine Entscheidung ist eine Tatsache, kein Argument.",
  },
  3: {
    name: "The Law of Integrity",
    kern: "Feedback ernst nehmen, ohne sich selbst dafür zu bestrafen oder zu überkompensieren. Zuhören ist etwas anderes als sich schuldig fühlen. Das Nervensystem speichert das Feedback gerade als Angriff, weil es eine ähnliche Situation schon einmal als gefährlich erlebt hat, und greift jetzt auf diesen alten Wissensstand zurück. Das ist nicht die Wahrheit der aktuellen Situation, nur eine alte Schutzreaktion, die neu lernen kann.",
  },
  4: {
    name: "The Law of Clarity",
    kern: "Auf Kritik nicht mit mehr antworten (mehr Erklärung, mehr Zugeständnis, mehr Einsatz), sondern mit Klarheit. Tiefe statt Menge. Auch hier greift das Nervensystem auf eine alte, gespeicherte Erfahrung zurück (Kritik war früher gefährlich), nicht auf die Wahrheit von heute.",
  },
  5: {
    name: "The Law of Silence",
    kern: "Vor Außenstehenden ohne echten Einfluss auf die Entscheidung keine Rechtfertigung. Kurz bestätigen, nicht erklären, Thema wechseln. Schweigen ist Souveränität, nicht Schwäche.",
  },
};

// Corinnas Kernüberzeugung. Das ist die wichtigste Stelle im gesamten Prompt,
// weil sie verhindert, dass die KI Sätze erzeugt, die ihrer Philosophie widersprechen.
const CORE_PHILOSOPHY = `
KERNÜBERZEUGUNG, NIEMALS VERLETZEN:
- Das Nervensystem ist NIEMALS das Problem. Es ist NICHT kaputt und muss NICHT heilen.
  Es schützt, mit einem veralteten Programm. Es verwechselt aktuell Sicherheit mit Gefahr,
  basierend auf einer alten, echten Erfahrung, nicht auf der Wahrheit von heute.
- Grundprinzip: Neuroplastizität. Was das Nervensystem einmal gelernt hat, kann es neu lernen,
  bis zum letzten Atemzug. Aber NUR, wenn es sich sicher fühlt. Nicht durch Disziplin, nicht durch
  Mut, nicht durch reines Mindset, nicht durch "inneres Kind umarmen", nicht durch große
  kathartische Heil-Übungen oder Weinen. Sicherheit entsteht eher ruhig, oft mit einem
  Gegenüber, nicht durch Überflutung mit Gefühlen.
- NIEMALS das Wort "heilen" oder "Heilung" in Bezug auf das Nervensystem verwenden.
- "Trauma" und "Trigger" nur verwenden, wenn es wirklich passt, niemals inflationär.
- NIEMALS generische Empowerment-Phrasen wie "Wenn ich es geschafft habe, kannst Du es auch"
  oder "Du kannst alles schaffen, wenn Du nur willst". Das ist leeres Coaching-Bla.
- Die Formulierung ist immer: das Nervensystem verwechselt gerade Sicherheit mit Gefahr,
  basierend auf einer alten Erfahrung. NIEMALS: "Dein Nervensystem ist das Problem".
`;

// FREIGEGEBENE BEISPIELE, von Corinna selbst geprüft und genehmigt.
// Neue gute (oder schlechte) Beispiele werden hier ergänzt, sobald Corinna sie freigibt.
// Das ist der Hauptmechanismus, um die KI näher an Corinnas tatsächlichen Geschmack
// heranzuführen, ohne das Modell selbst neu trainieren zu müssen.
const APPROVED_EXAMPLES = [
  {
    situation: "Kundin fragt nach einem Rabatt auf den Preis",
    warm: "Ich freu mich total, dass Du anfragst! Mein aktueller Preis ist 1.200 Euro, und dabei bleibe ich auch gern für Dich.",
    klar: "Mein aktueller Preis ist 1.200 Euro. Ich freue mich, wenn Du dabei bist.",
  },
  {
    situation: "Bekannte ohne echten Einfluss kommentiert den Preis abwertend",
    warm: "Ja, das ist mein Preis, und ich steh total dahinter.",
    klar: "Ja, das ist mein Preis.",
  },
];

function formatExamples() {
  return APPROVED_EXAMPLES.map(
    (ex) =>
      `Business-Nachricht: "${ex.situation}"\nGutes Beispiel "warm": "${ex.warm}"\nGutes Beispiel "klar": "${ex.klar}"`
  ).join("\n\n");
}

const BRAND_VOICE = `
Du schreibst im Stil von Corinna Eichholz, Hypnose- und Nervensystemcoach für Unternehmerinnen.
Diese Regeln sind verpflichtend, ohne Ausnahme:
- "Du", "Dein", "Dich", "Dir" werden IMMER großgeschrieben.
- Kein Gendern, keinerlei Ausnahmen.
- Keine Gedankenstriche als Satzverbinder, lieber Punkt oder Doppelpunkt.
- Kein Coaching-Bla: keine Worte wie "unlock", "Potenzial entfalten", "ganzheitlich", "Journey", "Leichtigkeit".
- Keine Entschuldigungen oder Abschwächungen in der generierten Antwort selbst.
- Kurze, klare Sätze. Konkret statt abstrakt.
- Souverän bedeutet: kurz, ruhig, ohne Rechtfertigung. Nicht hart, nicht kalt, nicht unhöflich.

Stil-Referenz, echte Sätze von Corinna (zur Orientierung am Ton, nicht zum Kopieren):
"Du warst niemals falsch. Du warst ein Leben lang brillant darin, Dich zu schützen."
"Grenzen sind nicht das Problem. Dein Nervensystem ist das Problem." (ACHTUNG: dieser exakte
zweite Satz ist VERALTET und darf NIEMALS verwendet werden, siehe Kernüberzeugung unten.
Richtig wäre: "Dein Nervensystem verwechselt hier gerade Sicherheit mit Gefahr.")
"Wer seinen Preis erklärt, zweifelt selbst daran."
"Du bist nicht blockiert. Du bist beschützt."
"Das ist kein Mindset-Problem. Das ist Biologie."

WICHTIGE SPERRE: Auch die "klar"-Variante darf NIEMALS auf ein abgehacktes, einzelnes Wort
wie "Punkt." als Satzende hinauslaufen (Beispiel für FALSCH: "Mein Preis ist 1.200 Euro. Punkt.").
Das wirkt kalt und unprofessionell, nicht souverän. Souverän und kurz heißt: ein vollständiger,
ruhiger Satz, der nichts erklärt, aber auch nichts abschneidet. Näher an der echten Stil-Referenz
oben: "Mein aktueller Preis ist 1.200 Euro. Ich freue mich, wenn Du dabei bist." ist ein gutes
Beispiel für "klar", nicht zu weich, aber auch nicht schroff.
`;

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

// Zieht NUR abstrakte Stilmerkmale aus dem privaten Beispieltext, niemals den Inhalt.
// Der Rückgabewert enthält keine Wörter aus dem Originaltext mehr, nur Stichworte
// über Länge, Ton, Direktheit und Besonderheiten. So kann der Inhalt der
// Freundinnen-Antwort strukturell nicht in die Business-Antwort durchrutschen,
// weil die KI im nächsten Schritt den Originaltext gar nicht mehr zu sehen bekommt.
async function extractStyleProfile(mirrorAnswer) {
  const systemPrompt = `
Du analysierst AUSSCHLIESSLICH den Schreibstil eines Textes, niemals seinen Inhalt oder sein Thema.
Gib NUR ein valides JSON-Objekt zurück, ohne Markdown, ohne weiteren Text, in genau diesem Format:
{"laenge": "kurz/mittel/lang", "ton": "2-4 Stichworte", "direktheit": "niedrig/mittel/hoch", "besonderheiten": "2-4 Stichworte, z.B. Emojis, Umgangssprache, Ausrufe"}

WICHTIG: Nenne niemals, worum es in dem Text inhaltlich geht. Keine Themen, keine Namen, keine
konkreten Wörter aus dem Text. Nur reine Stil-Beobachtungen.
  `.trim();

  const userPrompt = `Text: ${mirrorAnswer}`;

  try {
    const raw = await callClaude(systemPrompt, userPrompt, 120);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (e) {
    return { laenge: "mittel", ton: "neutral, klar", direktheit: "mittel", besonderheiten: "keine" };
  }
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Nur POST erlaubt." }),
    };
  }

  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: "Server ist nicht korrekt konfiguriert (API-Key fehlt).",
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Ungültige Anfrage." }),
    };
  }

  const { step } = payload;

  try {
    if (step === "classify") {
      const { situation, thought } = payload;

      if (!situation || situation.trim().length < 3) {
        return {
          statusCode: 400,
          headers: corsHeaders(),
          body: JSON.stringify({ error: "Bitte beschreibe kurz, was Dir geschrieben wurde." }),
        };
      }

      const systemPrompt = `
Du analysierst eine Business-Situation und ordnest sie genau EINEM von 5 Mustern zu.
Antworte ausschließlich mit einer einzigen Ziffer von 1 bis 5, ohne jeden weiteren Text, ohne Satzzeichen.

1 = Eine Grenze wird unter sozialen Druck gesetzt (jemand will, dass nachgegeben wird, z.B. Termin, Absage, Sonderwunsch).
2 = Der eigene Preis oder Wert wird infrage gestellt oder kommentiert.
3 = Jemand ist unzufrieden mit einer bereits erbrachten Leistung und es entsteht der Impuls, sich selbst die Schuld zu geben oder zu überkompensieren.
4 = Kritik kommt, und der Impuls ist, mit mehr zu reagieren (mehr Erklärung, mehr Bonus, mehr Einsatz) statt mit Klarheit.
5 = Eine außenstehende Person ohne echten Einfluss auf die Entscheidung stellt etwas infrage (z.B. Familie, Bekannte).

Wähle das Muster, das am besten passt, auch wenn keines perfekt passt. Antworte NUR mit der Ziffer.
      `.trim();

      const userPrompt = `Situation: ${situation}\nErster Gedanke dazu: ${thought || "(nicht angegeben)"}`;

      const raw = await callClaude(systemPrompt, userPrompt, 5);
      const match = raw.match(/[1-5]/);
      const lawId = match ? parseInt(match[0], 10) : 2;

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ lawId }),
      };
    }

    if (step === "generate") {
      const { situation, thought, mirrorAnswer, lawId } = payload;

      if (!situation || !mirrorAnswer) {
        return {
          statusCode: 400,
          headers: corsHeaders(),
          body: JSON.stringify({ error: "Es fehlen Angaben für die Antwort-Generierung." }),
        };
      }

      const law = LAWS[lawId] || LAWS[2];
      const variationSeed = Math.floor(Math.random() * 10000);

      // Schritt A: Nur den Stil aus der privaten Antwort ziehen, Inhalt wird danach verworfen.
      const styleProfile = await extractStyleProfile(mirrorAnswer);

      const systemPrompt = `
${BRAND_VOICE}

${CORE_PHILOSOPHY}

Haltung, die in JEDER generierten Antwort gilt (${law.name}):
${law.kern}

AUFGABE:
Die Nutzerin hat folgende Business-Nachricht erhalten und überlegt, wie sie antworten soll.
Du bekommst außerdem ein STIL-PROFIL (siehe unten). Dieses Profil beschreibt NUR, wie die
Nutzerin schreibt, wenn sie entspannt und ungefiltert ist (Länge, Ton, Direktheit, Besonderheiten).
Du kennst NICHT den Inhalt, zu dem dieses Stil-Profil ursprünglich gehörte, und das ist auch
nicht nötig. Nutze ausschließlich dieses Stil-Profil, um den TON der Business-Antwort zu treffen.
Der INHALT der Antwort kommt zu 100% aus der Business-Nachricht und dem Gesetz oben, NIEMALS
aus irgendeinem anderen Thema. Übersetze die Stil-Merkmale in ein professionelles, aber
persönlich klingendes Business-Register, nicht 1 zu 1 die gleiche Lockerheit.

Zusätzlich hat die Nutzerin geschrieben, was sie eigentlich sagen würde, wenn nichts auf dem
Spiel stünde. Das ist ihre echte Kernaussage zur Business-Nachricht. Du nimmst aus diesem Text
die Substanz (die eigentliche Grenze, die eigentliche Position), NICHT den rohen Ton, falls er
zu schroff oder unprofessionell ist.

VON CORINNA FREIGEGEBENE BEISPIELE (orientiere Dich stark an diesem Ton und dieser Länge,
das ist der verlässlichste Maßstab für "richtig"):
${formatExamples()}

Erzeuge GENAU DREI Texte:

1. "warm": etwas persönlicher und wärmer im Ton, aber genauso klar und ohne Rechtfertigung. Antwort auf die Business-Nachricht. Maximal 2-3 Sätze.

2. "klar": kürzer, direkter, sehr nah an der Haltung der 5 Gesetze (keine Erklärung, kein "weil"). Antwort auf die Business-Nachricht. Maximal 2-3 Sätze.

3. "mut": ein kurzer Ermutigungssatz (maximal 2 Sätze), KEINE Antwort an die Kundin, sondern eine Zeile NUR für die Nutzerin selbst, die ihr Mut macht, für sich einzustehen. Muss konkret auf IHRE geschilderte Business-Situation eingehen, nicht generisch sein. Darf einen kurzen Nervensystem-Gedanken einbauen (siehe Kernüberzeugung), muss aber ermutigend und erleichternd klingen, nicht das Problem nochmal aufmachen oder Symptome (wie Herzrasen) erneut betonen.

Alle drei folgen den Brand-Voice-Regeln und der Kernüberzeugung oben, ohne Ausnahme.

Antworte AUSSCHLIESSLICH als valides JSON-Objekt, ohne Markdown-Codeblock, ohne weiteren Text, in genau diesem Format:
{"warm": "...", "klar": "...", "mut": "..."}

(Interner Hinweis, nicht erwähnen: Variations-Kennung ${variationSeed}. Falls dies eine Wiederholungs-Anfrage zur gleichen Situation ist, formuliere spürbar anders als eine naheliegende Standardformulierung, ohne den Sinn zu verändern.)
      `.trim();

      const userPrompt = `
Business-Nachricht, auf die sie antworten will: ${situation}

Ihr erster, ungefilterter Gedanke zur Business-Nachricht: ${thought || "(nicht angegeben)"}

Ihre Kernaussage, wenn nichts auf dem Spiel stünde (Substanz, nicht Ton übernehmen): ${mirrorAnswer}

STIL-PROFIL (nur für Ton, kein Inhalt):
Länge: ${styleProfile.laenge}
Ton: ${styleProfile.ton}
Direktheit: ${styleProfile.direktheit}
Besonderheiten: ${styleProfile.besonderheiten}
      `.trim();

      const raw = await callClaude(systemPrompt, userPrompt, 650);

      let parsed;
      try {
        const cleaned = raw.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch (e) {
        parsed = { warm: raw, klar: raw, mut: "" };
      }

      if (!parsed.mut) {
        parsed.mut = "Du darfst für Dich einstehen. Genau jetzt.";
      }

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify(parsed),
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Unbekannter Schritt." }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Es ist ein Fehler aufgetreten. Bitte versuch es nochmal." }),
    };
  }
};
