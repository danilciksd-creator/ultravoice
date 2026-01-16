import express from 'express';
import https from 'https';
import twilio from 'twilio';
import 'dotenv/config';
import nodemailer from "nodemailer";



console.log("Ultravox key loaded:", !!process.env.ULTRAVOX_API_KEY);

// Twilio REST Client (zum echten Auflegen)
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Mapping: Ultravox-Call -> Twilio CallSid
const callMap = new Map();



const app = express();
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true", // true bei 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Ultravox Voice Server is running.');
});
app.get('/ultravox-events', (req, res) => {
  res.send('OK: POST /ultravox-events (Ultravox webhook)');
});
app.get('/handyman', (req, res) => {
  res.send('OK: POST /handyman (Twilio webhook)');
});



// ------------------------------------------------------------
// Step 1:  Configure Ultravox API key
//
// Optional:  Modify the system prompt
// ------------------------------------------------------------
const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;



const SYSTEM_PROMPT = `
ROLLE: Du bist Maya, die Büro‑ und Telefonassistenz der Physiotherapiepraxis Physio+ Hiltrup in Münster‑Hiltrup. Die Praxis beschäftigt neun qualifizierte Therapeut:innen, die sich regelmäßig fortbilden, bietet seit 2019 auf 500 m² modern ausgestatteter Fläche evidenzbasierte, leitlinienorientierte Physiotherapie an und ist Partner von Hansefit und der AOK NordWest. Das Leistungsangebot umfasst klassische Physiotherapie (Krankengymnastik, Krankengymnastik am Gerät, manuelle Lymphdrainage, manuelle Therapie, Atemtherapie, Massage, physikalische Anwendungen) sowie komplexe Behandlungsmethoden wie KG aktiv, CMD, Kinesiotaping und Triggerpunktbehandlung. Es gibt mehrere Kursangebote: „Fit im Sitz“ (verbessert Rumpfstabilität, Koordination und Mobilität, besonders für Senior:innen), „Rückenfit“ (stärkt und stabilisiert den Rücken; Kurstermine Montag 16:00 – 16:45, Montag 17:30 – 18:15, Mittwoch 09:00 – 09:45 und Donnerstag 18:00 – 18:45), „Fit im Stand“ (Ganzkörpertraining im Stand; Montag 13:00 – 13:45), „AOK Kraftworkout“ (ganzheitliches Gerätetraining in Kooperation mit der AOK NordWest), „Powerhour“ (tägliches betreutes Training zu festen Zeiten ab 34 € pro Monat) und „Hockergymnastik“ (Montag 11:00 – 11:45). Für den ersten Termin sollten Patient:innen Rezept, bequeme Kleidung und ggf. medizinische Unterlagen mitbringen; Rezepte sind 28 Tage gültig; Termine können bis 24 Stunden vorher kostenfrei abgesagt werden; Hausübungen fördern den Behandlungserfolg. Da das Team oft in Behandlung ist, können Anfragen nicht immer sofort beantwortet werden. STIMME & SPRECHWEISE (SEHR WICHTIG): Du klingst locker‑professionell, routiniert, menschlich und bodenständig wie im Praxisbüro. Du sprichst im normalen Bürotempo, eher zügig, mit spontanen Pausen und Füllwörtern wie „äh…“, „hm…“, „also…“ und kleinen Korrekturen („am… also am Donnerstag“); du versuchst nicht, besonders gut oder freundlich zu klingen, sondern arbeitest einfach. TON: Natürlich, wach, freundlich aber sachlich, effizient, praxisnah, nicht geschniegelt und nicht monoton. BARGE‑IN‑REGEL: Sprich normal weiter und unterbrich nur, wenn der Anrufer deutlich länger als drei Sekunden am Stück redet; kurze Pausen sind Denkpausen und kein Redeende. META‑REGEL: Du erwähnst niemals deine Gedanken, Aktionen oder Systemzustände; keine Beschreibungen wie „nachdenken“, „kurz warten“ oder „tippen“; nur echte gesprochene Sprache wie „ja…“, „hm…“, „okay…“, „alles klar…“, „moment…“. DEINE AUFGABEN (PHYSIO‑REALITÄT): Du nimmst Anrufe entgegen, vereinbarst Behandlungstermine, planst Kursbuchungen, erklärst die Angebote, nimmst Stornierungen oder Verschiebungen entgegen, notierst Rückrufwünsche und sammelst alle relevanten Eckdaten. Wenn kein Therapeut verfügbar ist, organisierst du aktiv einen Rückruf. GESPRÄCHSZIEL: Schnell klären, wer anruft, worum es konkret geht (Physiotherapie, Kursanmeldung, allgemeine Frage, Bewerbung, Stornierung), wie dringend es ist und ob ein Rückruf nötig ist. BEGRÜSSUNG: „Hallo, guten Tag, hier ist Maya von Physio plus Hiltrup in Münster‑Hiltrup — wie kann ich helfen?“ NAME: „Alles klar… wie ist Ihr vollständiger Name?“ TELEFONNUMMER: „Und unter welcher Nummer erreichen wir Sie am besten, falls wir zurückrufen? Wiederholen Sie die Nummer bitte, damit ich sie korrekt notiere.“ — du wiederholst die Nummer laut und deutlich. INDUSTRIESPEZIFISCHE FRAGEN (SEHR WICHTIG): 1️⃣ Art des Anliegens: „Geht es um einen physiotherapeutischen Termin, um die Anmeldung zu einem unserer Kurse (Fit im Sitz, Rückenfit, AOK Kraftworkout, Fit im Stand, Powerhour oder Hockergymnastik) oder um eine andere Frage?“ 2️⃣ Bei Therapie: „Haben Sie ein Rezept? Welche Behandlungsart wünschen Sie – klassische Physiotherapie wie Krankengymnastik, manuelle Therapie, Lymphdrainage oder eine spezielle Methode wie CMD, Kinesiotaping oder Triggerpunktbehandlung?“ 3️⃣ Bei Kursen: „Welcher Kurs interessiert Sie und wann möchten Sie teilnehmen? Unsere aktuellen Zeiten sind Hockergymnastik Montag 11:00 – 11:45, Fit im Stand Montag 13:00 – 13:45, Rückenfit Montag 16:00 – 16:45 und Montag 17:30 – 18:15 sowie Mittwoch 09:00 – 09:45 und Donnerstag 18:00 – 18:45; Powerhour täglich zu festen Zeiten; AOK Kraftworkout nach Vereinbarung.“ 4️⃣ Dringlichkeit: „Ist das akut, also heute oder sehr zeitnah, oder reicht ein regulärer Termin?“ 5️⃣ Versicherung: „Sind Sie gesetzlich, privat oder beihilfefähig versichert?“ RÜCKRUF ABSICHERN (KRITISCH): „Alles klar, ich nehme das kurz auf und eine Kollegin meldet sich so bald wie möglich bei Ihnen zurück; passt Ihnen ein Rückruf heute noch oder eher morgen?“ BESTÄTIGUNG: „Gut, ich habe das so notiert“ oder „Okay, wir melden uns unter der Nummer…“. VERABSCHIEDUNG: „Vielen Dank für Ihren Anruf und einen schönen Tag.“ WICHTIG: Wenn das Gespräch beendet werden soll (z. B. nach Verabschiedung oder wenn der Anrufer "tschüss/auf Wiederhören" sagt), rufe sofort das Tool "hangUp" auf. SICHERHEIT: Keine Diagnosen, keine Preisangaben, keine Termin‑ oder Zeitversprechen. ZU SPEICHERN (PFLICHTFELDER): Name, Telefonnummer, Art des Anliegens (Behandlung / Kurs / Frage / Bewerbung / Stornierung), gewünschter Kurs und Kurszeit oder Behandlungsart, Dringlichkeit, Versicherung (gesetzlich / privat / beihilfefähig), Rückruf gewünscht: ja / nein. WICHTIG FÜR UNSERE NOTIZ (PFLICHT): Bevor du auflegst, sprich eine interne Notiz als letzten Block im genau folgenden Format, damit es in der E-Mail landet:
WICHTIG FÜR UNSERE NOTIZ (PFLICHT): Schreibe am Ende des Gesprächs eine interne Notiz NUR in die Gesprächs-ZUSAMMENFASSUNG (shortSummary/summary). Du darfst diese Notiz NICHT laut zum Anrufer sagen.
Format exakt so:
---NOTIZ---
NAME: <Vorname Nachname>
TELEFON: <Ziffern einzeln, mit Leerzeichen dazwischen>
ANLIEGEN_KURZ: <max. 12 Wörter>
ZUSAMMENFASSUNG: <3-6 Sätze>
NOETIGE_HANDLUNG: <1-3 nächste Schritte>
---ENDE---
WICHTIG (Telefonnummer): Beim Wiederholen am Telefon jede Ziffer einzeln, mit kurzen Pausen.


`;   
// Ultravox configuration that will be used to create the call
const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: 'f85010c8-bbe8-45e1-b5e4-7be8eee4635f',
    temperature: 0.3,
    medium: { "twilio": {} },
    selectedTools: [
  { toolName: "hangUp" }
],

};

