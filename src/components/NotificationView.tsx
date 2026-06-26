import React, { useState } from "react";
import { Mail, Send, CheckCircle, AlertOctagon, ChevronDown, ChevronUp, Search, Info } from "lucide-react";
import { EmailLog, Room } from "../types";

interface NotificationViewProps {
  rooms: Room[];
  emailLogs: EmailLog[];
  onSendTestEmail: (roomName: string, temp: number, hum: number) => Promise<void>;
  isLoading: boolean;
}

export default function NotificationView({
  rooms,
  emailLogs,
  onSendTestEmail,
  isLoading,
}: NotificationViewProps) {
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || "");
  const [customTemp, setCustomTemp] = useState(42.5);
  const [customHum, setCustomHum] = useState(15.2);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [searchMail, setSearchMail] = useState("");

  const toggleExpand = (id: string) => {
    setExpandedEmailId(expandedEmailId === id ? null : id);
  };

  const handleManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (!room) return;
    await onSendTestEmail(room.name, customTemp, customHum);
  };

  // Filter logs
  const filteredLogs = emailLogs.filter((log) => {
    return (
      log.subject.toLowerCase().includes(searchMail.toLowerCase()) ||
      log.recipient.toLowerCase().includes(searchMail.toLowerCase())
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="notification-center">
      {/* Test Email Form Card */}
      <div className="bg-white dark:bg-[#0d1423]/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 p-6 h-fit" id="email-dispatcher-card">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-1.5 border-b border-slate-50 dark:border-slate-850 pb-3 font-display">
          <Mail className="h-4.5 w-4.5 text-indigo-500" />
          Manual Incident Test Form
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 leading-relaxed">
          Trigger a manual emergency alert simulation to test SMTP mail servers or dashboard outbox streams.
        </p>

        <form onSubmit={handleManualDispatch} className="space-y-4">
          {/* Target Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Target Zone</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          {/* Simulated Temperature */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Simulated Heat (°C)</label>
            <input
              type="number"
              step="0.1"
              value={customTemp}
              onChange={(e) => setCustomTemp(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Simulated Humidity */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Simulated Humidity (%)</label>
            <input
              type="number"
              step="0.1"
              value={customHum}
              onChange={(e) => setCustomHum(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-150 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            id="btn-dispatch-test-email"
          >
            <Send className="h-3.5 w-3.5" />
            {isLoading ? "Dispatching..." : "Send Test Incident Email"}
          </button>
        </form>

        <div className="mt-5 p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-start gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Configure SMTP values (<code className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-slate-200/5 dark:border-slate-800/60">SMTP_HOST</code>, etc.) in your environment secrets to route alerts to real email inboxes. Otherwise, check our simulated outbox.
          </p>
        </div>
      </div>

      {/* Outbox / Sent Alerts Viewer */}
      <div className="bg-white dark:bg-[#0d1423]/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 p-6 lg:col-span-2" id="outbox-viewer-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-50 dark:border-slate-800/40 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 font-display">
              <Mail className="h-4.5 w-4.5 text-indigo-500" />
              Automated Incident Outbox Logs
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Record of triggered automated system alert and critical fire notification emails.
            </p>
          </div>

          {/* Search Outbox */}
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Outbox..."
              value={searchMail}
              onChange={(e) => setSearchMail(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 dark:text-white rounded-xl text-xs font-semibold placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Mail List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1" id="outbox-list">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => {
              const isExpanded = expandedEmailId === log.id;
              const isSimulated = log.status === "Simulated";
              const isSent = log.status === "Sent";

              return (
                <div
                  key={log.id}
                  className={`border rounded-xl transition duration-150 overflow-hidden ${
                    isExpanded ? "border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/5 dark:bg-indigo-950/20 shadow-sm" : "border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700"
                  }`}
                  id={`email-log-${log.id}`}
                >
                  {/* Mail Header summary */}
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${isSent ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-450"}`}>
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 text-xs truncate max-w-[300px] sm:max-w-md">
                          {log.subject}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
                          To: <span className="font-bold text-slate-600 dark:text-slate-350">{log.recipient}</span> •{" "}
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Delivery Status Badge */}
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isSent
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : isSimulated
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400"
                          : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400"
                      }`}>
                        {log.status}
                      </span>

                      {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400 dark:text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                    </div>
                  </div>

                  {/* Mail expanded body */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-indigo-50/50 dark:border-indigo-950/50 pt-3 bg-slate-50/50 dark:bg-slate-900/40">
                      <div className="flex justify-between items-center mb-2 text-[10px] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/40 pb-2">
                        <span>SMTP Delivery Route: {isSent ? "Secured SMTP Relay" : isSimulated ? "Sandbox Simulated" : "SMTP Delivery Blocked"}</span>
                        <span>Mail ID: #{log.id}</span>
                      </div>
                      <pre className="font-mono text-[10px] bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner border border-slate-200/5 dark:border-slate-800/60">
                        {log.body}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
              <Mail className="h-8 w-8 text-slate-300 dark:text-slate-800 mb-1.5" />
              Outbox is currently empty. Fire events will populate alerts here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
