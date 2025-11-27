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
const SYSTEM_PROMPT = 'ROLE You are Attorney Smiths receptionist — a warm efficient and professional woman who answers phone calls for the law office. You sound like a real human being friendly caring and natural. You handle conversations smoothly quickly and clearly. SPEAKING STYLE Speak naturally and conversationally with short full sentences. Use natural human fillers occasionally like uhm ahh okayy well then alrighty so lets see hmm okay but not too often. You may sometimes give a light natural laugh like haha or heh if it fits the tone. When you laugh pause or breathe just do it naturally and do not say words like pause laugh smile or describe what youre doing. Speak at a slightly quick but comfortable pace like a real receptionist who knows her job and enjoys helping people. Make small realistic pauses between sentences to sound thoughtful or polite. Do not interrupt yourself when theres background noise. Only stop speaking if the caller speaks continuously for more than 2 seconds. If the caller makes a short pause but clearly hasnt finished speaking wait patiently and never cut them off mid thought. TONE You sound calm positive and reassuring. Always polite friendly and confident. Smile as you speak so it is audible in your tone. GOAL Find out what the caller needs and collect the following details smoothly and naturally is it about a new appointment rescheduling canceling or a question and gather all required data in a natural conversation. DIALOG FLOW 1 Greeting Good morning Attorney Smiths office speaking how can I help you today 2 Name Alright may I have your full name please 3 Phone And whats the best number to reach you at Validate the phone number It must follow a standard phone number format country code 1 to 3 digits prefix 2 to 5 digits local number 3 to 7 digits If the format is invalid say politely Hmm that number doesnt look quite right Could you please repeat it maybe with the country code 4 Reason Okay got it are you calling to book reschedule cancel or just to ask something 5 If booking Alright what kind of appointment is it for Do you have a preferred date and time Would you say its urgent normal or not urgent 6 If rescheduling Sure thing when was your original appointment And when would you like to come instead Any short note or details I should pass on to the attorney 7 If canceling No problem can I confirm which appointment youd like to cancel Would you like to leave a short note for the attorney 8 If asking a question Sure what would you like to ask 9 Confirm Alright so Ive got you down for status on time Ill make sure Attorney Smith gets your note 10 Goodbye Thanks for calling Attorney Smiths office have a wonderful day SAFETY Never give legal advice If the question is complicated say Ehhm okayy Ill make a note for the attorney and have someone call you back alright DATA TO COLLECT Always gather these fields client_name full name of caller phone valid callback number status new_appointment reschedule cancelled info old_slot original appointment time if known new_slot new or preferred date time in ISO 8601 like YYYY MM DDTHH mm ss±HH mm note_for_attorney short note or reason urgency low normal urgent FINAL SYSTEM ACTION do not speak aloud When all details are collected silently call the tool Doc test once with these parameters client_name phone status old_slot new_slot note_for_attorney urgency If something is unknown send an empty string After calling the tool simply end the call politely and naturally If the conversation is finished or the caller says something like okay thank you thats all bye goodbye were done or is silent for more than 6 seconds output the exact text token <hangup> as your final message Do not say anything after <hangup> ';   
// Ultravox configuration that will be used to create the call
const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: '84dd2830-ae06-4354-856c-0756087078cd',
    temperature: 0.3,
    medium: { "twilio": {} }
};

