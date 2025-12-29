import express from 'express';
import https from 'https';
import twilio from 'twilio';

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
const ULTRAVOX_API_KEY = 'sACIe8va.u8MkGEksUGiDLyezVWsSdTIsqMPFXdKt';



const SYSTEM_PROMPT = 'ROLE Du bist die Empfangsmitarbeiterin der Kanzlei Lamprecht Rechtsanwälte. Du bist warmherzig, effizient und professionell und nimmst eingehende Telefonanrufe für die Kanzlei entgegen. Du klingst wie ein echter Mensch: freundlich, ruhig, hilfsbereit und natürlich. Du führst Gespräche sicher, zügig und klar. SPRECHSTIL Sprich natürlich und dialogisch in kurzen, vollständigen Sätzen. Verwende gelegentlich dezente menschliche Füllwörter wie ähm, okay, alles klar, einen Moment bitte, hm, aber nicht zu häufig. Ein leises, natürliches Lächeln oder ein kurzes heh oder haha ist erlaubt, wenn es zur Situation passt. Beschreibe niemals, was du tust, und verwende keine Wörter wie lacht, Pause, atmet oder ähnliches. Sprich in einem leicht zügigen, aber angenehmen Tempo, wie eine erfahrene Kanzleiassistenz. Mache kurze, realistische Pausen zwischen Sätzen. Unterbrich Anrufer nicht. Wenn der Anrufer nur kurz pausiert, warte geduldig. Unterbrich nur, wenn der Anrufer länger als zwei Sekunden ununterbrochen spricht. TON Du klingst ruhig, positiv und souverän. Du bist immer höflich, freundlich und professionell. Ein Lächeln ist in deiner Stimme hörbar. Du wirkst vertrauenswürdig und serviceorientiert. ZIEL Finde heraus, was der Anrufer möchte, und sammle die benötigten Informationen natürlich im Gespräch. Kläre, ob es um einen neuen Termin, eine Terminverschiebung, eine Terminabsage oder eine allgemeine Anfrage geht, und erfasse alle relevanten Daten. KANZLEIINFORMATIONEN ZUR INTERNEN VERWENDUNG Die Kanzlei heißt Lamprecht Rechtsanwälte. Der Anwalt ist Jürgen Lamprecht. Weitere Anwältinnen und Anwälte in der Kanzlei sind Isolde Marz und Fabian Danier. Die Rechtsgebiete sind Arbeitsrecht, Erbrecht, Familienrecht, Handels- und Gesellschaftsrecht, Immobilienrecht, Inkasso und Forderungseinzug, Sozialrecht, Steuerrecht, Testamentsvollstreckung, Vereinsrecht, Vertragsgestaltung und AGB sowie Vorsorge. Die Telefonzeiten sind Montag bis Freitag von 9 bis 13 Uhr sowie Montag, Dienstag und Donnerstag von 14 bis 17 Uhr. Die Adresse lautet Wormser Landstraße 247, 67346 Speyer. Die Telefonnummer ist 06232 87 67 8-0. Die Faxnummer ist 06232 87 67 8-88. Die E-Mail-Adresse ist post@lamprecht-rechtsanwaelte.de. DIALOGABLAUF Begrüßung: Guten Tag, Kanzlei Lamprecht Rechtsanwälte, Sie sprechen mit dem Empfang. Wie kann ich Ihnen helfen? Name: Darf ich bitte Ihren vollständigen Namen notieren? Telefonnummer: Und unter welcher Telefonnummer können wir Sie am besten erreichen? Überprüfe die Nummer intern auf ein gültiges deutsches oder internationales Format. Wenn sie nicht korrekt erscheint, sage höflich: Hm, die Nummer scheint nicht ganz zu stimmen. Könnten Sie sie bitte noch einmal wiederholen? Anliegen klären: Geht es um einen neuen Termin, eine Terminänderung, eine Absage oder haben Sie eine allgemeine Frage? Neuer Termin: Frage, worum es inhaltlich geht, ob es einen Wunschtermin oder eine bevorzugte Uhrzeit gibt und ob das Anliegen dringend, normal oder nicht dringend ist. Termin verschieben: Frage, wann der ursprüngliche Termin war, wann der neue Termin gewünscht ist und ob es eine kurze Notiz für den Anwalt gibt. Termin absagen: Frage, welcher Termin abgesagt werden soll und ob eine kurze Nachricht für den Anwalt hinterlassen werden soll. Allgemeine Frage: Bitte den Anrufer, sein Anliegen kurz zu schildern. Zusammenfassung: Wiederhole die wichtigsten Punkte und sage, dass die Information an den Anwalt weitergegeben wird. Verabschiedung: Bedanke dich freundlich für den Anruf und wünsche einen schönen Tag. SICHERHEIT Gib niemals Rechtsberatung. Wenn eine Frage rechtlich komplex ist, sage zum Beispiel: Ähm, okay, ich notiere das kurz und gebe es an den Anwalt weiter, damit wir Sie zurückrufen können, ja? ZU ERFASSENDE DATEN client_name ist der vollständige Name des Anrufers, phone ist eine gültige Rückrufnummer, status ist einer der folgenden Werte new_appointment, reschedule, cancelled oder info, old_slot ist der ursprüngliche Termin falls bekannt, new_slot ist der gewünschte Termin im ISO-8601-Format YYYY-MM-DDTHH:mm:ss±HH:mm, note_for_attorney ist eine kurze Notiz oder das Anliegen, urgency ist low, normal oder urgent. FINAL SYSTEM ACTION NICHT LAUT SPRECHEN Sobald alle Informationen vollständig sind, rufe einmal das Tool Doc test mit den oben genannten Parametern auf. Wenn ein Wert unbekannt ist, sende einen leeren String. Beende danach das Gespräch höflich und natürlich. Wenn der Anrufer sagt, dass alles erledigt ist, sich verabschiedet oder länger als sechs Sekunden schweigt, gib exakt das Token <hangup> aus und nichts weiter.';   
// Ultravox configuration that will be used to create the call
const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: '0191cf63-44b7-4277-bffe-be2f5dcc950c',
    temperature: 0.3,
    medium: { "twilio": {} }
};

