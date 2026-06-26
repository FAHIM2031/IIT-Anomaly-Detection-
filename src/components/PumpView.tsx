import React from "react";
import { Power, Radio, ShieldCheck, ShieldAlert, Cpu, ToggleLeft, ToggleRight, RotateCcw, Droplet, Layers } from "lucide-react";
import { IoTState } from "../types";

interface PumpViewProps {
  state: IoTState;
  onManualOverride: (status: "ON" | "OFF") => Promise<void>;
  onResetOverride: () => Promise<void>;
  isLoading: boolean;
}

export default function PumpView({
  state,
  onManualOverride,
  onResetOverride,
  isLoading,
}: PumpViewProps) {
  const { pumpStatus, pumpTriggeredBy, manualPumpOverride, rooms } = state;

  const isPumpOn = pumpStatus === "ON";
  const anyFlame = rooms.some((r) => r.flameStatus === "Detected");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="pump-view-container">
      {/* Schematic Layout: Water sprinkler control */}
      <div className="lg:col-span-2 space-y-6">
        {/* Status Panel */}
        <div className="bg-white dark:bg-[#0d1423]/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 p-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-1.5 border-b border-slate-50 dark:border-slate-850 pb-3 font-display">
            <Cpu className="h-4.5 w-4.5 text-indigo-500" />
            Sprinkler Valve Relay Panel
          </h3>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/40">
            {/* Status Indicator */}
            <div className="flex items-center gap-4">
              <div
                className={`p-5 rounded-2xl shadow-md flex items-center justify-center ${
                  isPumpOn
                    ? "bg-blue-600 text-white animate-pulse"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
                id="pump-status-indicator"
              >
                <Power className="h-10 w-10" />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Actuator Relay Status</p>
                <h2 className={`text-3xl font-extrabold font-mono mt-1 ${isPumpOn ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-200"}`}>
                  WATER PUMP: {pumpStatus}
                </h2>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                  <span className={`w-2 h-2 rounded-full ${isPumpOn ? "bg-blue-500" : "bg-slate-400"}`} />
                  {isPumpOn ? (
                    <span>
                      Active: Sprinkler valves open (Source: <span className="font-bold text-blue-750 dark:text-blue-400 underline">{pumpTriggeredBy || "System"}</span>)
                    </span>
                  ) : (
                    <span>Valves closed • Actuator waiting on Standby</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick manual overrides */}
            <div className="flex flex-col gap-2 w-full md:w-auto">
              {manualPumpOverride && (
                <button
                  onClick={onResetOverride}
                  disabled={isLoading}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded-xl text-xs transition duration-150 cursor-pointer flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700/60"
                  id="btn-reset-override"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Return to Automatic Mode
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Relay Controller Logic Schematic details */}
        <div className="bg-white dark:bg-[#0d1423]/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 p-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-1.5 font-display">
            <Layers className="h-4.5 w-4.5 text-indigo-500" />
            Automatic Fire Safety Interlocking Cascade
          </h3>

          <div className="space-y-4" id="interlocking-steps">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${anyFlame ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" : "bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-400"}`}>
                  1
                </span>
                <div className="w-0.5 h-10 bg-slate-100 dark:bg-slate-800/50" />
              </div>
              <div>
                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-xs">Flame Sensor Trigger Detection</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Continuous polling loop of 4 infrared digital flame inputs. High states indicate infrared radiation from a fire source.
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${anyFlame ? "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40" : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40"}`}>
                    {anyFlame ? "CURRENT STATE: ACTIVE ALARM" : "CURRENT STATE: COLD STANDBY"}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${anyFlame ? "bg-red-100 text-red-600 animate-pulse dark:bg-red-950/40 dark:text-red-400" : "bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500"}`}>
                  2
                </span>
                <div className="w-0.5 h-10 bg-slate-100 dark:bg-slate-800/50" />
              </div>
              <div>
                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-xs">Solenoid & Pump Relay Actuation</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Microcontroller automatically triggers the high-power AC relay module to route energy to the physical water pump sprinkler.
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${isPumpOn ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40" : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800"}`}>
                    {isPumpOn ? "CURRENT STATE: ENERGIZED" : "CURRENT STATE: DE-ENERGIZED"}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isPumpOn ? "bg-blue-100 text-blue-600 animate-bounce dark:bg-blue-950/40 dark:text-blue-450" : "bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500"}`}>
                  3
                </span>
              </div>
              <div>
                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-xs">Automatic Extinguishing Containment</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  The water pump routes heavy moisture suppression. Once flame sensor status drops back to "Safe", the relay resets automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Override Side Controls Card */}
      <div className="bg-white dark:bg-[#0d1423]/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 p-6 h-fit" id="pump-override-card">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-1.5 border-b border-slate-50 dark:border-slate-850 pb-3 font-display">
          <Radio className="h-4.5 w-4.5 text-indigo-500" />
          Hardware Override Deck
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 leading-relaxed">
          Manually bypass automatic interlocking logic. Toggle water pump module ON or OFF directly for emergency diagnostic testing.
        </p>

        {/* Mode Indicator */}
        <div className="p-4 rounded-xl mb-4 border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-850">
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Control Mode</p>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">
              {manualPumpOverride ? "MANUAL OVERRIDE ACTIVE" : "AUTOMATED CASCADE MODE"}
            </h4>
          </div>
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${manualPumpOverride ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400" : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400"}`}>
            {manualPumpOverride ? "Manual" : "Auto"}
          </span>
        </div>

        {/* Actions list */}
        <div className="space-y-3">
          <button
            onClick={() => onManualOverride("ON")}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
              isPumpOn && manualPumpOverride
                ? "bg-blue-600 text-white shadow-blue-100"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-850 dark:border-slate-800/60 border border-slate-100"
            }`}
            id="btn-override-on"
          >
            <Droplet className="h-4 w-4" />
            Manually Force Pump ON
          </button>

          <button
            onClick={() => onManualOverride("OFF")}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
              !isPumpOn && manualPumpOverride
                ? "bg-slate-800 dark:bg-slate-700 text-white"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-850 dark:border-slate-800/60 border border-slate-100"
            }`}
            id="btn-override-off"
          >
            <Power className="h-4 w-4" />
            Manually Force Pump OFF
          </button>
        </div>

        <div className="mt-5 p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100/50 dark:border-amber-900/30 flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p className="leading-relaxed font-medium">
            Warning: Forcing the pump OFF will disable automatic water sprinkling even if an active fire flame is detected in a classroom! Only use for hardware calibration checks.
          </p>
        </div>
      </div>
    </div>
  );
}
