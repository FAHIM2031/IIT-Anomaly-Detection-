import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Thermometer, Droplets, Flame, ShieldCheck, AlertTriangle, AlertOctagon, Clock, Power, ShieldAlert, Sparkles, Cpu, Send, CheckCircle } from "lucide-react";
import { IoTState, Room } from "../types";
import PointCloudMap from "./PointCloudMap";

interface DashboardViewProps {
  state: IoTState;
  onTriggerFlame: (roomId: string) => Promise<void>;
  onClearFlame: (roomId: string) => Promise<void>;
  onManualOverride: (status: "ON" | "OFF") => Promise<void>;
  onResetOverride: () => Promise<void>;
  onAcknowledgeIncident: (acknowledgedBy: string, operatorNotes: string) => Promise<void>;
}

export default function DashboardView({
  state,
  onTriggerFlame,
  onClearFlame,
  onManualOverride,
  onResetOverride,
  onAcknowledgeIncident,
}: DashboardViewProps) {
  const { rooms, pumpStatus, pumpTriggeredBy } = state;

  const [operatorName, setOperatorName] = useState("");
  const [notes, setNotes] = useState("");
  const [isAckSubmitting, setIsAckSubmitting] = useState(false);

  // Compute stats
  const totalRooms = rooms.length;
  const flameDetectedCount = rooms.filter((r) => r.flameStatus === "Detected").length;
  const abnormalCount = rooms.filter(
    (r) => r.temperature > 35.0 || r.humidity < 30.0 || r.humidity > 80.0
  ).length;

  const isFireAlert = flameDetectedCount > 0;

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Real-time Fire Alert Banner */}
      <AnimatePresence>
        {isFireAlert && (
          <motion.div
            key="fire-alert-banner"
            initial={{ opacity: 0, scale: 0.96, y: -25 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              transition: { type: "spring", stiffness: 260, damping: 20 }
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.96, 
              y: -15,
              transition: { duration: 0.25 }
            }}
            className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-5 shadow-lg relative overflow-hidden"
            id="fire-alert-banner"
          >
            {/* Pulsing fire glow background */}
            <div className="absolute inset-0 bg-red-600/5 animate-pulse" />

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-600 text-white rounded-xl shadow-md animate-bounce">
                  <Flame className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2 tracking-tight text-red-900">
                    <ShieldAlert className="h-5 w-5 text-red-600 animate-pulse" />
                    CRITICAL EMERGENCY: FIRE / FLAME DETECTED!
                  </h3>
                  <p className="text-sm text-red-700 font-medium mt-1">
                    Flame sensors ignited in:{" "}
                    <span className="font-bold underline text-red-800">
                      {rooms
                        .filter((r) => r.flameStatus === "Detected")
                        .map((r) => r.name)
                        .join(", ")}
                    </span>
                  </p>
                  <p className="text-xs text-red-600 mt-2 font-mono bg-red-100/60 px-2 py-1 rounded inline-block">
                    ACTION TAKEN: WATER PUMP ACTIVATED AUTOMATICALLY ({state.pumpStatus}) • EMERGENCY EMAIL DISPATCHED
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  onClick={() => {
                    // Extinguish all flames
                    rooms
                      .filter((r) => r.flameStatus === "Detected")
                      .forEach((r) => onClearFlame(r.id));
                  }}
                  className="bg-red-750 hover:bg-red-850 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-200 shadow-md flex items-center gap-1.5 cursor-pointer border border-red-700"
                  id="btn-extinguish-all"
                >
                  <ShieldCheck className="h-4 w-4" />
                  EXTINGUISH FIRE (RESET SENSOR)
                </button>
              </div>
            </div>

            {/* Operator Acknowledgment Section */}
            <div className="mt-5 pt-4 border-t border-red-200/60 flex flex-col gap-3 relative z-10">
              <h4 className="text-xs font-extrabold text-red-900 flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle className="h-4 w-4 text-red-750" />
                Incident Control & Acknowledgment Log
              </h4>

              {/* List existing acknowledgments for this incident */}
              {state.acknowledgments && state.acknowledgments.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto mb-1 pr-1">
                  {state.acknowledgments.map((ack) => (
                    <div key={ack.id} className="bg-white/70 rounded-xl p-3 border border-red-200/55 text-xs text-red-950 shadow-sm">
                      <div className="flex items-center justify-between font-bold text-[11px] text-red-900 mb-1">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block mr-1" />
                          Acknowledge Receipt by <span className="underline font-mono text-red-950 font-bold">{ack.acknowledgedBy}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(ack.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-700 mt-1 pl-3 border-l-2 border-red-300 italic">
                        "{ack.operatorNotes}"
                      </p>
                      <p className="text-[10px] text-slate-400 pl-3 mt-1">
                        Affected classrooms: {ack.roomsInvolved.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Form to submit a new acknowledgment */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!operatorName.trim()) {
                    alert("Please enter Operator name or Email to acknowledge.");
                    return;
                  }
                  setIsAckSubmitting(true);
                  try {
                    await onAcknowledgeIncident(operatorName, notes || "Incident response protocol initiated.");
                    setNotes("");
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsAckSubmitting(false);
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end bg-red-100/40 p-3 rounded-xl border border-red-200/50"
              >
                <div className="md:col-span-4 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-red-900 uppercase tracking-wide">Operator Name / Position</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Khaled / Emergency Team"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="bg-white/90 border border-red-200 rounded-lg px-2.5 py-1.5 text-xs text-red-950 placeholder-red-400/80 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
                <div className="md:col-span-6 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-red-900 uppercase tracking-wide">Response Notes / Instructions</label>
                  <input
                    type="text"
                    placeholder="e.g. Initiating dispatch to Back Wall; verifying sprinkler action."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-white/90 border border-red-200 rounded-lg px-2.5 py-1.5 text-xs text-red-950 placeholder-red-400/80 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={isAckSubmitting}
                    className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-3 rounded-lg text-xs transition duration-150 flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer border border-red-600 h-[32px]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isAckSubmitting ? "Logging..." : "ACKNOWLEDGE"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        {/* Total Rooms Monitored */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between" id="stat-total-rooms">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Classroom Nodes</p>
            <h4 className="text-3xl font-bold text-slate-800 mt-1 font-mono">{totalRooms}</h4>
            <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              All 4 active in Classroom
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Cpu className="h-6 w-6" />
          </div>
        </div>

        {/* Rooms with abnormal conditions */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between" id="stat-abnormal-rooms">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Abnormal Readings</p>
            <h4 className="text-3xl font-bold text-slate-800 mt-1 font-mono">{abnormalCount}</h4>
            <div className="text-xs mt-1 font-medium">
              {abnormalCount > 0 ? (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> High heat / dry air warnings
                </span>
              ) : (
                <span className="text-slate-500">All coordinates stable</span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${abnormalCount > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500"}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* Flame sensor stats */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between" id="stat-flame-sensors">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Flame Alarms</p>
            <h4 className={`text-3xl font-bold mt-1 font-mono ${isFireAlert ? "text-red-600 animate-pulse" : "text-slate-800"}`}>
              {flameDetectedCount}
            </h4>
            <div className="text-xs mt-1 font-medium">
              {isFireAlert ? (
                <span className="text-red-600 font-bold flex items-center gap-1">
                  CRITICAL: FIRE ACTIVE!
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Fire safety safe
                </span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${isFireAlert ? "bg-red-100 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
            <Flame className="h-6 w-6" />
          </div>
        </div>

        {/* Sprinkler pump status */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between" id="stat-pump">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sprinkler Solenoid</p>
            <h4 className={`text-3xl font-bold mt-1 font-mono ${pumpStatus === "ON" ? "text-blue-600" : "text-slate-700"}`}>
              {pumpStatus}
            </h4>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {pumpStatus === "ON" ? `By: ${pumpTriggeredBy || "System"}` : "Standby • Automated ready"}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${pumpStatus === "ON" ? "bg-blue-100 text-blue-600 animate-spin-slow" : "bg-slate-50 text-slate-400"}`}>
            <Power className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* 3D Classroom Point Cloud Map */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6" id="classroom-layout-map-card">
        <div className="border-b border-slate-50 pb-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-indigo-500" />
                3D Classroom Floor Mapping Point Cloud
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time spatial point cloud of 4 fire safety sensors mapped inside the IIT Smart Classroom. Points dynamically blend colors based on thermal gradients.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">3D Spatial Feed Active</span>
            </div>
          </div>
        </div>

        {/* Beautiful 3D Point Cloud Canvas view */}
        <PointCloudMap
          rooms={rooms}
          onTriggerFlame={onTriggerFlame}
          onClearFlame={onClearFlame}
        />
      </div>

      {/* Room Detail Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Classroom Coordinates Node List
          </h2>
          <span className="text-xs font-medium text-slate-500 font-mono bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            Autosync: 3s
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="rooms-grid">
          {rooms.map((room) => {
            const isFlame = room.flameStatus === "Detected";
            const isWarning = room.condition === "Warning";
            const isCritical = room.condition === "Critical";

            return (
              <div
                key={room.id}
                className={`bg-white rounded-2xl shadow-sm border p-6 transition-all duration-300 relative overflow-hidden ${
                  isFlame
                    ? "border-red-300 ring-2 ring-red-500/10 shadow-red-100/50"
                    : isWarning
                    ? "border-amber-200 ring-2 ring-amber-500/5 shadow-amber-50/50"
                    : "border-slate-100 hover:border-slate-200"
                }`}
                id={`room-card-${room.id}`}
              >
                {/* Background alert glow */}
                {isFlame && <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />}

                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4 relative z-10">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg tracking-tight">{room.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-mono">
                      <Clock className="h-3.5 w-3.5" />
                      Updated: {new Date(room.lastUpdated).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Room Condition Badge */}
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      isCritical
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : isWarning
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }`}
                    id={`badge-${room.id}`}
                  >
                    {room.condition}
                  </span>
                </div>

                {/* Card Body Sensors */}
                <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                  {/* Temp Gauge */}
                  <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100/50 flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${room.temperature > 35.0 ? "bg-amber-100 text-amber-600 animate-pulse" : "bg-indigo-50 text-indigo-600"}`}>
                      <Thermometer className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Temperature</p>
                      <h4 className={`text-xl font-bold font-mono ${room.temperature > 35.0 ? "text-amber-600 font-semibold" : "text-slate-800"}`}>
                        {room.temperature.toFixed(1)}°C
                      </h4>
                    </div>
                  </div>

                  {/* Humidity Gauge */}
                  <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100/50 flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${(room.humidity < 30.0 || room.humidity > 80.0) ? "bg-amber-100 text-amber-600" : "bg-sky-50 text-sky-600"}`}>
                      <Droplets className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Humidity</p>
                      <h4 className={`text-xl font-bold font-mono ${ (room.humidity < 30.0 || room.humidity > 80.0) ? "text-amber-600" : "text-slate-800"}`}>
                        {room.humidity.toFixed(1)}%
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Flame Status / Simulation Controllers */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-50 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${isFlame ? "bg-red-100 text-red-600 animate-bounce" : "bg-emerald-100 text-emerald-600"}`}>
                      {isFlame ? <Flame className="h-4.5 w-4.5" /> : <ShieldCheck className="h-4.5 w-4.5" />}
                    </div>
                    <span className="text-xs font-bold text-slate-600">
                      Flame State:{" "}
                      <span className={isFlame ? "text-red-600 font-extrabold animate-pulse" : "text-emerald-600 font-semibold"}>
                        {isFlame ? "Detected! 🔥" : "Safe • Secure"}
                      </span>
                    </span>
                  </div>

                  <div className="w-full sm:w-auto">
                    {isFlame ? (
                      <button
                        onClick={() => onClearFlame(room.id)}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition duration-200 shadow-sm shadow-emerald-200 cursor-pointer flex items-center justify-center gap-1"
                        id={`btn-extinguish-${room.id}`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Extinguish
                      </button>
                    ) : (
                      <button
                        onClick={() => onTriggerFlame(room.id)}
                        className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition duration-200 shadow-sm shadow-red-200 cursor-pointer flex items-center justify-center gap-1"
                        id={`btn-simulate-${room.id}`}
                      >
                        <Flame className="h-3.5 w-3.5" /> Ignite Flame
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
