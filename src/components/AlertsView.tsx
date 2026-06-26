import React, { useState } from "react";
import { AlertTriangle, ShieldCheck, Flame, Power, RefreshCw, Filter, Search, Ban } from "lucide-react";
import { Alert, AlertType, IncidentAcknowledgment } from "../types";

interface AlertsViewProps {
  alerts: Alert[];
  acknowledgments?: IncidentAcknowledgment[];
  onResolveAlert: (alertId: string) => Promise<void>;
  onResetState: () => Promise<void>;
}

export default function AlertsView({ alerts, acknowledgments, onResolveAlert, onResetState }: AlertsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Filters calculation
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "All" || alert.type === typeFilter;
    const matchesStatus = statusFilter === "All" || alert.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Get alert styles
  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case "Flame Detected":
        return <Flame className="h-4 w-4 text-red-600 animate-pulse" />;
      case "High Temperature":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "Abnormal Humidity":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "Pump Activated":
        return <Power className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertBadgeColor = (type: AlertType) => {
    switch (type) {
      case "Flame Detected":
        return "bg-red-50 text-red-700 border-red-100";
      case "High Temperature":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Abnormal Humidity":
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "Pump Activated":
        return "bg-blue-50 text-blue-700 border-blue-100";
    }
  };

  return (
    <div className="bg-white dark:bg-[#0d1423]/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden" id="alerts-view-container">
      {/* Alert Header / Filter Section */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800/50" id="alerts-header">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 font-display">
              <AlertTriangle className="h-5 w-5 text-indigo-500" />
              Incidents & Emergency Alarm logs
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Complete historical record of critical room safety triggers, heat spikes, and manual overrides.
            </p>
          </div>

          <button
            onClick={() => {
              if (confirm("Are you sure you want to clear simulated incident logs and reset database state?")) {
                onResetState();
              }
            }}
            className="self-start md:self-auto text-xs font-bold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 flex items-center gap-1 bg-slate-50 hover:bg-red-50 dark:bg-slate-900/60 dark:hover:bg-red-950/40 px-3 py-2 rounded-xl transition duration-150 cursor-pointer border border-slate-200/10 dark:border-slate-800/40"
            id="btn-clear-logs"
          >
            <Ban className="h-4 w-4" />
            Clear Logs
          </button>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="filters-grid">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Room / Incident ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 dark:text-white rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              id="input-alert-search"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 dark:text-slate-250 rounded-xl text-xs font-semibold text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              id="select-type-filter"
            >
              <option value="All">All Incident Types</option>
              <option value="Flame Detected">Flame Detected</option>
              <option value="High Temperature">High Temperature</option>
              <option value="Abnormal Humidity">Abnormal Humidity</option>
              <option value="Pump Activated">Pump Activated</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 dark:text-slate-250 rounded-xl text-xs font-semibold text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              id="select-status-filter"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Warnings</option>
              <option value="Resolved">Resolved logs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert Tables */}
      <div className="overflow-x-auto" id="alerts-table-wrapper">
        {filteredAlerts.length > 0 ? (
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-4 px-6 font-semibold">Alert ID</th>
                <th className="py-4 px-6 font-semibold">Incident Area</th>
                <th className="py-4 px-6 font-semibold">Type</th>
                <th className="py-4 px-6 font-semibold">Sensor Metrics</th>
                <th className="py-4 px-6 font-semibold">Timestamp</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-600 dark:text-slate-300">
              {filteredAlerts.map((alert) => {
                const isActive = alert.status === "Active";

                return (
                  <tr key={alert.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition duration-150">
                    {/* Alert ID */}
                    <td className="py-4 px-6 font-mono text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      #{alert.id.toUpperCase()}
                    </td>

                    {/* Room Name */}
                    <td className="py-4 px-6 font-bold text-slate-800 dark:text-white">
                      {alert.roomName}
                    </td>

                    {/* Alert Type */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${getAlertBadgeColor(alert.type)}`}>
                        {getAlertIcon(alert.type)}
                        {alert.type}
                      </span>
                    </td>

                    {/* Sensor Value */}
                    <td className="py-4 px-6 font-mono font-bold text-slate-700 dark:text-slate-250">
                      {alert.sensorValue}
                    </td>

                    {/* Timestamp */}
                    <td className="py-4 px-6 text-slate-400 dark:text-slate-500 font-medium">
                      {new Date(alert.timestamp).toLocaleString()}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isActive
                          ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40 animate-pulse"
                          : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40"
                      }`}>
                        {isActive ? (
                          <>
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                            Active
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Resolved
                          </>
                        )}
                      </span>
                    </td>

                    {/* Action button */}
                    <td className="py-4 px-6 text-right">
                      {isActive ? (
                        <button
                          onClick={() => onResolveAlert(alert.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition duration-150 shadow-sm cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-medium italic text-[11px]">No actions required</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs" id="empty-alerts">
            <ShieldCheck className="h-10 w-10 text-emerald-500 mb-2" />
            No incidents found matching specified criteria.
          </div>
        )}
      </div>

      {/* Incident Response Acknowledgments Panel */}
      <div className="mt-6 bg-white dark:bg-[#0d1423]/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden" id="incident-acknowledgments-panel">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2 font-display">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
            Operator Acknowledgment Trail
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Audit trail of safety team responses, sign-offs, and critical incident feedback.
          </p>
        </div>

        {acknowledgments && acknowledgments.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {acknowledgments.map((ack) => (
              <div key={ack.id} className="p-5 hover:bg-slate-50/20 dark:hover:bg-slate-900/20 transition duration-150 flex flex-col md:flex-row md:items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-white font-sans">{ack.acknowledgedBy}</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                      Acknowledged
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-200 italic font-medium bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100/60 dark:border-slate-800/60 font-serif text-[13px] mt-1.5 leading-relaxed">
                    "{ack.operatorNotes}"
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-2">
                    Scope of Emergency: {ack.roomsInvolved.join(", ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium block">
                    {new Date(ack.timestamp).toLocaleDateString()} • {new Date(ack.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-[9px] font-mono text-indigo-400 font-semibold uppercase tracking-wider block mt-1">
                    ID: #{ack.id.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
            <ShieldCheck className="h-8 w-8 text-slate-200 dark:text-slate-800 mb-2" />
            No operator acknowledgments logged yet.
          </div>
        )}
      </div>
    </div>
  );
}
