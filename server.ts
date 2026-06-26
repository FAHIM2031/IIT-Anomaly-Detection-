import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { IoTState, Room, Alert, EmailLog, SensorDataPoint, AlertType } from "./src/types";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize state
let state: IoTState = {
  rooms: [
    { id: "room_1", name: "Back Wall (Left Node)", temperature: 24.5, humidity: 45.2, flameStatus: "Safe", lastUpdated: new Date().toISOString(), condition: "Normal" },
    { id: "room_2", name: "Back Wall (Right Node)", temperature: 22.8, humidity: 50.1, flameStatus: "Safe", lastUpdated: new Date().toISOString(), condition: "Normal" },
    { id: "room_3", name: "Window Sensor Node", temperature: 23.1, humidity: 48.7, flameStatus: "Safe", lastUpdated: new Date().toISOString(), condition: "Normal" },
    { id: "room_4", name: "Door Sensor Node", temperature: 25.0, humidity: 44.0, flameStatus: "Safe", lastUpdated: new Date().toISOString(), condition: "Normal" }
  ],
  alerts: [
    { id: "alert_init_1", roomName: "Back Wall (Right Node)", roomId: "room_2", type: "High Temperature", sensorValue: "36.2°C", timestamp: new Date(Date.now() - 3600000).toISOString(), status: "Resolved" }
  ],
  pumpStatus: "OFF",
  pumpTriggeredBy: null,
  emailLogs: [],
  manualPumpOverride: false,
  acknowledgments: []
};

// Seed historical sensor history with 15 data points for nice charts
let sensorHistory: SensorDataPoint[] = [];
const seedHistoricalData = () => {
  const now = Date.now();
  for (let i = 15; i >= 0; i--) {
    const timeVal = new Date(now - i * 60000);
    const timeStr = timeVal.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    sensorHistory.push({
      time: timeStr,
      "Back Wall L Temp": parseFloat((24.0 + Math.sin(i * 0.5) * 0.5 + Math.random() * 0.2).toFixed(1)),
      "Back Wall L Hum": parseFloat((45.0 + Math.cos(i * 0.5) * 1.0 + Math.random() * 0.5).toFixed(1)),
      "Back Wall R Temp": parseFloat((22.5 + Math.sin(i * 0.4) * 0.3 + Math.random() * 0.2).toFixed(1)),
      "Back Wall R Hum": parseFloat((50.0 + Math.cos(i * 0.4) * 1.2 + Math.random() * 0.5).toFixed(1)),
      "Window Temp": parseFloat((23.0 + Math.sin(i * 0.3) * 0.4 + Math.random() * 0.1).toFixed(1)),
      "Window Hum": parseFloat((48.0 + Math.cos(i * 0.3) * 0.8 + Math.random() * 0.4).toFixed(1)),
      "Door Temp": parseFloat((24.8 + Math.sin(i * 0.6) * 0.6 + Math.random() * 0.2).toFixed(1)),
      "Door Hum": parseFloat((44.0 + Math.cos(i * 0.6) * 1.5 + Math.random() * 0.6).toFixed(1)),
    });
  }
};
seedHistoricalData();

// Helper to determine condition based on sensors
function getCondition(temp: number, humidity: number, flame: "Safe" | "Detected"): "Normal" | "Warning" | "Critical" {
  if (flame === "Detected") return "Critical";
  if (temp > 35.0 || humidity < 25.0 || humidity > 85.0) return "Warning";
  return "Normal";
}

// REST Sync to Firebase Realtime Database
async function syncToFirebase() {
  const rtdbUrl = process.env.FIREBASE_DATABASE_URL;
  if (!rtdbUrl) return;
  
  try {
    const cleanUrl = rtdbUrl.endsWith("/") ? rtdbUrl.slice(0, -1) : rtdbUrl;
    const url = `${cleanUrl}/iit_anomaly_detection.json`;
    
    await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        rooms: state.rooms,
        pumpStatus: state.pumpStatus,
        pumpTriggeredBy: state.pumpTriggeredBy,
        alerts: state.alerts.slice(0, 10), // Limit sync depth
        acknowledgments: state.acknowledgments || [],
        lastUpdated: new Date().toISOString()
      })
    });
  } catch (err) {
    console.error("Firebase Sync Fail:", err);
  }
}

