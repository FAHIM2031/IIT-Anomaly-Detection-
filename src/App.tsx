import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  LineChart,
  AlertTriangle,
  Mail,
  Flame,
  Power,
  RotateCcw,
  Sparkles,
  Database,
  Volume2,
  VolumeX,
  Radio,
  Sun,
  Moon
} from "lucide-react";
import { IoTState } from "./types";
import DashboardView from "./components/DashboardView";
import MonitoringView from "./components/MonitoringView";
import AlertsView from "./components/AlertsView";
import NotificationView from "./components/NotificationView";
import PumpView from "./components/PumpView";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "monitoring" | "alerts" | "pump" | "email">("dashboard");
  const [state, setState] = useState<IoTState | null>(null);
  const [isFirebaseMode, setIsFirebaseMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return (localStorage.getItem("theme") as "light" | "dark") || "light";
    } catch {
      return "light";
    }
  });

  // Keep dark class synchronized
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Sound Alarm helper for live presentations!
  useEffect(() => {
    if (soundEnabled && state) {
      const anyFlame = state.rooms.some((r) => r.flameStatus === "Detected");
      if (anyFlame) {
        // Simple synthetic beep tone
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, audioCtx.currentTime); // high A
          gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime); // soft beep
          
          osc.start();
          osc.stop(audioCtx.currentTime + 0.15); // beep duration
        } catch (e) {
          console.log("Audio API not supported / blocked by gesture");
        }
      }
    }
  }, [state, soundEnabled]);

  // Fetch state from full-stack Express API
  const fetchState = async (firebaseOverride?: boolean) => {
    try {
      const fbParam = firebaseOverride !== undefined ? firebaseOverride : isFirebaseMode;
      const res = await fetch(`/api/iot/state?firebase=${fbParam}`);
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error("Error fetching state:", err);
    }
  };

  // Poll state every 1.5 seconds for true real-time response
  useEffect(() => {
    fetchState(); // initial fetch
    const interval = setInterval(() => {
      fetchState();
    }, 1500);
    return () => clearInterval(interval);
  }, [isFirebaseMode]);

  // Trigger Flame Simulation
  const handleTriggerFlame = async (roomId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/iot/simulation/trigger-flame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear Flame Simulation
  const handleClearFlame = async (roomId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/iot/simulation/clear-flame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Pump Manual Override
  const handleManualOverride = async (status: "ON" | "OFF") => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/iot/pump/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Pump Override
  const handleResetOverride = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/iot/pump/reset-override", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Resolve single warning
  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await fetch("/api/iot/alerts/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Acknowledge active incident
  const handleAcknowledgeIncident = async (acknowledgedBy: string, operatorNotes: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/iot/incidents/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledgedBy, operatorNotes }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error("Error acknowledging incident:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Dispatch Manual Email
  const handleSendTestEmail = async (roomName: string, temp: number, hum: number) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/iot/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, temperature: temp, humidity: hum }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        alert("Simulated/SMTP alert email triggered successfully! Check outbox logs below.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Full state reset
  const handleResetState = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/iot/reset", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFirebaseMode = (val: boolean) => {
    setIsFirebaseMode(val);
    fetchState(val);
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl animate-bounce">
            <Sparkles className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">IIT Anomaly Detection</h2>
          <p className="text-sm text-slate-500">Connecting to IoT Gateway Controller...</p>
        </div>
      </div>
    );
  }

  const flameActiveCount = state.rooms.filter((r) => r.flameStatus === "Detected").length;
  const isFireAlert = flameActiveCount > 0;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      theme === "dark" 
        ? "dark bg-[#0b0f19] text-slate-300" 
        : "bg-gradient-to-br from-indigo-50/15 via-slate-50/30 to-sky-50/15 text-slate-600"
    }`}>
      {/* Dynamic Header */}
      <header className="bg-slate-900 text-white py-4 px-6 sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isFireAlert ? "bg-red-600 animate-pulse" : "bg-indigo-600"}`}>
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight">IIT ANOMALY DETECTION</h1>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">IoT Fire Safety & Monitoring Gateway</p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-3">
          {/* Simulated audio alarm toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl transition duration-150 cursor-pointer flex items-center gap-1 text-xs font-semibold ${
              soundEnabled
                ? "bg-slate-800 text-amber-500 border border-amber-500/20"
                : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
            title="Toggle Live Audio Alarm Simulation"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 animate-bounce" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">{soundEnabled ? "Alarm Sound: ON" : "Sound: OFF"}</span>
          </button>

          {/* Reset System Button */}
          <button
            onClick={handleResetState}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition duration-150 flex items-center gap-1 cursor-pointer text-xs font-semibold"
            title="Reset simulated environment stats"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset System</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-100 dark:border-slate-800 flex flex-col p-4 shrink-0 shadow-sm transition-all duration-300">
          
          {/* Sidebar Header with Theme Toggle */}
          <div className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">GATEWAY ACTIVE</span>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 tracking-tight">System Node Status</span>
            </div>
            
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition duration-150 cursor-pointer border border-slate-100 dark:border-slate-800/50 flex items-center justify-center shadow-sm"
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
              id="theme-toggle-btn"
            >
              {theme === "light" ? (
                <motion.div
                  key="moon"
                  initial={{ rotate: -30, scale: 0.8, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 30, scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <Moon className="h-4 w-4 text-indigo-600" />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ rotate: 30, scale: 0.8, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: -30, scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <Sun className="h-4 w-4 text-amber-400" />
                </motion.div>
              )}
            </button>
          </div>

          <div className="space-y-1.5 flex-1">
            {/* Dashboard Navigation button */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-indigo-50 text-indigo-700 font-extrabold shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5 shrink-0" />
              <span>Room Overview</span>
              {isFireAlert && (
                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-ping" />
              )}
            </button>

            {/* Realtime Graph Navigation button */}
            <button
              onClick={() => setActiveTab("monitoring")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                activeTab === "monitoring"
                  ? "bg-indigo-50 text-indigo-700 font-extrabold shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <LineChart className="h-4.5 w-4.5 shrink-0" />
              <span>Live Sensor History</span>
            </button>

            {/* Actuator Relay Navigation button */}
            <button
              onClick={() => setActiveTab("pump")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                activeTab === "pump"
                  ? "bg-indigo-50 text-indigo-700 font-extrabold shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Power className="h-4.5 w-4.5 shrink-0" />
              <span>Pump & Sprinkler Actuator</span>
              {state.pumpStatus === "ON" && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 font-extrabold rounded">
                  ON
                </span>
              )}
            </button>

            {/* Incident Alert Logs Navigation button */}
            <button
              onClick={() => setActiveTab("alerts")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                activeTab === "alerts"
                  ? "bg-indigo-50 text-indigo-700 font-extrabold shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
              <span>Incidents & Alarms</span>
              {state.alerts.filter((a) => a.status === "Active").length > 0 && (
                <span className="ml-auto bg-amber-500 text-white font-bold rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                  {state.alerts.filter((a) => a.status === "Active").length}
                </span>
              )}
            </button>

            {/* Email notification Dispatch outbox */}
            <button
              onClick={() => setActiveTab("email")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                activeTab === "email"
                  ? "bg-indigo-50 text-indigo-700 font-extrabold shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Mail className="h-4.5 w-4.5 shrink-0" />
              <span>Notification Dispatch</span>
            </button>
          </div>

          {/* Connection Status Footprint */}
          <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className={`w-2 h-2 bg-emerald-500 rounded-full ${isFirebaseMode ? "animate-pulse" : ""}`} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telemetry Link</p>
                <p className="text-[11px] font-bold text-slate-700 truncate">
                  {isFirebaseMode ? "Firebase RTDB" : "Stateful Simulation"}
                </p>
              </div>
            </div>
            
            {state.firebaseConfigured && (
              <div className="flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50/50 p-2 rounded-lg font-mono truncate">
                <Database className="h-3 w-3" />
                Firebase Active
              </div>
            )}
          </div>
        </aside>

        {/* Content Region */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "dashboard" && (
                <DashboardView
                  state={state}
                  onTriggerFlame={handleTriggerFlame}
                  onClearFlame={handleClearFlame}
                  onManualOverride={handleManualOverride}
                  onResetOverride={handleResetOverride}
                  onAcknowledgeIncident={handleAcknowledgeIncident}
                />
              )}

              {activeTab === "monitoring" && (
                <MonitoringView
                  state={state}
                  isFirebaseMode={isFirebaseMode}
                  onToggleFirebaseMode={handleToggleFirebaseMode}
                  onRefresh={fetchState}
                  isLoading={isLoading}
                />
              )}

              {activeTab === "alerts" && (
                <AlertsView
                  alerts={state.alerts}
                  acknowledgments={state.acknowledgments}
                  onResolveAlert={handleResolveAlert}
                  onResetState={handleResetState}
                />
              )}

              {activeTab === "pump" && (
                <PumpView
                  state={state}
                  onManualOverride={handleManualOverride}
                  onResetOverride={handleResetOverride}
                  isLoading={isLoading}
                />
              )}

              {activeTab === "email" && (
                <NotificationView
                  rooms={state.rooms}
                  emailLogs={state.emailLogs}
                  onSendTestEmail={handleSendTestEmail}
                  isLoading={isLoading}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
