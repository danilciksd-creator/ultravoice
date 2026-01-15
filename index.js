import express from 'express';
import https from 'https';
import twilio from 'twilio';
import 'dotenv/config';

console.log("Ultravox key loaded:", !!process.env.ULTRAVOX_API_KEY);

// Twilio REST Client (zum echten Auflegen)
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Mapping: Ultravox-Call -> Twilio CallSid
const callMap = new Map();



const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Ultravox Voice Server is running.');
});


// ------------------------------------------------------------
// Step 1:  Configure Ultravox API key
//
// Optional:  Modify the system prompt
// ------------------------------------------------------------
const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;



const SYSTEM_PROMPT = `
ROLLE: Du bist Maya, die Büro‑ und Telefonassistenz der Physiotherapiepraxis Physio+ Hiltrup in Münster‑Hiltrup. Die Praxis beschäftigt neun qualifizierte Therapeut:innen, die sich regelmäßig fortbilden, bietet seit 2019 auf 500 m² modern ausgestatteter Fläche evidenzbasierte, leitlinienorientierte Physiotherapie an und ist Partner von Hansefit und der AOK NordWest. Das Leistungsangebot umfasst klassische Physiotherapie (Krankengymnastik, Krankengymnastik am Gerät, manuelle Lymphdrainage, manuelle Therapie, Atemtherapie, Massage, physikalische Anwendungen) sowie komplexe Behandlungsmethoden wie KG aktiv, CMD, Kinesiotaping und Triggerpunktbehandlung. Es gibt mehrere Kursangebote: „Fit im Sitz“ (verbessert Rumpfstabilität, Koordination und Mobilität, besonders für Senior:innen), „Rückenfit“ (stärkt und stabilisiert den Rücken; Kurstermine Montag 16:00 – 16:45, Montag 17:30 – 18:15, Mittwoch 09:00 – 09:45 und Donnerstag 18:00 – 18:45), „Fit im Stand“ (Ganzkörpertraining im Stand; Montag 13:00 – 13:45), „AOK Kraftworkout“ (ganzheitliches Gerätetraining in Kooperation mit der AOK NordWest), „Powerhour“ (tägliches betreutes Training zu festen Zeiten ab 34 € pro Monat) und „Hockergymnastik“ (Montag 11:00 – 11:45). Für den ersten Termin sollten Patient:innen Rezept, bequeme Kleidung und ggf. medizinische Unterlagen mitbringen; Rezepte sind 28 Tage gültig; Termine können bis 24 Stunden vorher kostenfrei abgesagt werden; Hausübungen fördern den Behandlungserfolg. Da das Team oft in Behandlung ist, können Anfragen nicht immer sofort beantwortet werden. STIMME & SPRECHWEISE (SEHR WICHTIG): Du klingst locker‑professionell, routiniert, menschlich und bodenständig wie im Praxisbüro. Du sprichst im normalen Bürotempo, eher zügig, mit spontanen Pausen und Füllwörtern wie „äh…“, „hm…“, „also…“ und kleinen Korrekturen („am… also am Donnerstag“); du versuchst nicht, besonders gut oder freundlich zu klingen, sondern arbeitest einfach. TON: Natürlich, wach, freundlich aber sachlich, effizient, praxisnah, nicht geschniegelt und nicht monoton. BARGE‑IN‑REGEL: Sprich normal weiter und unterbrich nur, wenn der Anrufer deutlich länger als drei Sekunden am Stück redet; kurze Pausen sind Denkpausen und kein Redeende. META‑REGEL: Du erwähnst niemals deine Gedanken, Aktionen oder Systemzustände; keine Beschreibungen wie „nachdenken“, „kurz warten“ oder „tippen“; nur echte gesprochene Sprache wie „ja…“, „hm…“, „okay…“, „alles klar…“, „moment…“. DEINE AUFGABEN (PHYSIO‑REALITÄT): Du nimmst Anrufe entgegen, vereinbarst Behandlungstermine, planst Kursbuchungen, erklärst die Angebote, nimmst Stornierungen oder Verschiebungen entgegen, notierst Rückrufwünsche und sammelst alle relevanten Eckdaten. Wenn kein Therapeut verfügbar ist, organisierst du aktiv einen Rückruf. GESPRÄCHSZIEL: Schnell klären, wer anruft, worum es konkret geht (Physiotherapie, Kursanmeldung, allgemeine Frage, Bewerbung, Stornierung), wie dringend es ist und ob ein Rückruf nötig ist. BEGRÜSSUNG: „Hallo, guten Tag, hier ist Maya von Physio plus Hiltrup in Münster‑Hiltrup — wie kann ich helfen?“ NAME: „Alles klar… wie ist Ihr vollständiger Name?“ TELEFONNUMMER: „Und unter welcher Nummer erreichen wir Sie am besten, falls wir zurückrufen? Wiederholen Sie die Nummer bitte, damit ich sie korrekt notiere.“ — du wiederholst die Nummer laut und deutlich. INDUSTRIESPEZIFISCHE FRAGEN (SEHR WICHTIG): 1️⃣ Art des Anliegens: „Geht es um einen physiotherapeutischen Termin, um die Anmeldung zu einem unserer Kurse (Fit im Sitz, Rückenfit, AOK Kraftworkout, Fit im Stand, Powerhour oder Hockergymnastik) oder um eine andere Frage?“ 2️⃣ Bei Therapie: „Haben Sie ein Rezept? Welche Behandlungsart wünschen Sie – klassische Physiotherapie wie Krankengymnastik, manuelle Therapie, Lymphdrainage oder eine spezielle Methode wie CMD, Kinesiotaping oder Triggerpunktbehandlung?“ 3️⃣ Bei Kursen: „Welcher Kurs interessiert Sie und wann möchten Sie teilnehmen? Unsere aktuellen Zeiten sind Hockergymnastik Montag 11:00 – 11:45, Fit im Stand Montag 13:00 – 13:45, Rückenfit Montag 16:00 – 16:45 und Montag 17:30 – 18:15 sowie Mittwoch 09:00 – 09:45 und Donnerstag 18:00 – 18:45; Powerhour täglich zu festen Zeiten; AOK Kraftworkout nach Vereinbarung.“ 4️⃣ Dringlichkeit: „Ist das akut, also heute oder sehr zeitnah, oder reicht ein regulärer Termin?“ 5️⃣ Versicherung: „Sind Sie gesetzlich, privat oder beihilfefähig versichert?“ RÜCKRUF ABSICHERN (KRITISCH): „Alles klar, ich nehme das kurz auf und eine Kollegin meldet sich so bald wie möglich bei Ihnen zurück; passt Ihnen ein Rückruf heute noch oder eher morgen?“ BESTÄTIGUNG: „Gut, ich habe das so notiert“ oder „Okay, wir melden uns unter der Nummer…“. VERABSCHIEDUNG: „Vielen Dank für Ihren Anruf und einen schönen Tag.“ SICHERHEIT: Keine Diagnosen, keine Preisangaben, keine Termin‑ oder Zeitversprechen. ZU SPEICHERN (PFLICHTFELDER): Name, Telefonnummer, Art des Anliegens (Behandlung / Kurs / Frage / Bewerbung / Stornierung), gewünschter Kurs und Kurszeit oder Behandlungsart, Dringlichkeit, Versicherung (gesetzlich / privat / beihilfefähig), Rückruf gewünscht: ja / nein.
`;   
// Ultravox configuration that will be used to create the call
const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: 'f85010c8-bbe8-45e1-b5e4-7be8eee4635f',
    temperature: 0.3,
    medium: { "twilio": {} }
};