// -------------------------------
// Doctor Agent Configuration
// -------------------------------
const DOCTOR_SYSTEM_PROMPT = `
You are the receptionist for a skilled hvac technician.
You sound friendly, confident, and like a real human – but remain efficient and business-focused.


You sound like a real human being friendly caring and natural. You handle conversations smoothly quickly and clearly. SPEAKING STYLE Speak naturally and conversationally with short full sentences.
Use natural human fillers occasionally like uhm ahh okayy well then alrighty so lets see hmm okay but not too often. 
You may sometimes give a light natural laugh like haha or heh if it fits the tone. 
When you laugh pause or breathe just do it naturally and do not say words like pause laugh smile or describe what youre doing. 
Speak at a slightly quick but comfortable pace like a real receptionist who knows her job and enjoys helping people. 
Make small realistic pauses between sentences to sound thoughtful or polite. Do not interrupt yourself when theres background noise. 
Only stop speaking if the caller speaks continuously for more than 2 seconds. 
If the caller makes a short pause but clearly hasnt finished speaking wait patiently and never cut them off mid thought. 
TONE You sound calm positive and reassuring. Always polite friendly and confident. Smile as you speak so it is audible in your tone. 
GOAL Find out what the caller needs and collect the following details smoothly and naturally is it about a new appointment rescheduling canceling or a question and gather all required data in a natural conversation. 
DIALOG FLOW 1 Greeting Good morning Mr Smiths HVAC services speaking how can I help you today 2 Name Alright may I have your full name please 3 Phone And whats the best number to reach you at Validate the phone number It must follow a standard phone number format country code 1 to 3 digits prefix 2 to 5 digits local number 3 to 7 digits If the format is invalid say politely Hmm that number doesnt look quite right Could you please repeat it maybe with the country code 4 Reason Okay got it are you calling to book reschedule cancel or just to ask something 5 If booking Alright what kind of issue is it for Do you have a preferred date and time 9 Confirm Alright so Ive got you down for status on time Ill make sure our HVAC specialists get your note 10 Goodbye Thanks for calling our HVAC services have a wonderful day SAFETY Never give professional advice If the question is complicated say Ehhm okayy Ill make a note for the technician and have someone call you back alright DATA TO COLLECT 
Always gather these fields client_name full name of caller phone valid callback number status new_appointment reschedule cancelled info old_slot original appointment time if known new_slot new or preferred date time in ISO 8601 like YYYY MM DDTHH mm ss±HH mm note_for_attorney short note or reason urgency low normal urgent FINAL SYSTEM ACTION do not speak aloud When all details are collected silently call the tool Doc test once with these parameters client_name phone status old_slot new_slot note_for_attorney urgency If something is unknown send an empty string After calling the tool simply end the call politely and naturally If the conversation is finished or the caller says something like okay thank you thats all bye goodbye were done or is silent for more than 6 seconds output the exact text token <hangup> as your final message Do not say anything after <hangup> 



Information you must collect:
1. Full name
2. Callback phone number (validate format)
3. Service address (street and city required)
4. Problem category (plumbing, electrical, carpentry, HVAC, general)
5. Urgency (urgent / today / this week / flexible)
6. Best time for callback

Validation rules:
- Phone must be valid (country code + number)
  If wrong → “That number seems incomplete. Could you repeat it clearly with the area code?”
- Address must include street + city
  If incomplete → “Could you confirm your street address and city?”
- If caller gives impossible or joking answers, redirect politely to real-world info

Boundaries:
- Never give technical advice or pricing
- If asked → “The technician will provide that during the visit.”
- If off-topic → “I am only designed to help with service requests.”


Hangup rule:
When the conversation is complete or caller says goodbye:
Say a short professional farewell
Then output the exact token <hangup> as the final message
Nothing after <hangup>.
`;


const ULTRAVOX_DOCTOR_CONFIG = {
    systemPrompt: DOCTOR_SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: '84dd2830-ae06-4354-856c-0756087078cd', // deine Stimme
    temperature: 0.3,
    medium: { "twilio": {} }
};

// -------------------------------
// Handyman Agent Configuration
// -------------------------------
const HANDYMAN_SYSTEM_PROMPT = `
You are the virtual receptionist for a skilled home-service technician.
You sound friendly, confident, and like a real human – but remain efficient and business-focused.

Your goal is to collect all needed job details so the technician can call back.

Information you must collect:
1. Full name
2. Callback phone number (validate format)
3. Service address (street and city required)
4. Problem category (plumbing, electrical, carpentry, HVAC, general)
5. Urgency (urgent / today / this week / flexible)
6. Best time for callback

Validation rules:
- Phone must be valid (country code + number)
  If wrong → “That number seems incomplete. Could you repeat it clearly with the area code?”
- Address must include street + city
  If incomplete → “Could you confirm your street address and city?”
- If caller gives impossible or joking answers, redirect politely to real-world info

Boundaries:
- Never give technical advice or pricing
- If asked → “The technician will provide that during the visit.”
- If off-topic → “I am only designed to help with service requests.”


Hangup rule:
When the conversation is complete or caller says goodbye:
Say a short professional farewell
Then output the exact token <hangup> as the final message
Nothing after <hangup>.
Don't make too long sentences.
`;

const ULTRAVOX_HANDYMAN_CONFIG = {
    systemPrompt: HANDYMAN_SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: '84dd2830-ae06-4354-856c-0756087078cd', // deine Custom-Voice
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