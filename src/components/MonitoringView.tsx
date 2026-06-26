import React from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, AreaChart, Area, Cell 
} from "recharts";
import { 
  Thermometer, Droplets, Flame, ShieldCheck, Database, RefreshCw, Radio,
  TrendingUp, TrendingDown, Sparkles, Activity, AlertOctagon, BarChart3, HelpCircle 
} from "lucide-react";
import { IoTState } from "../types";

interface MonitoringViewProps {
  state: IoTState;
  isFirebaseMode: boolean;
  onToggleFirebaseMode: (val: boolean) => void;
  onRefresh: () => Promise<void>;
  isLoading: boolean;
}

export default function MonitoringView({
  state,
  isFirebaseMode,
  onToggleFirebaseMode,
  onRefresh,
  isLoading,
}: MonitoringViewProps) {
  const { rooms, sensorHistory, firebaseConfigured, firebaseUrl } = state as any;

  // Compute highly accurate analytics from the live database buffer
  const computeStats = () => {
    if (!sensorHistory || sensorHistory.length === 0) {
      return {
        avgTemp: 0,
        peakTemp: 0,
        peakTempSensor: "N/A",
        avgHum: 0,
        minHum: 0,
        minHumSensor: "N/A",
        tempStdDev: 0,
        fireCatalystScore: 0,
        fireCatalystLabel: "Low",
        trend: "Stable" as "Rising" | "Stable" | "Falling",
      };
    }

    const tempKeys = ["Back Wall L Temp", "Back Wall R Temp", "Window Temp", "Door Temp"];
    const humKeys = ["Back Wall L Hum", "Back Wall R Hum", "Window Hum", "Door Hum"];

    let totalTempSum = 0;
    let tempCount = 0;
    let maxTemp = -Infinity;
    let maxTempSensor = "";

    let totalHumSum = 0;
    let humCount = 0;
    let minHum = Infinity;
    let minHumSensor = "";

    const allTemps: number[] = [];

    sensorHistory.forEach((item: any) => {
      tempKeys.forEach((key) => {
        const val = parseFloat(item[key]);
        if (!isNaN(val)) {
          totalTempSum += val;
          tempCount++;
          allTemps.push(val);
          if (val > maxTemp) {
            maxTemp = val;
            maxTempSensor = key.replace(" Temp", "");
          }
        }
      });

      humKeys.forEach((key) => {
        const val = parseFloat(item[key]);
        if (!isNaN(val)) {
          totalHumSum += val;
          humCount++;
          if (val < minHum) {
            minHum = val;
            minHumSensor = key.replace(" Hum", "");
          }
        }
      });
    });

    const avgTemp = tempCount > 0 ? totalTempSum / tempCount : 0;
    const avgHum = humCount > 0 ? totalHumSum / humCount : 0;

    // Standard Deviation of Temperatures
    let tempStdDev = 0;
    if (allTemps.length > 0) {
      const mean = avgTemp;
      const sqDiffs = allTemps.map((val) => Math.pow(val - mean, 2));
      const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / sqDiffs.length;
      tempStdDev = Math.sqrt(avgSqDiff);
    }

    // Fire Risk Catalyst Score: high temperature combined with low humidity increases susceptibility
    // Ideal normal is 22°C and 50% humidity.
    const tempFactor = Math.max(0, Math.min(100, ((avgTemp - 15) / 35) * 100));
    const humFactor = Math.max(0, Math.min(100, ((80 - avgHum) / 60) * 100));
    const fireCatalystScore = Math.round((tempFactor * 0.6) + (humFactor * 0.4));

    let fireCatalystLabel: "Low" | "Moderate" | "Elevated" | "High" = "Low";
    if (fireCatalystScore > 70) fireCatalystLabel = "High";
    else if (fireCatalystScore > 45) fireCatalystLabel = "Elevated";
    else if (fireCatalystScore > 22) fireCatalystLabel = "Moderate";

    // Determine simple directional trend by splitting the history dataset in half
    let trend: "Rising" | "Stable" | "Falling" = "Stable";
    if (sensorHistory.length >= 4) {
      const half = Math.floor(sensorHistory.length / 2);
      const firstHalf = sensorHistory.slice(0, half);
      const secondHalf = sensorHistory.slice(half);

      const getAvg = (arr: any[]) => {
        let sum = 0;
        let count = 0;
        arr.forEach((item) => {
          tempKeys.forEach((k) => {
            const val = parseFloat(item[k]);
            if (!isNaN(val)) {
              sum += val;
              count++;
            }
          });
        });
        return count > 0 ? sum / count : 0;
      };

      const firstAvg = getAvg(firstHalf);
      const secondAvg = getAvg(secondHalf);

      if (secondAvg - firstAvg > 0.4) trend = "Rising";
      else if (firstAvg - secondAvg > 0.4) trend = "Falling";
    }

    return {
      avgTemp,
      peakTemp: maxTemp === -Infinity ? 0 : maxTemp,
      peakTempSensor: maxTempSensor || "N/A",
      avgHum,
      minHum: minHum === Infinity ? 0 : minHum,
      minHumSensor: minHumSensor || "N/A",
      tempStdDev,
      fireCatalystScore,
      fireCatalystLabel,
      trend,
    };
  };

  const stats = computeStats();

  // Create correlation dataset (averages of temp & humidity over time)
  const correlationData = (sensorHistory || []).map((item: any) => {
    const temps = [item["Back Wall L Temp"], item["Back Wall R Temp"], item["Window Temp"], item["Door Temp"]].map(parseFloat);
    const hums = [item["Back Wall L Hum"], item["Back Wall R Hum"], item["Window Hum"], item["Door Hum"]].map(parseFloat);
    
    const avgT = temps.reduce((a, b) => a + b, 0) / temps.length;
    const avgH = hums.reduce((a, b) => a + b, 0) / hums.length;
    
    return {
      time: item.time,
      "Avg Temp (°C)": parseFloat(avgT.toFixed(1)),
      "Avg Hum (%)": parseFloat(avgH.toFixed(1)),
    };
  });

  // Calculate Sensor Maximums & Minimums from current telemetry buffer
  const getSensorCompareData = () => {
    const sensors = [
      { name: "Back Wall L", tempKey: "Back Wall L Temp", humKey: "Back Wall L Hum" },
      { name: "Back Wall R", tempKey: "Back Wall R Temp", humKey: "Back Wall R Hum" },
      { name: "Window", tempKey: "Window Temp", humKey: "Window Hum" },
      { name: "Door", tempKey: "Door Temp", humKey: "Door Hum" },
    ];

    return sensors.map((sensor) => {
      const temps = (sensorHistory || []).map((h: any) => parseFloat(h[sensor.tempKey])).filter((v: number) => !isNaN(v));
      const hums = (sensorHistory || []).map((h: any) => parseFloat(h[sensor.humKey])).filter((v: number) => !isNaN(v));

      const maxT = temps.length > 0 ? Math.max(...temps) : 0;
      const minH = hums.length > 0 ? Math.min(...hums) : 0;

      return {
        sensor: sensor.name,
        "Max Temp": parseFloat(maxT.toFixed(1)),
        "Min Humidity": parseFloat(minH.toFixed(1)),
      };
    });
  };

  const sensorCompareData = getSensorCompareData();

  return (
    <div className="space-y-6" id="monitoring-container">
      {/* Real-time DB Configuration Control Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" id="db-config-panel">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-500" />
            Backend Connection Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Choose whether to pull real-time telemetry from the stateful local memory simulator or sync live to a connected Google Firebase Realtime Database.
          </p>
          {firebaseConfigured && (
            <p className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded mt-2 inline-block">
              Connected RTDB URL: {firebaseUrl}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Data Source Toggles */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center">
            <button
              onClick={() => onToggleFirebaseMode(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${
                !isFirebaseMode
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Simulated Node
            </button>
            <button
              onClick={() => {
                if (!firebaseConfigured) {
                  alert(
                    "No Firebase Realtime Database URL detected in .env.example! To map a real database, set FIREBASE_DATABASE_URL in .env and restart the dev server."
                  );
                }
                onToggleFirebaseMode(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer flex items-center gap-1 ${
                isFirebaseMode
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              Firebase RTDB
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 rounded-xl transition duration-150 cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold"
            id="btn-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Sync
          </button>
        </div>
      </div>

      {/* Telemetry Statistical Insights */}
      <div className="space-y-4" id="telemetry-stats-panel">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
              Environmental Stats & Buffer Metrics
            </h3>
            <p className="text-[11px] text-slate-400">
              Live mathematical aggregation of sensor records pulled from the database.
            </p>
          </div>
          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
            BUFFER SIZE: {sensorHistory?.length || 0} ITEMS
          </span>
        </div>

        {/* Bento Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Mean Temperature & Direction */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200/80 transition duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mean Temp</span>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {stats.avgTemp.toFixed(1)}°C
                </div>
              </div>
              <div className={`p-2 rounded-xl ${stats.trend === "Rising" ? "bg-red-50 text-red-500" : stats.trend === "Falling" ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-400"}`}>
                {stats.trend === "Rising" ? (
                  <TrendingUp className="h-5 w-5 animate-bounce" />
                ) : stats.trend === "Falling" ? (
                  <TrendingDown className="h-5 w-5" />
                ) : (
                  <Activity className="h-5 w-5" />
                )}
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1">
              <span className="font-bold text-slate-500 uppercase">Peak:</span>
              <span className="font-semibold text-slate-600">{stats.peakTemp.toFixed(1)}°C ({stats.peakTempSensor})</span>
            </div>
          </div>

          {/* Card 2: Mean Humidity & Dryness */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200/80 transition duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mean Humidity</span>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {stats.avgHum.toFixed(1)}%
                </div>
              </div>
              <div className="p-2 bg-sky-50 text-sky-500 rounded-xl">
                <Droplets className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1">
              <span className="font-bold text-slate-500 uppercase">Min:</span>
              <span className="font-semibold text-slate-600">{stats.minHum.toFixed(1)}% ({stats.minHumSensor})</span>
            </div>
          </div>

          {/* Card 3: Instability / Standard Deviation */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200/80 transition duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Thermal Variance</span>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  ±{stats.tempStdDev.toFixed(2)}
                </div>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1">
              <span className="font-bold text-slate-500 uppercase">Stdev Score:</span>
              <span className="font-semibold text-slate-600">
                {stats.tempStdDev > 3 ? "Highly Fluctuate" : "Stable Distribution"}
              </span>
            </div>
          </div>

          {/* Card 4: Fire Catalyst Index */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200/80 transition duration-150 relative overflow-hidden">
            {/* Catalyst background pulse */}
            {stats.fireCatalystLabel === "High" && (
              <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
            )}
            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Aridity-Thermal Score</span>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {stats.fireCatalystScore}%
                </div>
              </div>
              <div className={`p-2 rounded-xl ${
                stats.fireCatalystLabel === "High" 
                  ? "bg-red-500 text-white animate-pulse" 
                  : stats.fireCatalystLabel === "Elevated" 
                  ? "bg-amber-500 text-white" 
                  : "bg-emerald-500 text-white"
              }`}>
                <Flame className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1.5 relative z-10">
              <span className="font-bold text-slate-500 uppercase">Threat Level:</span>
              <span className={`font-extrabold uppercase ${
                stats.fireCatalystLabel === "High" 
                  ? "text-red-600" 
                  : stats.fireCatalystLabel === "Elevated" 
                  ? "text-amber-600" 
                  : "text-emerald-600"
              }`}>
                {stats.fireCatalystLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Statistical Charts (New Side-by-Side Analytics Widgets) */}
        {sensorHistory && sensorHistory.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Widget A: Environmental Correlation Over Time */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Composite Environmental Correlation</h3>
                  <p className="text-xs text-slate-400">Co-relation of Average Temperature and Humidity over Time</p>
                </div>
              </div>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={correlationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                      labelStyle={{ fontWeight: "bold", fontSize: "11px", color: "#1e293b" }}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }} />
                    <Area type="monotone" dataKey="Avg Temp (°C)" stroke="#6366f1" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Avg Hum (%)" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorHum)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Widget B: Sensor Extremes Bar Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Spatial Peak & Minimum Comparison</h3>
                  <p className="text-xs text-slate-400">Extreme limits registered across classroom sensors</p>
                </div>
              </div>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sensorCompareData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="sensor" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                      labelStyle={{ fontWeight: "bold", fontSize: "11px", color: "#1e293b" }}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }} />
                    <Bar dataKey="Max Temp" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="Min Humidity" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col items-center justify-center text-slate-400 text-xs py-10">
            <HelpCircle className="h-8 w-8 text-slate-200 mb-2" />
            Telemetry statistics will automatically render when first buffer point arrives.
          </div>
        )}
      </div>

      {/* Recharts Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="charts-grid">
        {/* Temperature History Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Thermometer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Temperature History (°C)</h3>
              <p className="text-xs text-slate-400">DHT22 Readings (Interval: 3s)</p>
            </div>
          </div>
          <div className="w-full h-80" id="temp-chart-wrapper">
            {sensorHistory && sensorHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sensorHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} domain={[15, "auto"]} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                    labelStyle={{ fontWeight: "bold", fontSize: "11px", color: "#1e293b" }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }} />
                  <Line type="monotone" dataKey="Back Wall L Temp" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Back Wall R Temp" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Window Temp" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Door Temp" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">Waiting for telemetry buffer...</div>
            )}
          </div>
        </div>

        {/* Humidity History Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Humidity History (%)</h3>
              <p className="text-xs text-slate-400">DHT22 Moisture Data Buffer</p>
            </div>
          </div>
          <div className="w-full h-80" id="humidity-chart-wrapper">
            {sensorHistory && sensorHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sensorHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} domain={[5, 100]} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                    labelStyle={{ fontWeight: "bold", fontSize: "11px", color: "#1e293b" }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }} />
                  <Line type="monotone" dataKey="Back Wall L Hum" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Back Wall R Hum" stroke="#f43f5e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Window Hum" stroke="#d97706" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Door Hum" stroke="#059669" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">Waiting for telemetry buffer...</div>
            )}
          </div>
        </div>
      </div>

      {/* Flame Sensor Matrix */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6" id="flame-sensor-matrix">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
          <Flame className="h-4.5 w-4.5 text-red-500 animate-pulse" />
          Flame Sensor Arrays
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const isFlame = room.flameStatus === "Detected";

            return (
              <div
                key={room.id}
                className={`p-4 rounded-xl border flex flex-col justify-between h-28 relative overflow-hidden transition-all duration-200 ${
                  isFlame
                    ? "bg-red-50/50 border-red-200 ring-1 ring-red-500/10"
                    : "bg-slate-50/40 border-slate-100"
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{room.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Sensor ID: FS_{room.id.toUpperCase()}</p>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${isFlame ? "bg-red-500 animate-ping" : "bg-emerald-500"}`} />
                    <span className={`text-xs font-bold ${isFlame ? "text-red-600 animate-pulse" : "text-emerald-600"}`}>
                      {isFlame ? "FIRE ALARM" : "SAFE / CLEAR"}
                    </span>
                  </div>

                  <div className={`p-1.5 rounded-lg ${isFlame ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                    {isFlame ? <Flame className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
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