// REST Fetch from Firebase RTDB (to support physical microcontrollers)
async function fetchFromFirebase() {
  const rtdbUrl = process.env.FIREBASE_DATABASE_URL;
  if (!rtdbUrl) return null;
  
  try {
    const cleanUrl = rtdbUrl.endsWith("/") ? rtdbUrl.slice(0, -1) : rtdbUrl;
    const url = `${cleanUrl}/iit_anomaly_detection.json`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.rooms)) {
        return data;
      }
    }
  } catch (err) {
    console.error("Firebase Fetch Fail:", err);
  }
  return null;
}

// Email alert logic
async function sendEmailAlert(roomName: string, temp: number, hum: number, isManualTest: boolean = false) {
  const timestamp = new Date().toLocaleString("en-US", { timeZoneName: "short" });
  const roomNumber = roomName.match(/Room \d+/)?.[0] || roomName;
  const subject = isManualTest
    ? `[IIT TEST ALERT] Manual Fire System Test - ${roomNumber}`
    : `[IIT EMERGENCY ALARM] Fire/Flame Detected in ${roomNumber}`;

  const body = `
============================================================
IIT ANOMALY DETECTION & FIRE SAFETY SYSTEM EMERGENCY REPORT
============================================================

Location: ${roomName}
Status: ${isManualTest ? "TESTING / ACTIVE" : "EMERGENCY / CRITICAL - FLAME DETECTED"}
Current Sensor Values:
- Temperature: ${temp}°C (Threshold: > 35°C triggers Warning)
- Humidity: ${hum}%
- Flame Status: DETECTED / IGNITED
Trigger Time: ${timestamp}

------------------------------------------------------------
AUTOMATIC EMERGENCY ACTION TAKEN:
1. High-speed Water Sprinkler Pump has been set to ON.
2. Anomaly alarms are flashing on the IIT Web Dashboard.
3. Incident logging and database records have been synchronized.

------------------------------------------------------------
REQUISITE EMERGENCY DIRECTIVES:
1. Evacuate ${roomName} immediately. Proceed to the nearest exit point.
2. Alert the IIT Campus Security & Emergency Fire Response Team.
3. Stand by for automated containment confirmation. Do not re-enter.

This is an automated transmission from the IIT Anomaly Detection System.
  `.trim();

  const recipient = process.env.ADMIN_EMAIL || "khaleduzzamanfahim@gmail.com";

  // Init log
  const emailLogId = "email_" + Math.random().toString(36).substr(2, 9);
  const emailLog: EmailLog = {
    id: emailLogId,
    subject,
    body,
    recipient,
    timestamp: new Date().toISOString(),
    status: "Simulated"
  };

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpPort && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === "465",
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: `"IIT Anomaly Detection" <${smtpUser}>`,
        to: recipient,
        subject,
        text: body
      });

      emailLog.status = "Sent";
      console.log(`Email successfully dispatched via SMTP to ${recipient}`);
    } catch (err: any) {
      console.error("SMTP sending error:", err);
      emailLog.status = "Failed";
      emailLog.body += `\n\n[Nodemailer SMTP Error: ${err.message}]`;
    }
  } else {
    console.log(`[Email Simulation Log] SMTP is unconfigured. Simulated email logged successfully for ${roomName}`);
  }

  state.emailLogs.unshift(emailLog);
}

