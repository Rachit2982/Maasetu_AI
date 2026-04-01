import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import twilio from "twilio";
import { initializeApp as initializeClientApp } from "firebase/app";
import { initializeFirestore as initializeClientFirestore, collection, addDoc, query, where, getDocs, limit, updateDoc, doc } from "firebase/firestore";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

dotenv.config();

// Load Firebase Config
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    console.log("Loaded Firebase Config for Project:", firebaseConfig.projectId);
  } else {
    console.error("firebase-applet-config.json not found at", configPath);
  }
} catch (e) {
  console.error("Error loading firebase-applet-config.json:", e);
}

// Initialize Firebase Client SDK (using it in backend for better reliability in this environment)
const clientApp = initializeClientApp(firebaseConfig);
const db = initializeClientFirestore(clientApp, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Global logs for debugging
const webhookLogs: string[] = [];
const addLog = (msg: string) => {
  const timestamp = new Date().toISOString();
  const log = `[${timestamp}] ${msg}`;
  console.log(log);
  webhookLogs.push(log);
  if (webhookLogs.length > 100) webhookLogs.shift();
};

// Lazy initialization helpers
let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "AIzaSyAZL48j90duFfwXlW3IJTu9lLEWiAnRRIk";
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

function normalizePhone(phone: string): string {
  if (!phone) return "";
  // Remove "whatsapp:" prefix if present
  const withoutPrefix = phone.replace("whatsapp:", "");
  // Remove all non-digit characters except '+'
  const cleaned = withoutPrefix.trim().replace(/[^\d+]/g, "");
  return cleaned;
}

/**
 * Returns a list of possible phone number formats to search for in the database.
 * Helps match +919876543210 with 9876543210 or +91 98765 43210.
 */
function getPhoneVariants(phone: string): string[] {
  const normalized = normalizePhone(phone);
  if (!normalized) return [];
  
  const variants = new Set<string>();
  variants.add(normalized);
  
  // If it starts with +, add the version without +
  if (normalized.startsWith("+")) {
    variants.add(normalized.substring(1));
  } else {
    // If it doesn't start with +, add the version with +
    variants.add("+" + normalized);
  }
  
  // Handle Indian numbers (91 prefix)
  let base = normalized.startsWith("+") ? normalized.substring(1) : normalized;
  if (base.startsWith("91") && base.length === 12) {
    const local = base.substring(2);
    variants.add(local);
    variants.add("+91" + local);
    variants.add("91" + local);
  } else if (base.length === 10) {
    variants.add("+91" + base);
    variants.add("91" + base);
    variants.add(base);
  }
  
  // Add the last 10 digits as a fallback
  if (normalized.length >= 10) {
    variants.add(normalized.substring(normalized.length - 10));
  }
  
  const result = Array.from(variants);
  addLog(`Generated phone variants for ${phone}: ${result.join(", ")}`);
  return result;
}

function formatSMS(phone: string): string {
  if (!phone) return "";
  return normalizePhone(phone);
}

function formatWhatsApp(phone: string): string {
  if (!phone) return "";
  const normalized = normalizePhone(phone);
  return `whatsapp:${normalized}`;
}

let twilioInstance: any = null;
function getTwilio() {
  if (!twilioInstance) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || 'ACc8f5e5a2d7745f878d5cd8bbccca333c';
    const authToken = process.env.TWILIO_AUTH_TOKEN || '9ff254b2e4f53ce54b7688df72c434f9';
    twilioInstance = twilio(accountSid, authToken);
  }
  return twilioInstance;
}

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request Logging Middleware
  app.use((req, res, next) => {
    if (req.url.includes("webhook")) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
  });

  console.log("Middleware configured.");

  // Health check
  app.get("/api/health", async (req, res) => {
    let firestoreStatus = "unknown";
    try {
      const testCollection = collection(db, "health_check");
      await addDoc(testCollection, { timestamp: new Date().toISOString() });
      firestoreStatus = "ok";
    } catch (e: any) {
      firestoreStatus = `error: ${e.message}`;
      console.error("Firestore health check failed:", e);
    }
    res.json({ 
      status: "ok", 
      firestore: firestoreStatus,
      timestamp: new Date().toISOString() 
    });
  });

  console.log("Health check route added.");

  // --- API Routes ---

  // 1. Registration Endpoint
  app.post("/api/register", async (req, res) => {
    console.log("Registration request received:", req.body);
    try {
      const patientData = { ...req.body };
      
      // Normalize phone numbers before saving
      patientData.patientPhone = normalizePhone(patientData.patientPhone);
      patientData.husbandPhone = normalizePhone(patientData.husbandPhone);
      patientData.emergencyContactPhone = normalizePhone(patientData.emergencyContactPhone);
      
      console.log("Attempting to save to Firestore using Client SDK...");
      // Save to Firestore using Client SDK
      const docRef = await addDoc(collection(db, "patients"), {
        ...patientData,
        risk: "LOW",
        createdAt: new Date().toISOString()
      });
      console.log("Saved to Firestore with ID:", docRef.id);

      // Send WhatsApp to Patient using ContentSid (Template)
      let whatsappSent = false;
      if (patientData.patientPhone && !patientData.skipTwilio) {
        try {
          const fromNumber = formatWhatsApp(process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886");
          const toNumber = formatWhatsApp(patientData.patientPhone);
          
          console.log(`Sending WhatsApp from ${fromNumber} to ${toNumber}`);
          
          await getTwilio().messages.create({
            from: fromNumber,
            to: toNumber,
            contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
            contentVariables: JSON.stringify({
              "1": patientData.name,
              "2": "MaaSetu"
            })
          });
          whatsappSent = true;
        } catch (err: any) {
          console.error("Failed to send WhatsApp:", err.message);
        }
      }

      // Send SMS to Husband (Standard SMS)
      let smsSent = false;
      const twilioSmsNumber = process.env.TWILIO_SMS_NUMBER || "+12602522077";
      if (patientData.husbandPhone && twilioSmsNumber && !patientData.skipTwilio) {
        try {
          const fromNumber = formatSMS(twilioSmsNumber);
          const toNumber = formatSMS(patientData.husbandPhone);
          
          console.log(`Sending SMS from ${fromNumber} to ${toNumber}`);
          
          const smsBody = `Registration successful.\n\nPatient: ${patientData.name}\nEmergency Contact: ${patientData.emergencyContactName} (${patientData.emergencyContactPhone})\n\nTo activate WhatsApp support:\n\n1. Open WhatsApp\n2. Send message: join leave-sky\n3. Send to: +14155238886\n\nAfter this, you will start receiving AI assistance on WhatsApp.`;
          
          await getTwilio().messages.create({
            from: fromNumber,
            to: toNumber,
            body: smsBody
          });
          smsSent = true;
        } catch (err: any) {
          console.error("Failed to send SMS:", err.message);
        }
      } else if (patientData.husbandPhone) {
        console.warn("TWILIO_SMS_NUMBER not set, skipping husband SMS notification.");
      }

      res.json({ 
        success: true, 
        id: docRef.id,
        messages: {
          whatsapp: whatsappSent,
          sms: smsSent
        }
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
        console.error("PERMISSION_DENIED details:", {
          code: error.code,
          details: error.details,
          metadata: error.metadata?.getMap ? error.metadata.getMap() : error.metadata,
          stack: error.stack
        });
      }
      res.status(500).json({ error: "Registration failed", details: error.message });
    }
  });

  // 2. WhatsApp Webhook
  app.get("/api/webhook/whatsapp", (req, res) => {
    res.send("WhatsApp Webhook is active. Use POST for Twilio.");
  });

  app.get("/api/webhook/logs", async (req, res) => {
    let patientsList = "";
    try {
      const snapshot = await getDocs(collection(db, "patients"));
      patientsList = snapshot.docs.map(d => {
        const p = d.data();
        return `${p.name}: ${p.patientPhone || "NO PHONE"}`;
      }).join("\n");
    } catch (e: any) {
      patientsList = `Error fetching patients: ${e.message}`;
    }

    res.send(`
      <html>
        <body style="font-family: monospace; background: #1a1a1a; color: #00ff00; padding: 20px;">
          <h2>Webhook Debug Logs</h2>
          <pre>${webhookLogs.join("\n")}</pre>
          <hr/>
          <h2>Registered Patients</h2>
          <pre>${patientsList}</pre>
          <script>setTimeout(() => window.location.reload(), 5000);</script>
        </body>
      </html>
    `);
  });

  // --- Webhook Handler ---
  const handleWebhook = async (req: any, res: any) => {
    addLog("\n--- WHATSAPP WEBHOOK RECEIVED ---");
    addLog(`Method: ${req.method}, URL: ${req.url}`);
    addLog(`Body: ${JSON.stringify(req.body)}`);
    addLog(`Query: ${JSON.stringify(req.query)}`);

    const incomingMsg = req.body.Body || req.query.Body;
    const from = req.body.From || req.query.From || ""; // format: whatsapp:+91xxxxxxxxxx
    const phoneVariants = getPhoneVariants(from);

    if (!incomingMsg) {
      addLog("ERROR: No message body found in request");
      return res.status(400).send("No message body");
    }

    if (phoneVariants.length === 0) {
      addLog("ERROR: Could not parse phone number from request");
      return res.status(400).send("Invalid phone number");
    }

    try {
      addLog(`Searching for patient with phone variants: ${phoneVariants.join(", ")}`);
      
      const patientSnapshot = await getDocs(
        query(
          collection(db, "patients"),
          where("patientPhone", "in", phoneVariants),
          limit(1)
        )
      );

      if (patientSnapshot.empty) {
        addLog(`WARN: Unknown sender: ${from}. No matching patient found.`);
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message("Namaste, aapka number MaaSetu par registered nahi hai. Kripya hospital se sampark karein.");
        addLog("Sending 'Not Registered' TwiML response");
        return res.set("Content-Type", "text/xml").send(twiml.toString());
      }

      const patientDoc = patientSnapshot.docs[0];
      const patient = { id: patientDoc.id, ...patientDoc.data() } as any;

      addLog(`Found patient: ${patient.name} (ID: ${patientDoc.id})`);

      // Log messages helper
      const logMsg = async (text: string, sender: string) => {
        try {
          addLog(`Logging ${sender} message...`);
          await addDoc(collection(db, "messages"), {
            patientId: patientDoc.id,
            text,
            sender,
            timestamp: new Date().toISOString()
          });
        } catch (e: any) {
          addLog(`ERROR: Failed to log ${sender} message: ${e.message}`);
        }
      };

      // Handle simple "Confirm" message explicitly for faster response
      const lowerMsg = incomingMsg.toLowerCase().trim();
      if (lowerMsg === "confirm" || lowerMsg === "yes" || lowerMsg === "haan") {
        addLog("Handling 'Confirm' message explicitly.");
        const twiml = new twilio.twiml.MessagingResponse();
        const reply = `Dhanyawad ${patient.name}, aapka appointment confirm ho gaya hai. Hum aapka intezar karenge.`;
        twiml.message(reply);
        
        // Fire and forget logging
        logMsg(incomingMsg, "patient").catch(e => addLog(`Log error: ${e.message}`));
        logMsg(reply, "system").catch(e => addLog(`Log error: ${e.message}`));
        
        addLog(`Sending TwiML response (Confirm): ${reply}`);
        return res.set("Content-Type", "text/xml").send(twiml.toString());
      }

      // Triage with Gemini
      let triage: any;
      const triagePrompt = `Analyze maternal health message for triage. 
      Patient Context: ${JSON.stringify(patient)}
      Incoming Message: "${incomingMsg}"
      
      Rules:
      1. If the patient reports pain, bleeding, or severe symptoms, set risk to HIGH.
      2. Provide a supportive, medical-first response in Hindi/English mix (Hinglish).
      3. If risk is HIGH, set triggerAlert to true.`;

      try {
        addLog("Calling Gemini AI...");
        const ai = getAI();
        let triageResponse: any;
        let retries = 0;
        const maxRetries = 2;

        while (retries <= maxRetries) {
          try {
            triageResponse = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: [{ role: "user", parts: [{ text: triagePrompt }] }],
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    risk: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
                    summary: { type: Type.STRING },
                    whatsappReply: { type: Type.STRING },
                    triggerAlert: { type: Type.BOOLEAN }
                  },
                  required: ["risk", "summary", "whatsappReply", "triggerAlert"]
                }
              }
            });
            break; // Success
          } catch (err: any) {
            if (err.message?.includes("503") || err.message?.includes("high demand")) {
              retries++;
              if (retries <= maxRetries) {
                addLog(`Gemini busy (503), retrying (${retries}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, 1000 * retries));
                continue;
              }
            }
            throw err;
          }
        }

        const cleanText = triageResponse.text.replace(/```json|```/g, "").trim();
        triage = JSON.parse(cleanText);
        addLog(`AI Triage result: ${JSON.stringify(triage)}`);
      } catch (aiError: any) {
        addLog(`ERROR: Gemini AI failed: ${aiError.message}`);
        triage = {
          risk: "MEDIUM",
          summary: "AI Triage failed, manual review needed",
          whatsappReply: "Aapka sandesh mil gaya hai. Hum jald hi aapse sampark karenge. Agar dard zyada hai toh turant hospital jayein.",
          triggerAlert: true
        };
      }

      // Update patient risk and log messages (non-blocking)
      const updatePatientData = async () => {
        try {
          if (triage.risk !== patient.risk) {
            addLog(`Updating risk for patient ${patientDoc.id} to ${triage.risk}...`);
            await updateDoc(doc(db, "patients", patientDoc.id), { risk: triage.risk });
          }
          await logMsg(incomingMsg, "patient");
          await logMsg(triage.whatsappReply, "system");
        } catch (e: any) {
          addLog(`ERROR: Failed to update patient risk/logs: ${e.message}`);
        }
      };
      updatePatientData();

      // EMERGENCY LOGIC: If HIGH risk, notify husband immediately (non-blocking)
      if (triage.risk === "HIGH") {
        const notifyHusband = async () => {
          const twilioSmsNumber = process.env.TWILIO_SMS_NUMBER || "+12602522077";
          const husbandPhone = formatSMS(patient.husbandPhone);
          if (husbandPhone && twilioSmsNumber) {
            const emergencySms = `EMERGENCY ALERT for ${patient.name}: She reported a high-risk symptom: "${incomingMsg}". Please check on her immediately or take her to the hospital.`;
            try {
              await getTwilio().messages.create({
                from: formatSMS(twilioSmsNumber),
                to: husbandPhone,
                body: emergencySms
              });
              addLog(`EMERGENCY SMS SENT TO HUSBAND: ${husbandPhone}`);
            } catch (smsErr: any) {
              addLog(`ERROR: Failed to send emergency SMS: ${smsErr.message}`);
            }
          }
          addLog(`🚨 ALERT: HIGH RISK DETECTED FOR ${patient.name.toUpperCase()}`);
        };
        notifyHusband();
      }

      // Create alert in dashboard (non-blocking)
      if (triage.triggerAlert || triage.risk === "HIGH") {
        const createDashboardAlert = async () => {
          try {
            addLog("Creating dashboard alert...");
            await addDoc(collection(db, "alerts"), {
              patientId: patientDoc.id,
              patientName: patient.name,
              risk: triage.risk,
              summary: triage.summary,
              message: incomingMsg,
              timestamp: new Date().toISOString(),
              handled: false
            });
            addLog(`Dashboard alert created for ${patient.name}`);
          } catch (e: any) {
            addLog(`ERROR: Failed to create dashboard alert: ${e.message}`);
          }
        };
        createDashboardAlert();
      }

      // Respond via TwiML (Immediate)
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(triage.whatsappReply);
      addLog(`Sending TwiML response: ${triage.whatsappReply}`);
      return res.set("Content-Type", "text/xml").send(twiml.toString());
    } catch (error: any) {
      addLog(`CRITICAL WEBHOOK ERROR: ${error.message}`);
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message("Maaf kijiye, system mein kuch takniki kharabi hai. Kripya thodi der baad koshish karein.");
      res.set("Content-Type", "text/xml").send(twiml.toString());
    }
  };

  app.get("/api/webhook", handleWebhook);
  app.post("/api/webhook", handleWebhook);
  app.post("/api/webhook/whatsapp", handleWebhook);

  // --- Vite Setup ---
  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
        configFile: path.join(process.cwd(), "vite.config.ts"),
      });
      app.use(vite.middlewares);
      console.log("Vite middleware attached.");
    } catch (e) {
      console.error("Failed to create Vite server:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Start 6-hourly reminders
    setInterval(async () => {
      console.log("Running 6-hourly health reminders...");
      try {
        const patientsSnapshot = await getDocs(collection(db, "patients"));
        const twilioClient = getTwilio();
        const twilioSmsNumber = process.env.TWILIO_SMS_NUMBER || "+12602522077";
        const fromNumber = formatSMS(twilioSmsNumber);
        
        if (!fromNumber) {
          console.warn("TWILIO_SMS_NUMBER not set, skipping 6-hourly reminders.");
          return;
        }

        for (const patientDoc of patientsSnapshot.docs) {
          const patient = patientDoc.data();
          if (patient.skipTwilio) continue;
          
          const husbandPhone = formatSMS(patient.husbandPhone);
          
          if (husbandPhone) {
            const heartRate = patient.lastBandData?.heartRate || "--";
            const temp = patient.lastBandData?.temperature ? patient.lastBandData.temperature.toFixed(1) : "--";
            
            const reminderMsg = `MaaSetu Health Reminder for ${patient.name}:\n- Last Heart Rate: ${heartRate} bpm\n- Last Temp: ${temp}°C\n- Medicine Reminder: Please ensure all prescribed medicines are taken on time.\n\nStay safe!`;
            
            try {
              await twilioClient.messages.create({
                from: fromNumber,
                to: husbandPhone,
                body: reminderMsg
              });
              console.log(`Reminder sent to ${patient.name}'s husband at ${husbandPhone}`);
            } catch (err) {
              console.error(`Failed to send reminder to ${husbandPhone}:`, err);
            }
          }
        }
      } catch (error) {
        console.error("Error in 6-hourly reminder task:", error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours
  });
}

startServer();
