import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Activity, DollarSign, Cpu, CheckCircle, XCircle, Monitor, Zap, ZapOff, WifiOff,
  Search, ArrowUpDown, ChevronUp, ChevronDown, Loader2, Check, AlertCircle, AlertTriangle, RefreshCw
} from 'lucide-react';

const API_BASE = 'http://localhost:8080';

const statusPriority = { 'Online & Active': 0, 'No Internet (Running)': 1, 'Power Off': 2, 'Unknown': 3 };

function getMachineStatus(machine) {
  if (machine.powerStatus === 'POWER_OFF' || !machine.lastSeen) {
    return {
      label: 'Power Off',
      color: 'bg-slate-800/80 text-slate-400 border border-slate-700',
      dot: 'bg-slate-500',
      icon: <ZapOff size={12} />
    };
  }

  const lastSeenDate = new Date(machine.lastSeen);
  const now = new Date();
  const diffInSeconds = (now - lastSeenDate) / 1000;

  if (machine.powerStatus === 'POWER_ON' && diffInSeconds <= 15) {
    return {
      label: 'Online & Active',
      color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.1)]',
      dot: 'bg-emerald-400 animate-pulse',
      icon: <Zap size={12} className="animate-pulse" />
    };
  }

  if (machine.powerStatus === 'POWER_ON' && diffInSeconds > 15) {
    return {
      label: 'No Internet (Running)',
      color: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
      dot: 'bg-amber-400',
      icon: <WifiOff size={12} />
    };
  }

  return {
    label: 'Unknown',
    color: 'bg-slate-800/80 text-slate-400 border border-slate-700',
    dot: 'bg-slate-400',
    icon: <Activity size={12} />
  };
}

function EditableMachineName({ machine, onSave }) {
  const fallbackName = `Machine #${machine.machineId}`;
  const currentName = machine.name || fallbackName;
  const [value, setValue] = useState(currentName);
  const [status, setStatus] = useState('idle');
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!isEditingRef.current) setValue(currentName);
  }, [currentName]);

  const handleBlur = async (e) => {
    isEditingRef.current = false;
    const trimmed = e.target.value.trim();

    if (!trimmed || trimmed === currentName) {
      setValue(currentName);
      return;
    }

    setStatus('saving');
    const ok = await onSave(machine.machineId, trimmed);
    if (ok) {
      setStatus('saved');
    } else {
      setStatus('error');
      setValue(currentName);
    }
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <div className="flex items-center gap-2 group">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => { isEditingRef.current = true; }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.target.blur();
          if (e.key === 'Escape') { setValue(currentName); e.target.blur(); }
        }}
        disabled={status === 'saving'}
        className="bg-transparent border-b border-transparent group-hover:border-slate-600 focus:border-blue-500 outline-none w-full text-slate-100 font-semibold disabled:opacity-50 transition-all duration-300 py-1"
      />
      {status === 'saving' && <Loader2 size={14} className="text-blue-400 animate-spin shrink-0" />}
      {status === 'saved' && <Check size={14} className="text-emerald-400 shrink-0 animate-bounce" />}
      {status === 'error' && <AlertCircle size={14} className="text-rose-400 shrink-0" title="فشل الحفظ" />}
    </div>
  );
}