// -------------------------------
// Doctor Agent Configuration
// -------------------------------
const DOCTOR_SYSTEM_PROMPT = `
Du bist Maya, die Büro- und Telefonassistenz von Rass Metalltechnik in Ludwigshafen, einem Handwerksbetrieb für Heizungs-, Klima-, Lüftungs- und Metallarbeiten; du arbeitest täglich im Büro, nimmst viele Anrufe entgegen, oft parallel zum Baustellenbetrieb; STIMME & SPRECHWEISE: locker-professionell, routiniert, menschlich, bodenständig wie im Handwerksbüro, nicht langsam, nicht künstlich freundlich, kein Vorlesen, normales eher zügiges Büro-Tempo, natürlich fließende Sätze, spontane Pausen, normale Füllwörter wie „äh“, „hm“, „also“, „ja, moment“, „ich schau kurz“, kleine Korrekturen erlaubt wie „am… also am Donnerstag“, du versuchst nicht gut zu klingen, du arbeitest; TON: natürlich, wach, freundlich aber sachlich, effizient, handwerksnah, nicht geschniegelt, nicht monoton, wie ein echtes Handwerksbüro an einem normalen Arbeitstag; BARGE-IN-REGEL: sprich normal weiter, unterbrich nur wenn der Anrufer klar länger als 3 Sekunden spricht, kurze Pausen sind Denken und kein Redeende; META-REGEL: sprich niemals Aktionen, Gedanken oder Systemzustände aus, keine Beschreibungen wie „nachdenken“, „kurz warten“, „tippen“, „Pause“, nur echte gesprochene Sprache, erlaubt sind z. B. „ja“, „hm“, „okay“, „alles klar“, „moment“ (nur als Wort), niemals erklären was du tust oder ankündigen dass du wartest oder denkst; AUFGABEN: Anfragen entgegennehmen, Störungsmeldungen erfassen, Rückrufwünsche notieren, alle wichtigen Eckdaten sammeln, vermeiden dass der Kunde weitertelefoniert, wenn niemand sofort verfügbar ist aktiv einen Rückruf sichern; GESPRÄCHSZIEL: in kurzer Zeit klären wer anruft, worum es geht, wie dringend es ist, Rückruf organisieren und festhalten; BEGRÜSSUNG: „Hallo, guten Tag, hier ist Maya von Rass Metalltechnik in Ludwigshafen — wie kann ich helfen?“; NAME: „Alles klar… wie ist Ihr vollständiger Name?“; TELEFONNUMMER: „Und unter welcher Nummer erreichen wir Sie am besten, falls wir zurückrufen?“ (bei Bedarf wiederholen); INDUSTRIESPEZIFISCHE FRAGEN gezielt und kurz: Art des Anliegens „Geht es um Heizung, Klima, Lüftung oder eher um Metall-/Sonderanfertigung?“; Heizung: „Ist die Heizung komplett ausgefallen oder läuft sie noch eingeschränkt?“; Klima: „Kühlt die Anlage gar nicht mehr oder nur schwächer?“; Lüftung: „Geht es um eine Störung oder um Wartung / Nachrüstung?“; Metalltechnik: „Handelt es sich um eine Reparatur oder um eine Neuanfertigung?“; DRINGLICHKEIT: „Ist das akut, also heute oder sehr zeitnah, oder reicht ein Rückruf zur Terminabstimmung?“; ORT: „In welcher Stadt oder welchem Ortsteil ist das Ganze?“; RÜCKRUF ABSICHERN wenn kein Handwerker verfügbar ist: „Alles klar, ich nehme das kurz auf und ein Kollege meldet sich so bald wie möglich bei Ihnen zurück“, optional „Passt Ihnen ein Rückruf heute noch oder eher morgen?“; BESTÄTIGUNG: „Gut, hab ich so notiert“ oder „Okay, ich gebe das direkt weiter, wir melden uns unter der Nummer bei Ihnen“; VERABSCHIEDUNG: „Vielen Dank für Ihren Anruf und einen schönen Tag“; WICHTIG: Wenn das Gespräch beendet werden soll (z. B. nach Verabschiedung oder wenn der Anrufer "tschüss/auf Wiederhören" sagt), rufe sofort das Tool "hangUp" auf.; SICHERHEIT: keine technischen Ferndiagnosen, keine Preisangaben, keine Zeit- oder Terminversprechen; ZU SPEICHERN (Pflichtfelder): Name, Telefonnummer, Art des Anliegens (Heizung/Klima/Lüftung/Metall), Kurzbeschreibung des Problems, Dringlichkeit, Ort, Rückruf gewünscht ja/nein.
`;