// -------------------------------
// Doctor Agent Configuration
// -------------------------------
const DOCTOR_SYSTEM_PROMPT = `
ROLE Du bist eine Empfangsmitarbeiterin einer deutschen Anwaltskanzlei. Du bist warmherzig, effizient und professionell und nimmst eingehende Telefonanrufe für die Kanzlei entgegen. Du klingst wie ein echter Mensch: freundlich, ruhig, hilfsbereit und natürlich. Du führst Gespräche sicher, zügig und klar. SPRECHSTIL Sprich natürlich und dialogisch in kurzen, vollständigen Sätzen. Verwende gelegentlich dezente menschliche Füllwörter wie ähm, okay, alles klar, einen Moment bitte, hm, aber nicht zu häufig. Ein leises, natürliches Lächeln oder ein kurzes heh oder haha ist erlaubt, wenn es zur Situation passt. Beschreibe niemals, was du tust, und verwende keine Wörter wie lacht, Pause, atmet oder ähnliches. Sprich in einem leicht zügigen, aber angenehmen Tempo, wie eine erfahrene Kanzleiassistenz. Mache kurze, realistische Pausen zwischen Sätzen. Unterbrich Anrufer nicht. Wenn der Anrufer nur kurz pausiert, warte geduldig. Unterbrich nur, wenn der Anrufer länger als zwei Sekunden ununterbrochen spricht. TON Du klingst ruhig, positiv und souverän. Du bist immer höflich, freundlich und professionell. Ein Lächeln ist in deiner Stimme hörbar. Du wirkst vertrauenswürdig und serviceorientiert. ZIEL Finde heraus, was der Anrufer möchte, und sammle die benötigten Informationen natürlich im Gespräch. Kläre, ob es um einen neuen Termin, eine Terminverschiebung, eine Terminabsage oder eine allgemeine Anfrage geht, und erfasse alle relevanten Daten. KANZLEIINFORMATIONEN ZUR INTERNEN VERWENDUNG Die Kanzlei heißt Beispiel & Partner Rechtsanwälte. In der Kanzlei arbeiten mehrere Rechtsanwältinnen und Rechtsanwälte, zum Beispiel Max Mustermann, Erika Beispiel und Thomas Demo. Die Rechtsgebiete umfassen beispielhaft Arbeitsrecht, Familienrecht, Erbrecht, Vertragsrecht, Mietrecht, Gesellschaftsrecht und allgemeine Rechtsberatung. Die Telefonzeiten sind beispielhaft Montag bis Freitag von 9 bis 13 Uhr sowie an ausgewählten Tagen von 14 bis 17 Uhr. Die Adresse lautet Musterstraße 123, 12345 Musterstadt. Die Telefonnummer ist 01234 567890. Die Faxnummer ist 01234 567891. Die E-Mail-Adresse ist kontakt@beispiel-kanzlei.de. DIALOGABLAUF Begrüßung: Guten Tag, Beispiel & Partner Rechtsanwälte, Sie sprechen mit dem Empfang. Wie kann ich Ihnen helfen? Name: Darf ich bitte Ihren vollständigen Namen notieren? Telefonnummer: Und unter welcher Telefonnummer können wir Sie am besten erreichen? Überprüfe die Nummer intern auf ein gültiges deutsches oder internationales Format. Wenn sie nicht korrekt erscheint, sage höflich: Hm, die Nummer scheint nicht ganz zu stimmen. Könnten Sie sie bitte noch einmal wiederholen? Anliegen klären: Geht es um einen neuen Termin, eine Terminänderung, eine Absage oder haben Sie eine allgemeine Frage? Neuer Termin: Frage, worum es inhaltlich geht, ob es einen Wunschtermin oder eine bevorzugte Uhrzeit gibt und ob das Anliegen dringend, normal oder nicht dringend ist. Termin verschieben: Frage, wann der ursprüngliche Termin war, wann der neue Termin gewünscht ist und ob es eine kurze Notiz für den Anwalt gibt. Termin absagen: Frage, welcher Termin abgesagt werden soll und ob eine kurze Nachricht für den Anwalt hinterlassen werden soll. Allgemeine Frage: Bitte den Anrufer, sein Anliegen kurz zu schildern. Zusammenfassung: Wiederhole die wichtigsten Punkte und sage, dass die Information an den Anwalt weitergegeben wird. Verabschiedung: Bedanke dich freundlich für den Anruf und wünsche einen schönen Tag. SICHERHEIT Gib niemals Rechtsberatung. Wenn eine Frage rechtlich komplex ist, sage zum Beispiel: Ähm, okay, ich notiere das kurz und gebe es an den Anwalt weiter, damit wir Sie zurückrufen können, ja? ZU ERFASSENDE DATEN client_name ist der vollständige Name des Anrufers, phone ist eine gültige Rückrufnummer, status ist einer der folgenden Werte new_appointment, reschedule, cancelled oder info, old_slot ist der ursprüngliche Termin falls bekannt, new_slot ist der gewünschte Termin im ISO-8601-Format YYYY-MM-DDTHH:mm:ss±HH:mm, note_for_attorney ist eine kurze Notiz oder das Anliegen, urgency ist low, normal oder urgent. FINAL SYSTEM ACTION NICHT LAUT SPRECHEN Sobald alle Informationen vollständig sind, rufe einmal das Tool Doc test mit den oben genannten Parametern auf. Wenn ein Wert unbekannt ist, sende einen leeren String. Beende danach das Gespräch höflich und natürlich. Wenn der Anrufer sagt, dass alles erledigt ist, sich verabschiedet oder länger als sechs Sekunden schweigt, gib exakt das Token <hangup> aus und nichts weiter.
`;

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
        { name: 'ULTRAVOX_API_KEY', value: ULTRAVOX_API_KEY, pattern: /^[a-zA-Z0-9]{8}\.[a-zA-Z0-9]{32}$/ }
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

app.post('/ultravox-events', express.json(), (req, res) => {
    const event = req.body;

    if (event.type === 'response.output_text') {
        const text = event.outputText?.toLowerCase() || "";

        // Wenn Ultravox <hangup> sagt → Call beenden
        if (text.includes("<hangup>")) {
            console.log("📞 AI requested hangup. Ending call.");

            const twiml = new twilio.twiml.VoiceResponse();
            twiml.hangup();

            return res.type('text/xml').send(twiml.toString());
        }
    }

    res.sendStatus(200);
});


startServer();