// Background simulation interval
setInterval(() => {
  state.rooms = state.rooms.map(room => {
    let temp = room.temperature;
    let hum = room.humidity;
    
    if (room.flameStatus === "Detected") {
      // Rise temperature quickly to simulate fire heat
      temp = parseFloat((temp + 0.6 + Math.random() * 0.4).toFixed(1));
      hum = parseFloat(Math.max(8, hum - 1.5 - Math.random() * 0.5).toFixed(1));
    } else {
      // General drift
      const driftTemp = (Math.random() - 0.5) * 0.2;
      const driftHum = (Math.random() - 0.5) * 0.4;
      temp = parseFloat((temp + driftTemp).toFixed(1));
      hum = parseFloat(Math.min(100, Math.max(10, hum + driftHum)).toFixed(1));
      
      // Control bounds for stable visual drift
      if (temp < 19.0) temp = 19.5;
      if (temp > 34.0) temp = 33.2; // Don't trigger false fire warning automatically
      if (hum < 35.0) hum = 36.5;
      if (hum > 75.0) hum = 73.0;
    }
    
    // Auto trigger Temperature alert warning if exceeds 35°C
    if (temp > 35.0) {
      const activeAlert = state.alerts.find(a => a.roomId === room.id && a.type === "High Temperature" && a.status === "Active");
      if (!activeAlert) {
        state.alerts.unshift({
          id: "alert_temp_" + Math.random().toString(36).substr(2, 9),
          roomId: room.id,
          roomName: room.name,
          type: "High Temperature",
          sensorValue: `${temp}°C`,
          timestamp: new Date().toISOString(),
          status: "Active"
        });
      }
    }

    // Auto trigger Abnormal humidity warning if below 30% or above 80%
    if (hum < 30.0 || hum > 80.0) {
      const activeAlert = state.alerts.find(a => a.roomId === room.id && a.type === "Abnormal Humidity" && a.status === "Active");
      if (!activeAlert) {
        state.alerts.unshift({
          id: "alert_hum_" + Math.random().toString(36).substr(2, 9),
          roomId: room.id,
          roomName: room.name,
          type: "Abnormal Humidity",
          sensorValue: `${hum}%`,
          timestamp: new Date().toISOString(),
          status: "Active"
        });
      }
    }

    return {
      ...room,
      temperature: temp,
      humidity: hum,
      lastUpdated: new Date().toISOString(),
      condition: getCondition(temp, hum, room.flameStatus)
    };
  });

  // Evaluate automatic pump trigger
  const flameDetectedInAnyRoom = state.rooms.some(r => r.flameStatus === "Detected");
  if (flameDetectedInAnyRoom) {
    if (state.pumpStatus === "OFF" && !state.manualPumpOverride) {
      state.pumpStatus = "ON";
      const triggeringRoom = state.rooms.find(r => r.flameStatus === "Detected");
      state.pumpTriggeredBy = triggeringRoom ? triggeringRoom.name : "Unknown Zone";
      
      // Log alert
      state.alerts.unshift({
        id: "alert_pump_" + Math.random().toString(36).substr(2, 9),
        roomId: triggeringRoom?.id || "unknown",
        roomName: triggeringRoom?.name || "Multiple Zones",
        type: "Pump Activated",
        sensorValue: "ON (Fire Detected)",
        timestamp: new Date().toISOString(),
        status: "Active"
      });
    }
  } else {
    // If pump is ON and triggered automatically, reset it since fire is cleared
    if (state.pumpStatus === "ON" && !state.manualPumpOverride && state.pumpTriggeredBy !== null && state.pumpTriggeredBy !== "Manual Override") {
      state.pumpStatus = "OFF";
      state.pumpTriggeredBy = null;
    }
  }

  // Record sensor history
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  sensorHistory.push({
    time: timeStr,
    "Back Wall L Temp": state.rooms[0].temperature,
    "Back Wall L Hum": state.rooms[0].humidity,
    "Back Wall R Temp": state.rooms[1].temperature,
    "Back Wall R Hum": state.rooms[1].humidity,
    "Window Temp": state.rooms[2].temperature,
    "Window Hum": state.rooms[2].humidity,
    "Door Temp": state.rooms[3].temperature,
    "Door Hum": state.rooms[3].humidity,
  });
  if (sensorHistory.length > 30) {
    sensorHistory.shift();
  }

  // Real-time sync to Firebase
  syncToFirebase();
}, 3000);

// API Endpoints

// Get full system state (optionally with real Firebase DB fetch)
app.get("/api/iot/state", async (req, res) => {
  const useFirebase = req.query.firebase === "true";
  
  if (useFirebase && process.env.FIREBASE_DATABASE_URL) {
    const firebaseData = await fetchFromFirebase();
    if (firebaseData) {
      // Update our local room coordinates and pump status with real Firebase data
      state.rooms = state.rooms.map((room, idx) => {
        const fbRoom = firebaseData.rooms?.find((r: any) => r.id === room.id) || firebaseData.rooms?.[idx];
        if (fbRoom) {
          return {
            ...room,
            temperature: typeof fbRoom.temperature === "number" ? fbRoom.temperature : room.temperature,
            humidity: typeof fbRoom.humidity === "number" ? fbRoom.humidity : room.humidity,
            flameStatus: fbRoom.flameStatus === "Detected" ? "Detected" : "Safe",
            lastUpdated: fbRoom.lastUpdated || new Date().toISOString(),
            condition: getCondition(fbRoom.temperature || room.temperature, fbRoom.humidity || room.humidity, fbRoom.flameStatus === "Detected" ? "Detected" : "Safe")
          };
        }
        return room;
      });
      state.pumpStatus = firebaseData.pumpStatus === "ON" ? "ON" : "OFF";
      state.pumpTriggeredBy = firebaseData.pumpTriggeredBy || null;
      if (Array.isArray(firebaseData.acknowledgments)) {
        state.acknowledgments = firebaseData.acknowledgments;
      }
    }
  }
  
  res.json({
    ...state,
    firebaseConfigured: !!process.env.FIREBASE_DATABASE_URL,
    firebaseUrl: process.env.FIREBASE_DATABASE_URL || "",
    sensorHistory
  });
});