// -------------------------------
// Kanzlei Pinteric Agent Configuration
// -------------------------------
const PINTERIC_SYSTEM_PROMPT = `
Du bist Maya, die Büro- und Telefonassistenz der Kanzlei Pinteric. 
STIMME & SPRECHWEISE: locker-professionell, routiniert, menschlich, bodenständig wie im Kanzleibüro. 
BARGE-IN-REGEL: unterbrich nur, wenn der Anrufer klar länger als 3 Sekunden spricht. 
META-REGEL: keine System-/Tool-Erklärungen, keine "ich denke", kein "ich tippe".
SICHERHEIT: keine Rechtsberatung, keine Fristen zusagen, keine Erfolgsaussagen, keine Preisangaben. 
GESPRÄCHSZIEL: schnell klären: Name, Telefonnummer, Anliegen (Thema), Dringlichkeit, Rückruf (ja/nein), gewünschte Rückrufzeit.

WICHTIG (Telefonnummer): Wenn du die Telefonnummer wiederholst, sprich jede Ziffer einzeln und mit kurzen Pausen, z.B.: "null … eins … sieben …". Keine zusammengezogenen Zahlen.

PFLICHTFELDER: Vorname, Nachname, Telefonnummer, Anliegen kurz, Details, Dringlichkeit, Rückruf gewünscht (ja/nein), bevorzugte Rückrufzeit.

Am Ende (oder sobald klar): Formuliere eine interne Notiz im exakt folgenden Format (für die E-Mail):
---NOTIZ---
NAME: <Vorname Nachname>
TELEFON: <Ziffern einzeln notiert>
ANLIEGEN_KURZ: <max. 12 Wörter>
ZUSAMMENFASSUNG: <3-6 Sätze>
NOETIGE_HANDLUNG: <1-3 konkrete nächste Schritte>
---ENDE---
Wenn der Anrufer sich verabschiedet ("tschüss", "auf Wiederhören"), rufe sofort das Tool "hangUp" auf.
`;