export default function App() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/stats`, {
        credentials: 'include'
      });

      if (res.redirected && res.url.includes('/login')) {
        window.location.href = `${API_BASE}/login`;
        return;
      }
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        window.location.href = `${API_BASE}/login`;
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
      setLastUpdated(new Date());
      setFetchError(false);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateMachineName = async (machineId, newName) => {
    try {
      const res = await fetch(`${API_BASE}/api/machine/${machineId}/update-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName })
      });
      return res.ok;
    } catch (err) {
      console.error("Update failed:", err);
      return false;
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const currentStats = stats || {
    totalMachines: 0, activeMachines: 0, totalRevenue: 0, totalAcceptedCoins: 0, totalRejectedCoins: 0, machinesList: []
  };

  const filteredAndSortedMachines = useMemo(() => {
    let list = [...(currentStats.machinesList || [])];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(m =>
        (m.name || `Machine #${m.machineId}`).toLowerCase().includes(q) ||
        String(m.machineId).includes(q)
      );
    }

    list.sort((a, b) => {
      let valA, valB;
      switch (sortConfig.key) {
        case 'name':
          valA = (a.name || `Machine #${a.machineId}`).toLowerCase();
          valB = (b.name || `Machine #${b.machineId}`).toLowerCase();
          break;
        case 'status':
          valA = statusPriority[getMachineStatus(a).label] ?? 99;
          valB = statusPriority[getMachineStatus(b).label] ?? 99;
          break;
        case 'amount':
          valA = Number(a.totalCollected || 0);
          valB = Number(b.totalCollected || 0);
          break;
        case 'lastSync':
          valA = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
          valB = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
          break;
        default:
          return 0;
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [currentStats.machinesList, searchQuery, sortConfig]);

  const chartData = [
    { name: 'Accepted Coins', count: currentStats.totalAcceptedCoins, color: '#10b981' },
    { name: 'Rejected Coins', count: currentStats.totalRejectedCoins, color: '#f43f5e' },
  ];

  const totalCoins = currentStats.totalAcceptedCoins + currentStats.totalRejectedCoins;
  const acceptanceRate = totalCoins > 0 ? ((currentStats.totalAcceptedCoins / totalCoins) * 100).toFixed(1) : null;
  const secondsAgo = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000)) : null;

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-blue-400" /> : <ChevronDown size={12} className="text-blue-400" />;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-xl font-bold text-white">
        <div className="flex flex-col items-center gap-4">
          <Activity className="animate-spin text-blue-500" size={40} />
          <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent animate-pulse">
            Loading System Data...
          </span>
        </div>
      </div>
    );
  }

  if (!stats && fetchError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-white gap-5 px-6 text-center">
        <div className="p-4 bg-rose-500/10 rounded-full">
          <AlertTriangle size={48} className="text-rose-400 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100">تعذّر الوصول للسيرفر أو تحتاج لتسجيل الدخول</h2>
        <p className="text-slate-400 max-w-sm text-sm leading-relaxed">
          تأكد من تشغيل السيرفر ومن تسجيل الدخول. سيتم تحويلك لصفحة الدخول إذا لم تكن مسجلاً.
        </p>
        <button
          onClick={() => window.location.href = `${API_BASE}/login`}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <RefreshCw size={16} /> تسجيل الدخول / إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 pb-12">
      {/* Sticky Header with Glassmorphism */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-6 py-4 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            System Live Monitor
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Real-time telemetry & financial metrics</p>
        </div>

        {fetchError ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-xs font-semibold shadow-[0_0_15px_rgba(244,63,94,0.1)]">
            <AlertTriangle size={14} />
            Connection lost {lastUpdated && ` · last sync ${secondsAgo}s ago`}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            Live Connection · {secondsAgo}s ago
          </div>
        )}
      </header>

      <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Total Machines', value: currentStats.totalMachines, sub: `${currentStats.activeMachines} Powered On`, subColor: 'text-emerald-400', icon: <Cpu size={24} />, color: 'blue' },
            { title: 'Total Revenue', value: `${Number(currentStats.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} JOD`, icon: <DollarSign size={24} />, color: 'emerald', highlight: true },
            { title: 'Accepted Coins', value: currentStats.totalAcceptedCoins, sub: acceptanceRate ? `${acceptanceRate}% acceptance rate` : null, subColor: 'text-teal-400', icon: <CheckCircle size={24} />, color: 'teal' },
            { title: 'Rejected Coins', value: currentStats.totalRejectedCoins, icon: <XCircle size={24} />, color: 'rose' }
          ].map((stat, idx) => (
            <div key={idx} className={`relative overflow-hidden rounded-2xl bg-slate-900 p-6 border border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${stat.highlight ? 'hover:shadow-emerald-500/10 hover:border-emerald-500/30' : 'hover:border-slate-700'}`}>
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl pointer-events-none"></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm font-semibold text-slate-400">{stat.title}</p>
                  <h3 className={`text-3xl font-bold mt-2 ${stat.highlight ? 'text-emerald-400' : 'text-slate-100'}`}>
                    {stat.value}
                  </h3>
                  {stat.sub && (
                    <p className={`text-xs font-medium mt-2 flex items-center gap-1 ${stat.subColor}`}>
                      {stat.title === 'Total Machines' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>}
                      {stat.sub}
                    </p>
                  )}
                </div>
                <div className={`rounded-xl p-3.5 bg-${stat.color}-500/10 text-${stat.color}-400 ring-1 ring-${stat.color}-500/20`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Network Status Table */}
          <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-100">
                <Monitor size={18} className="text-blue-400" />
                Network Nodes
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs font-medium text-slate-400 border border-slate-700">
                  {filteredAndSortedMachines.length}
                </span>
              </h2>
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Find machine..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950/50 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all w-full sm:w-64"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-950/30 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                    {['name', 'status', 'amount'].map(col => (
                      <th key={col} className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors group select-none" onClick={() => handleSort(col)}>
                        <div className="flex items-center gap-2">
                          {col === 'name' ? 'Machine Name' : col === 'status' ? 'Status' : 'Revenue'}
                          <SortIcon column={col} />
                        </div>
                      </th>
                    ))}
                    <th className="p-4">Last Session</th>
                    <th className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors group select-none" onClick={() => handleSort('lastSync')}>
                      <div className="flex items-center gap-2">Last Sync <SortIcon column="lastSync" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredAndSortedMachines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500 text-sm">
                        <div className="flex flex-col items-center gap-3">
                          <Search size={32} className="opacity-20" />
                          {searchQuery ? `No machines matching "${searchQuery}"` : 'No machines registered yet'}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedMachines.map((machine) => {
                      const status = getMachineStatus(machine);
                      return (
                        <tr key={machine.machineId} className="text-sm hover:bg-slate-800/40 transition-colors group">
                          <td className="p-4 border-l-2 border-transparent group-hover:border-blue-500 transition-colors">
                            <EditableMachineName machine={machine} onSave={handleUpdateMachineName} />
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${status.color} transition-all`}>
                              {status.icon} {status.label}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-emerald-400">
                            {Number(machine.totalCollected || 0).toFixed(2)} <span className="text-xs text-emerald-500/50 font-normal">JOD</span>
                          </td>
                          <td className="p-4 text-slate-400 text-xs font-medium">{machine.lastSessionInfo || 'N/A'}</td>
                          <td className="p-4 text-slate-500 text-xs">
                            {machine.lastSeen ? new Date(machine.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart Section */}
          <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 shadow-xl flex flex-col hover:border-slate-700 transition-colors">
            <div className="mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-100">
                <Activity size={18} className="text-indigo-400" /> Coin Traffic
              </h2>
              {acceptanceRate !== null && (
                <p className="text-xs text-slate-500 mt-1.5 font-medium">
                  System Acceptance Rate: <span className="text-emerald-400 font-bold ml-1">{acceptanceRate}%</span>
                </p>
              )}
            </div>
            
            <div className="flex-1 w-full min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} dy={10} />
                  <YAxis stroke="#64748b" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip
                    cursor={{ fill: '#1e293b', opacity: 0.5 }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}