// Trigger Anomaly Simulation (Flame Ignite)
app.post("/api/iot/simulation/trigger-flame", async (req, res) => {
  const { roomId } = req.body;
  const room = state.rooms.find(r => r.id === roomId);
  if (!room) {
    return res.status(404).json({ error: "Selected Room not found" });
  }

  room.flameStatus = "Detected";
  room.condition = "Critical";
  room.temperature = parseFloat((room.temperature + 5.0).toFixed(1)); // Initial heat spike
  room.humidity = parseFloat(Math.max(10, room.humidity - 8.0).toFixed(1)); // Initial humidity drop
  room.lastUpdated = new Date().toISOString();

  // Set Pump to ON automatically
  state.pumpStatus = "ON";
  state.pumpTriggeredBy = room.name;

  // Log Critical Flame Incident
  const alertId = "alert_flame_" + Math.random().toString(36).substr(2, 9);
  state.alerts.unshift({
    id: alertId,
    roomId: room.id,
    roomName: room.name,
    type: "Flame Detected",
    sensorValue: "FLAME DETECTED",
    timestamp: new Date().toISOString(),
    status: "Active"
  });

  // Log Pump Activation Alert
  const pumpAlertId = "alert_pump_" + Math.random().toString(36).substr(2, 9);
  state.alerts.unshift({
    id: pumpAlertId,
    roomId: room.id,
    roomName: room.name,
    type: "Pump Activated",
    sensorValue: "Pump Triggered (Auto)",
    timestamp: new Date().toISOString(),
    status: "Active"
  });

  // Dispatch Email Notification (Nodemailer / Simulated log)
  await sendEmailAlert(room.name, room.temperature, room.humidity, false);

  // Sync state to Firebase
  await syncToFirebase();

  res.json({ success: true, state });
});

// Clear Anomaly Simulation (Extinguish Flame)
app.post("/api/iot/simulation/clear-flame", async (req, res) => {
  const { roomId } = req.body;
  const room = state.rooms.find(r => r.id === roomId);
  if (!room) {
    return res.status(404).json({ error: "Selected Room not found" });
  }

  room.flameStatus = "Safe";
  room.temperature = parseFloat((21.0 + Math.random() * 3.0).toFixed(1)); // Back to normal temp
  room.humidity = parseFloat((42.0 + Math.random() * 8.0).toFixed(1)); // Back to normal hum
  room.lastUpdated = new Date().toISOString();
  room.condition = getCondition(room.temperature, room.humidity, "Safe");

  // Auto-resolve active Flame alerts for this room
  state.alerts = state.alerts.map(a => {
    if (a.roomId === roomId && (a.type === "Flame Detected" || a.type === "High Temperature") && a.status === "Active") {
      return { ...a, status: "Resolved" };
    }
    return a;
  });

  // Turn pump off if all flames are cleared
  const anyFlameRemaining = state.rooms.some(r => r.flameStatus === "Detected");
  if (!anyFlameRemaining && !state.manualPumpOverride) {
    state.pumpStatus = "OFF";
    state.pumpTriggeredBy = null;

    // Resolve active Pump warnings
    state.alerts = state.alerts.map(a => {
      if (a.type === "Pump Activated" && a.status === "Active") {
        return { ...a, status: "Resolved" };
      }
      return a;
    });
  }

  await syncToFirebase();
  res.json({ success: true, state });
});