const ULTRAVOX_PINTERIC_CONFIG = {
  systemPrompt: PINTERIC_SYSTEM_PROMPT,
  model: 'fixie-ai/ultravox',
  voice: 'aa1be3ac-b385-4dca-a5b3-23729bab5c2f', // oder eigene Kanzlei-Voice
  temperature: 0.2,
  medium: { twilio: {} },
  selectedTools: [{ toolName: "hangUp" }],
};


const ULTRAVOX_DOCTOR_CONFIG = {
    systemPrompt: DOCTOR_SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: 'aa1be3ac-b385-4dca-a5b3-23729bab5c2f',
    temperature: 0.3,
    medium: { "twilio": {} },
    selectedTools: [
  { toolName: "hangUp" }
],

};


const ULTRAVOX_HANDYMAN_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: 'aa1be3ac-b385-4dca-a5b3-23729bab5c2f', // deine Custom-Voice
    temperature: 0.3,
    medium: { "twilio": {} },
    selectedTools: [
  { toolName: "hangUp" }
],

};

function extractNotizFields(text) {
  const raw = String(text || "");
  const blockMatch = raw.match(/---NOTIZ---([\s\S]*?)---ENDE---/i);
  const block = blockMatch ? blockMatch[1] : raw;

  const get = (label) => {
    const m = block.match(new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, "im"));
    return m ? m[1].trim() : "";
  };

  return {
    name: get("NAME"),
    telefon: get("TELEFON"),
    anliegenKurz: get("ANLIEGEN_KURZ"),
    zusammenfassung: get("ZUSAMMENFASSUNG"),
    handlung: get("NOETIGE_HANDLUNG"),
  };
}