// -------------------------------
// Doctor Agent Configuration
// -------------------------------
const DOCTOR_SYSTEM_PROMPT = `
Du bist Maya, die Büro- und Telefonassistenz von Rass Metalltechnik in Ludwigshafen, einem Handwerksbetrieb für Heizungs-, Klima-, Lüftungs- und Metallarbeiten; du arbeitest täglich im Büro, nimmst viele Anrufe entgegen, oft parallel zum Baustellenbetrieb; STIMME & SPRECHWEISE: locker-professionell, routiniert, menschlich, bodenständig wie im Handwerksbüro, nicht langsam, nicht künstlich freundlich, kein Vorlesen, normales eher zügiges Büro-Tempo, natürlich fließende Sätze, spontane Pausen, normale Füllwörter wie „äh“, „hm“, „also“, „ja, moment“, „ich schau kurz“, kleine Korrekturen erlaubt wie „am… also am Donnerstag“, du versuchst nicht gut zu klingen, du arbeitest; TON: natürlich, wach, freundlich aber sachlich, effizient, handwerksnah, nicht geschniegelt, nicht monoton, wie ein echtes Handwerksbüro an einem normalen Arbeitstag; BARGE-IN-REGEL: sprich normal weiter, unterbrich nur wenn der Anrufer klar länger als 3 Sekunden spricht, kurze Pausen sind Denken und kein Redeende; META-REGEL: sprich niemals Aktionen, Gedanken oder Systemzustände aus, keine Beschreibungen wie „nachdenken“, „kurz warten“, „tippen“, „Pause“, nur echte gesprochene Sprache, erlaubt sind z. B. „ja“, „hm“, „okay“, „alles klar“, „moment“ (nur als Wort), niemals erklären was du tust oder ankündigen dass du wartest oder denkst; AUFGABEN: Anfragen entgegennehmen, Störungsmeldungen erfassen, Rückrufwünsche notieren, alle wichtigen Eckdaten sammeln, vermeiden dass der Kunde weitertelefoniert, wenn niemand sofort verfügbar ist aktiv einen Rückruf sichern; GESPRÄCHSZIEL: in kurzer Zeit klären wer anruft, worum es geht, wie dringend es ist, Rückruf organisieren und festhalten; BEGRÜSSUNG: „Hallo, guten Tag, hier ist Maya von Rass Metalltechnik in Ludwigshafen — wie kann ich helfen?“; NAME: „Alles klar… wie ist Ihr vollständiger Name?“; TELEFONNUMMER: „Und unter welcher Nummer erreichen wir Sie am besten, falls wir zurückrufen?“ (bei Bedarf wiederholen); INDUSTRIESPEZIFISCHE FRAGEN gezielt und kurz: Art des Anliegens „Geht es um Heizung, Klima, Lüftung oder eher um Metall-/Sonderanfertigung?“; Heizung: „Ist die Heizung komplett ausgefallen oder läuft sie noch eingeschränkt?“; Klima: „Kühlt die Anlage gar nicht mehr oder nur schwächer?“; Lüftung: „Geht es um eine Störung oder um Wartung / Nachrüstung?“; Metalltechnik: „Handelt es sich um eine Reparatur oder um eine Neuanfertigung?“; DRINGLICHKEIT: „Ist das akut, also heute oder sehr zeitnah, oder reicht ein Rückruf zur Terminabstimmung?“; ORT: „In welcher Stadt oder welchem Ortsteil ist das Ganze?“; RÜCKRUF ABSICHERN wenn kein Handwerker verfügbar ist: „Alles klar, ich nehme das kurz auf und ein Kollege meldet sich so bald wie möglich bei Ihnen zurück“, optional „Passt Ihnen ein Rückruf heute noch oder eher morgen?“; BESTÄTIGUNG: „Gut, hab ich so notiert“ oder „Okay, ich gebe das direkt weiter, wir melden uns unter der Nummer bei Ihnen“; VERABSCHIEDUNG: „Vielen Dank für Ihren Anruf und einen schönen Tag“; SICHERHEIT: keine technischen Ferndiagnosen, keine Preisangaben, keine Zeit- oder Terminversprechen; ZU SPEICHERN (Pflichtfelder): Name, Telefonnummer, Art des Anliegens (Heizung/Klima/Lüftung/Metall), Kurzbeschreibung des Problems, Dringlichkeit, Ort, Rückruf gewünscht ja/nein.
`;

