export interface Room {
  id: string;
  name: string;
  temperature: number;
  humidity: number;
  flameStatus: "Safe" | "Detected";
  lastUpdated: string;
  condition: "Normal" | "Warning" | "Critical";
}

export type AlertType = "High Temperature" | "Abnormal Humidity" | "Flame Detected" | "Pump Activated";

export interface Alert {
  id: string;
  roomName: string;
  roomId: string;
  type: AlertType;
  sensorValue: string;
  timestamp: string;
  status: "Active" | "Resolved";
}

export interface EmailLog {
  id: string;
  subject: string;
  body: string;
  recipient: string;
  timestamp: string;
  status: "Sent" | "Failed" | "Simulated";
}

export interface IncidentAcknowledgment {
  id: string;
  timestamp: string;
  operatorNotes: string;
  roomsInvolved: string[];
  acknowledgedBy: string;
}

export interface IoTState {
  rooms: Room[];
  alerts: Alert[];
  pumpStatus: "ON" | "OFF";
  pumpTriggeredBy: string | null;
  emailLogs: EmailLog[];
  manualPumpOverride: boolean;
  acknowledgments?: IncidentAcknowledgment[];
}

export interface SensorDataPoint {
  time: string;
  "Back Wall L Temp": number;
  "Back Wall L Hum": number;
  "Back Wall R Temp": number;
  "Back Wall R Hum": number;
  "Window Temp": number;
  "Window Hum": number;
  "Door Temp": number;
  "Door Hum": number;
}