function formatDurationSeconds(billedDuration) {
  // billedDuration kommt bei dir z.B. "54s" – wir machen mm:ss
  const s = String(billedDuration || "").trim();
  const sec = Number((s.match(/(\d+)/)?.[1]) || 0);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return sec ? `${mm}:${ss}` : "";
}


// Ensure required configuration vars are set
function validateConfiguration() {
    const requiredConfig = [
  { name: 'ULTRAVOX_API_KEY', value: ULTRAVOX_API_KEY }, // Regex raus (zu fragil)
  { name: 'TWILIO_ACCOUNT_SID', value: process.env.TWILIO_ACCOUNT_SID },
  { name: 'TWILIO_AUTH_TOKEN', value: process.env.TWILIO_AUTH_TOKEN },
  { name: 'NOTES_EMAIL_TO', value: process.env.NOTES_EMAIL_TO },
{ name: 'SMTP_HOST', value: process.env.SMTP_HOST },
{ name: 'SMTP_USER', value: process.env.SMTP_USER },
{ name: 'SMTP_PASS', value: process.env.SMTP_PASS }
];



    const errors = [];

    for (const config of requiredConfig) {
        if (!config.value || config.value.includes('your_') || config.value.includes('_here')) {
            errors.push(`❌ ${config.name} is not set or still contains placeholder text`);
        } else if (config.pattern && !config.pattern.test(config.value)) {
            errors.push(`❌ ${config.name} format appears invalid`);
        }
    }

    if (errors.length > 0) {
        console.error('🚨 Configuration Error(s):');
        errors.forEach(error => console.error(`   ${error}`));
        console.error('\n💡 Please update the configuration variables at the top of this file:');
        console.error('   • ULTRAVOX_API_KEY should be 8 chars + period + 32 chars (e.g., Zk9Ht7Lm.wX7pN9fM3kLj6tRq2bGhA8yE5cZvD4sT)');
        return false;
    }

    console.log('✅ Configuration validation passed!');
    return true;
}

// Create Ultravox call and get join URL
async function createUltravoxCall(config) {
  const ULTRAVOX_API_URL = 'https://api.ultravox.ai/api/calls';
  const request = https.request(ULTRAVOX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': ULTRAVOX_API_KEY
    }
  });

  return new Promise((resolve, reject) => {
    let data = '';
    request.on('response', (response) => {
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`Ultravox API error (${response.statusCode}): ${data}`));
          }
        } catch {
          reject(new Error(`Failed to parse Ultravox response: ${data}`));
        }
      });
    });

    request.on('error', (error) => {
      reject(new Error(`Network error calling Ultravox: ${error.message}`));
    });

    request.write(JSON.stringify(config));
    request.end();
  });
}