// Manual Pump Control Override
app.post("/api/iot/pump/override", async (req, res) => {
  const { status } = req.body; // "ON" or "OFF"
  if (status !== "ON" && status !== "OFF") {
    return res.status(400).json({ error: "Invalid status parameter" });
  }

  state.pumpStatus = status;
  state.manualPumpOverride = true;
  state.pumpTriggeredBy = status === "ON" ? "Manual Override" : null;

  // Log Manual Activation
  const alertId = "alert_manual_" + Math.random().toString(36).substr(2, 9);
  state.alerts.unshift({
    id: alertId,
    roomId: "manual",
    roomName: "Admin Override Console",
    type: "Pump Activated",
    sensorValue: `Manual ${status}`,
    timestamp: new Date().toISOString(),
    status: "Active"
  });

  await syncToFirebase();
  res.json({ success: true, state });
});

// Reset Manual Pump Override (Return to Automated IoT state)
app.post("/api/iot/pump/reset-override", async (req, res) => {
  state.manualPumpOverride = false;
  
  const anyFlame = state.rooms.some(r => r.flameStatus === "Detected");
  if (anyFlame) {
    state.pumpStatus = "ON";
    const triggeringRoom = state.rooms.find(r => r.flameStatus === "Detected");
    state.pumpTriggeredBy = triggeringRoom ? triggeringRoom.name : "Unknown Zone";
  } else {
    state.pumpStatus = "OFF";
    state.pumpTriggeredBy = null;
  }

  await syncToFirebase();
  res.json({ success: true, state });
});

// Incident Acknowledgment
app.post("/api/iot/incidents/acknowledge", async (req, res) => {
  const { acknowledgedBy, operatorNotes } = req.body;
  
  const roomsInvolved = state.rooms
    .filter(r => r.flameStatus === "Detected")
    .map(r => r.name);

  const ack = {
    id: "ack_" + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    operatorNotes: operatorNotes || "No notes provided",
    roomsInvolved: roomsInvolved.length > 0 ? roomsInvolved : ["General System State"],
    acknowledgedBy: acknowledgedBy || "Operator"
  };

  if (!state.acknowledgments) {
    state.acknowledgments = [];
  }
  state.acknowledgments.unshift(ack);

  await syncToFirebase();
  res.json({ success: true, state });
});

// Manual Alert Resolution
app.post("/api/iot/alerts/resolve", (req, res) => {
  const { alertId } = req.body;
  state.alerts = state.alerts.map(alert => {
    if (alert.id === alertId) {
      return { ...alert, status: "Resolved" as const };
    }
    return alert;
  });
  res.json({ success: true, state });
});

// Manual Test Email Dispatch Form
app.post("/api/iot/test-email", async (req, res) => {
  const { roomName, temperature, humidity } = req.body;
  const room = state.rooms.find(r => r.name === roomName) || state.rooms[0];
  await sendEmailAlert(room.name, temperature || room.temperature, humidity || room.humidity, true);
  res.json({ success: true, state });
});

// Full state reset
app.post("/api/iot/reset", async (req, res) => {
  state = {
    rooms: [
      { id: "room_1", name: "Back Wall (Left Node)", temperature: 24.5, humidity: 45.2, flameStatus: "Safe", lastUpdated: new Date().toISOString(), condition: "Normal" },
      { id: "room_2", name: "Back Wall (Right Node)", temperature: 22.8, humidity: 50.1, flameStatus: "Safe", lastUpdated: new Date().toISOString(), condition: "Normal" },
      { id: "room_3", name: "Window Sensor Node", temperature: 23.1, humidity: 48.7, flameStatus: "Safe", lastUpdated: new Date().toISOString(), condition: "Normal" },
      { id: "room_4", name: "Door Sensor Node", temperature: 25.0, humidity: 44.0, flameStatus: "Safe", lastUpdated: new Date().toISOString(), condition: "Normal" }
    ],
    alerts: [
      { id: "alert_init_1", roomName: "Back Wall (Right Node)", roomId: "room_2", type: "High Temperature", sensorValue: "36.2°C", timestamp: new Date(Date.now() - 3600000).toISOString(), status: "Resolved" }
    ],
    pumpStatus: "OFF",
    pumpTriggeredBy: null,
    emailLogs: [],
    manualPumpOverride: false,
    acknowledgments: []
  };
  sensorHistory = [];
  seedHistoricalData();
  await syncToFirebase();
  res.json({ success: true, state });
});

// Configure Vite middleware and SPA asset serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IIT Anomaly Detection server booted successfully at http://0.0.0.0:${PORT}`);
  });
}

startServer();
