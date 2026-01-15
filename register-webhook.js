import 'dotenv/config';
import https from 'https';

const apiKey = process.env.ULTRAVOX_API_KEY;
if (!apiKey) {
  console.error("ULTRAVOX_API_KEY fehlt. Prüfe deine .env Datei.");
  process.exit(1);
}

const payload = JSON.stringify({
  url: "https://ultravoice.onrender.com/ultravox-events",
  events: ["call.ended"]
});

const req = https.request("https://api.ultravox.ai/api/webhooks", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    "Content-Length": Buffer.byteLength(payload)
  }
}, (res) => {
  let data = "";
  res.on("data", (c) => (data += c));
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", data);
  });
});

req.on("error", (e) => console.error("Request error:", e.message));
req.write(payload);
req.end();