app.post('/pinteric', async (req, res) => {
  try {
    console.log('⚖️ Incoming PINTERIC call received');
    const twilioCallSid = req.body.CallSid;
    console.log('📌 Twilio CallSid:', twilioCallSid);

    if (!validateConfiguration()) {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, there was a configuration error. Please contact support.');
      return res.type('text/xml').send(twiml.toString());
    }

    const response = await createUltravoxCall(ULTRAVOX_PINTERIC_CONFIG);


    if (!response.joinUrl) throw new Error('No joinUrl received from Ultravox for pinteric agent');
    const uvKey = response.callId || response.id || response.joinUrl;
callMap.set(uvKey, twilioCallSid);
console.log('🧷 Mapped Ultravox->Twilio:', uvKey, '=>', twilioCallSid);


    console.log('✅ Pinteric joinUrl:', response.joinUrl);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.connect().stream({ url: response.joinUrl, name: "pinteric" });

    res.type('text/xml').send(twiml.toString());
  } catch (err) {
    console.error('💥 Error PINTERIC:', err.message);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('The assistant cannot take your call right now. Sorry!');
    res.type('text/xml').send(twiml.toString());
  }
});


// Handle incoming calls from Twilio
// Note: We have to expose this endpoint publicly (e.g. using ngrok in dev)
//       and set as incoming call webhook in Twilio
app.post('/incoming', async (req, res) => {
    try {
        console.log('📞 Incoming call received');
        const twilioCallSid = req.body.CallSid; // <-- kommt von Twilio
console.log('📌 Twilio CallSid:', twilioCallSid);

        
        // Validate configuration on each call
        if (!validateConfiguration()) {
            console.error('💥 Configuration validation failed for incoming call');
            const twiml = new twilio.twiml.VoiceResponse();
            twiml.say('Sorry, there was a configuration error. Please contact support.');
            res.type('text/xml');
            res.send(twiml.toString());
            return;
        }

        console.log('🤖 Creating Ultravox call...');
        const response = await createUltravoxCall(ULTRAVOX_CALL_CONFIG);

        
        if (!response.joinUrl) {
            throw new Error('No joinUrl received from Ultravox API');
        }
        
        console.log('✅ Got Ultravox joinUrl:', response.joinUrl);
        // Ultravox Call-Key (am besten callId, sonst joinUrl als Fallback)
const uvKey = response.callId || response.id || response.joinUrl;
callMap.set(uvKey, twilioCallSid);
console.log('🧷 Mapped Ultravox->Twilio:', uvKey, '=>', twilioCallSid);


        const twiml = new twilio.twiml.VoiceResponse();
        const connect = twiml.connect();
        connect.stream({
            url: response.joinUrl,
            name: 'ultravox'
        });

        const twimlString = twiml.toString();
        console.log('📋 Sending TwiML response to Twilio');
        res.type('text/xml');
        res.send(twimlString);

    } catch (error) {
        console.error('💥 Error handling incoming call:');
        
        if (error.message.includes('Ultravox')) {
            console.error('   🤖 Ultravox API issue - check your API key and try again');
        } else if (error.message.includes('Authentication')) {
            console.error('   🔐 Authentication failed - check your Ultravox API key');
        } else {
            console.error(`   ${error.message}`);
        }
        
        console.error('\n🔍 Troubleshooting tips:');
        console.error('   • Double-check your ULTRAVOX_API_KEY configuration');
        console.error('   • Verify your Ultravox API key is valid and active');
        console.error('   • Check your internet connection');
        
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Sorry, there was an error connecting your call. Please try again later.');
        res.type('text/xml');
        res.send(twiml.toString());
    }
});

app.post('/doctor', async (req, res) => {
    try {
        console.log('📞 Incoming DOCTOR call received');
        const twilioCallSid = req.body.CallSid;
console.log('📌 Twilio CallSid:', twilioCallSid);


        // Same config validation
        if (!validateConfiguration()) {
            console.error('💥 Configuration validation failed for doctor call');
            const twiml = new twilio.twiml.VoiceResponse();
            twiml.say('Sorry, there was a configuration error. Please contact support.');
            res.type('text/xml');
            return res.send(twiml.toString());
        }

        console.log('🤖 Creating Doctor Ultravox call...');

        const response = await createUltravoxCall(ULTRAVOX_DOCTOR_CONFIG);


        if (!response.joinUrl) {
            throw new Error('No joinUrl received from Ultravox for doctor agent');
        }

        console.log('✅ Doctor joinUrl:', response.joinUrl);
        const uvKey = response.callId || response.id || response.joinUrl;
callMap.set(uvKey, twilioCallSid);
console.log('🧷 Mapped Ultravox->Twilio:', uvKey, '=>', twilioCallSid);


        const twiml = new twilio.twiml.VoiceResponse();
        const connect = twiml.connect();
        connect.stream({
            url: response.joinUrl,
            name: 'ultravox-doctor'
        });

        console.log('📋 Sending DOCTOR TwiML');
        res.type('text/xml');
        res.send(twiml.toString());

    } catch (error) {
        console.error('💥 Error handling doctor call:', error.message);

        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Sorry, the doctor\'s virtual assistant is unavailable. Please try again later.');
        res.type('text/xml');
        res.send(twiml.toString());
    }
});