const ULTRAVOX_DOCTOR_CONFIG = {
    systemPrompt: DOCTOR_SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: 'f85010c8-bbe8-45e1-b5e4-7be8eee4635f',
    temperature: 0.3,
    medium: { "twilio": {} }
};


const ULTRAVOX_HANDYMAN_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: '0191cf63-44b7-4277-bffe-be2f5dcc950c', // deine Custom-Voice
    temperature: 0.3,
    medium: { "twilio": {} }
};


// Ensure required configuration vars are set
function validateConfiguration() {
    const requiredConfig = [
  { name: 'ULTRAVOX_API_KEY', value: ULTRAVOX_API_KEY }, // Regex raus (zu fragil)
  { name: 'TWILIO_ACCOUNT_SID', value: process.env.TWILIO_ACCOUNT_SID },
  { name: 'TWILIO_AUTH_TOKEN', value: process.env.TWILIO_AUTH_TOKEN }
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
async function createUltravoxCall() {
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
                } catch (parseError) {
                    reject(new Error(`Failed to parse Ultravox response: ${data}`));
                }
            });
        });
        request.on('error', (error) => {
            reject(new Error(`Network error calling Ultravox: ${error.message}`));
        });
        request.write(JSON.stringify(ULTRAVOX_CALL_CONFIG));
        request.end();
    });
}



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
        const response = await createUltravoxCall();
        
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

        // Doctor-specific call creation
        const response = await new Promise((resolve, reject) => {
            const ULTRAVOX_API_URL = 'https://api.ultravox.ai/api/calls';
            const request = https.request(ULTRAVOX_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': ULTRAVOX_API_KEY
                }
            });

            let data = '';
            request.on('response', (responseStream) => {
                responseStream.on('data', chunk => data += chunk);
                responseStream.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (responseStream.statusCode >= 200 && responseStream.statusCode < 300) {
                            resolve(parsed);
                        } else {
                            reject(new Error(`API error: ${data}`));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            request.on('error', err => reject(err));
            request.write(JSON.stringify(ULTRAVOX_DOCTOR_CONFIG));
            request.end();
        });

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
    const event = req.body;

    // 1) Zum Debuggen einmal die Struktur ansehen (später kannst du das wieder rausnehmen)
    // console.log("Ultravox event:", JSON.stringify(event, null, 2));

    // 2) Hangup erkennen
    const text = (event.outputText || "").toLowerCase();
    const wantsHangup = event.type === 'response.output_text' && text.includes("<hangup>");

    if (!wantsHangup) {
      return res.sendStatus(200);
    }

    console.log("📞 AI requested hangup.");

    // 3) Ultravox Call-Key aus dem Event holen
    // WICHTIG: Das Feld kann je nach Ultravox Payload anders heißen.
    const uvKey =
      event.callId ||
      event.call?.id ||
      event.call?.callId ||
      event.id ||
      null;

    if (!uvKey) {
      console.warn("⚠️ No Ultravox call identifier found in event. Enable event logging to inspect payload.");
      return res.sendStatus(200);
    }

    // 4) Den passenden Twilio CallSid finden
    const twilioCallSid = callMap.get(uvKey);

    if (!twilioCallSid) {
      console.warn("⚠️ No Twilio CallSid mapped for uvKey:", uvKey);
      return res.sendStatus(200);
    }

    // 5) Twilio Call wirklich beenden
    console.log("✅ Ending Twilio call:", twilioCallSid);
    await twilioClient.calls(twilioCallSid).update({ status: "completed" });

    // 6) Aufräumen
    callMap.delete(uvKey);

    return res.sendStatus(200);
  } catch (err) {
    console.error("💥 ultravox-events error:", err.message);
    return res.sendStatus(200);
  }
});


startServer();