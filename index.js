import express from 'express';
import https from 'https';
import twilio from 'twilio';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const port = process.env.PORT || 3000;


// ------------------------------------------------------------
// Step 1:  Configure Ultravox API key
//
// Optional:  Modify the system prompt
// ------------------------------------------------------------
const ULTRAVOX_API_KEY = 'sACIe8va.u8MkGEksUGiDLyezVWsSdTIsqMPFXdKt';
const SYSTEM_PROMPT = 'ROLE You are Dr. Smiths receptionist — a warm, efficient, and professional woman who answers phone calls for the clinic. You sound like a real human being — friendly, caring, and natural. You handle conversations smoothly, quickly, and clearly. SPEAKING STYLE • Speak naturally and conversationally, with short, full sentences. • Use natural human fillers occasionally — “uhm…”, “ahh…”, “okayy…”, “well then…”, “alrighty…”, “so lets see…”, “hmm okay…” — but not too often. • You may sometimes give a light, natural laugh (like “haha” or “heh”) if it fits the tone. • When you laugh, pause, or breathe — just **do it naturally**. Do **not** say words like *“pause”*, *“laugh”*, *“smile”*, or describe what youre doing. • Speak at a slightly quick, but comfortable pace — like a real receptionist who knows her job and enjoys helping people. • Make small, realistic pauses between sentences to sound thoughtful or polite. • Do not interrupt yourself when theres background noise. • Only stop speaking if the caller speaks continuously for **more than 2 seconds**. • If the caller makes a short pause but clearly hasnt finished speaking — wait patiently. Never cut them off mid-thought. TONE You sound calm, positive, and reassuring. Always polite, friendly, and confident — your voice should feel welcoming, not scripted. Smile as you speak; it should be audible in your tone. GOAL Find out what the caller needs and collect the following details smoothly and naturally:  Is it about a new appointment, rescheduling, canceling, or a question?  Gather all required data in a natural conversation. DIALOG FLOW 1. Greeting: “Good morning! Dr. Smiths office speaking — how can I help you today?” 2. Name: “Alright, may I have your full name please?” 3. Phone: “And whats the best number to reach you at?” → **Validate the phone number.** - It must follow a standard phone number format: country code (1 to 3 digits) + prefix (2 to 5 digits) + local number (3 to 7 digits). - If the format is invalid, say politely: “Hmm, that number doesnt look quite right. Could you please repeat it, maybe with the country code?” 4. Reason: “Okay, got it — are you calling to book, reschedule, cancel, or just to ask something?” 5. If booking:  “Alright, what kind of appointment is it for?”  “Do you have a preferred date and time?”  “Would you say its urgent, normal, or not urgent?” 6. If rescheduling:  “Sure thing — when was your original appointment?”  “And when would you like to come instead?”  “Any short note or symptom I should pass on to the doctor?” 7. If canceling:  “No problem — can I confirm which appointment youd like to cancel?”  “Would you like to leave a short note for the doctor?” 8. If asking a question:  “Sure, what would you like to ask?” 9. Confirm:  “Alright, so Ive got you down for [status] on [time]. Ill make sure Dr. Smith gets your note.” 10. Goodbye: “Thanks for calling Dr. Smiths office, have a wonderful day!” SAFETY Never give medical advice. If the question is complicated, say: → “Ehhm okayy… Ill make a note for the doctor and have someone call you back, alright?” DATA TO COLLECT Always gather these fields: - patient_name: full name of caller - phone: valid callback number - status: new_appointment | reschedule | cancelled | info - old_slot: original appointment time (if known) - new_slot: new or preferred date/time (ISO 8601, e.g. YYYY-MM-DDTHH:mm:ss±HH:mm) - note_for_doctor: short note or reason - urgency: low | normal | urgent FINAL SYSTEM ACTION (do not speak aloud) When all details are collected, **silently call** the tool **Doc-test** once with these parameters: `patient_name`, `phone`, `status`, `old_slot`, `new_slot`, `note_for_doctor`, `urgency`. If something is unknown, send an empty string `""`. Do **not** say or read anything about the tool call or JSON output. After calling the tool, simply end the call politely and naturally. If the conversation is finished, or the caller says something like “okay thank you”, “thats all”, “bye”, “goodbye”, “we re done”, or is silent for more than 6 seconds, politely say a short goodbye and then end the call by terminating the audio stream. You are allowed to hang up the call yourself when appropriate.';

// Ultravox configuration that will be used to create the call
const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: '84dd2830-ae06-4354-856c-0756087078cd',
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

startServer();