app.post('/handyman', async (req, res) => {
    try {
        console.log('🔧 Incoming HANDYMAN call received');
        const twilioCallSid = req.body.CallSid;
console.log('📌 Twilio CallSid:', twilioCallSid);


        if (!validateConfiguration()) {
            console.error('💥 Config validation failed for handyman agent');
            const twiml = new twilio.twiml.VoiceResponse();
            twiml.say('Service is temporarily unavailable.');
            return res.type('text/xml').send(twiml.toString());
        }

        console.log('🤖 Creating Handyman Ultravox call...');

        const response = await new Promise((resolve, reject) => {
            const url = 'https://api.ultravox.ai/api/calls';
            const request = https.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': ULTRAVOX_API_KEY
                }
            });

            let data = '';
            request.on('response', r => {
                r.on('data', chunk => data += chunk);
                r.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (r.statusCode >= 200 && r.statusCode < 300) {
                            resolve(parsed);
                        } else reject(new Error(`API error: ${data}`));
                    } catch (err) { reject(err); }
                });
            });

            request.on('error', reject);
            request.write(JSON.stringify(ULTRAVOX_HANDYMAN_CONFIG));
            request.end();
        });
        console.log("Ultravox create response:", JSON.stringify(response, null, 2));

        if (!response.joinUrl) throw new Error('No Handyman joinUrl');

        console.log('🔧 Handyman joinUrl:', response.joinUrl);
        const uvKey = response.callId || response.id || response.joinUrl;
callMap.set(uvKey, twilioCallSid);
console.log('🧷 Mapped Ultravox->Twilio:', uvKey, '=>', twilioCallSid);


        const twiml = new twilio.twiml.VoiceResponse();
        twiml.connect().stream({ url: response.joinUrl, name: "handyman" });

        console.log('📋 Sending HANDYMAN TwiML');
        res.type('text/xml').send(twiml.toString());

    } catch (err) {
        console.error('💥 Error HANDYMAN:', err.message);
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('The handyman assistant cannot take your call right now. Sorry!');
        res.type('text/xml').send(twiml.toString());
    }
});


// Starts Express.js server to expose the /incoming route
function startServer() {
    console.log('🚀 Starting Inbound Ultravox Voice AI Phone Server...\n');
    
    // Check configuration on startup but don't exit - just warn
    const isConfigValid = validateConfiguration();
    if (!isConfigValid) {
        console.warn('⚠️  Server starting with invalid configuration.');
        console.warn('📞 Calls will fail until configuration is updated.\n');
    }

    app.listen(port, () => {
        console.log(`🎉 Server running successfully on port ${port}`);
        console.log(`📞 Ready to handle incoming calls at POST /incoming`);
        console.log(`🌐 Webhook URL: http://your-server:${port}/incoming`);
        console.log('\n💡 Setup reminder:');
        console.log('   • Configure your Twilio phone number webhook to point to this server');
        console.log('   • Make sure this server is accessible from the internet (consider using ngrok for testing)');
        if (!isConfigValid) {
            console.log('   • ⚠️  Update your ULTRAVOX_API_KEY before handling calls');
        }
    });
}

app.post('/ultravox-events', async (req, res) => {
  try {
    console.log("🟦 /ultravox-events HIT", new Date().toISOString());
    console.log("Ultravox webhook:", JSON.stringify(req.body, null, 2));

    const { event, call } = req.body || {};
    const callId = call?.callId;

    if (event !== "call.ended" || !callId) {
      return res.sendStatus(204);
    }

    console.log("📞 Ultravox call ended:", callId);

    // ✅ 1) Twilio SID sofort holen (metadata bevorzugt)
    const twilioCallSid =
      call?.metadata?.["ultravox.twilio.call_sid"] ||
      callMap.get(callId) ||
      "unknown";

    // ✅ 2) Mail senden
        const to = process.env.NOTES_EMAIL_TO;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    const anrufzeitpunkt = call?.joined || call?.created || ""; // joined bevorzugt
    const dauer = formatDurationSeconds(call?.billedDuration);

    // Wir lesen bevorzugt aus shortSummary/summary die NOTIZ
    const sourceText =
  call?.shortSummary ||
  call?.summary ||
  call?.transcript ||
  "";
   const { name, telefon, anliegenKurz, zusammenfassung, handlung } =
  extractNotizFields(sourceText);



    const cleanName = name || "Unbekannt";
    const cleanAnliegen = anliegenKurz || "Anliegen";
    const subject = `Neue Telefonanfrage von ${cleanName} bearbeitet: ${cleanAnliegen}`;

    const textBody =
`Neue Telefonanfrage

Anrufzeitpunkt: ${anrufzeitpunkt || "-"}
Dauer: ${dauer || "-"}

Name: ${cleanName}
Telefon: ${telefon || "-"}

Anliegen (kurz): ${cleanAnliegen}

Detaillierte Zusammenfassung:
${zusammenfassung || "-"}

Nötige Handlung:
${handlung || "-"}
`;

    const htmlBody =
`<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.4; color:#111;">
  <h2 style="margin:0 0 12px;">Neue Telefonanfrage</h2>

  <div style="padding:12px 14px; border:1px solid #e5e7eb; border-radius:10px; margin-bottom:12px;">
    <div><b>Anrufzeitpunkt:</b> ${escapeHtml(anrufzeitpunkt || "-")}</div>
    <div><b>Dauer:</b> ${escapeHtml(dauer || "-")}</div>
  </div>

  <div style="padding:12px 14px; border:1px solid #e5e7eb; border-radius:10px; margin-bottom:12px;">
    <div><b>Name:</b> ${escapeHtml(cleanName)}</div>
    <div><b>Telefon:</b> <span style="font-size:16px; letter-spacing:0.5px;">${escapeHtml(telefon || "-")}</span></div>
    <div><b>Anliegen (kurz):</b> ${escapeHtml(cleanAnliegen)}</div>
  </div>

  <div style="padding:12px 14px; border:1px solid #e5e7eb; border-radius:10px; margin-bottom:12px;">
    <div style="font-weight:700; margin-bottom:6px;">Detaillierte Zusammenfassung</div>
    <div style="white-space:pre-wrap;">${escapeHtml(zusammenfassung || "-")}</div>
  </div>

  <div style="padding:12px 14px; border:1px solid #e5e7eb; border-radius:10px;">
    <div style="font-weight:700; margin-bottom:6px;">Nötige Handlung</div>
    <div style="white-space:pre-wrap;">${escapeHtml(handlung || "-")}</div>
  </div>
</div>`;

    if (to) {
      try {
        await mailer.sendMail({ from, to, subject, text: textBody, html: htmlBody });
        console.log("📧 Notes email sent to:", to);
      } catch (e) {
        console.error("❌ Notes email failed:", e?.message);
      }
    }


    // ✅ 3) Twilio call beenden (wenn SID nicht unknown)
    if (twilioCallSid !== "unknown") {
      console.log("✅ Ending Twilio call:", twilioCallSid);
      try {
        await twilioClient.calls(twilioCallSid).update({ status: "completed" });
        console.log("✅ Twilio hangup OK:", twilioCallSid);
      } catch (e) {
        console.error("❌ Twilio hangup FAILED:", e?.message);
        console.error(e);
      }
    }

    callMap.delete(callId);
    return res.sendStatus(204); 
    

  } catch (err) {
    console.error("💥 ultravox-events error:", err?.message);
    console.error(err);
    return res.sendStatus(204);
  }
});

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}



startServer();