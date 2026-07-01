import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import {
  Activity, DollarSign, Cpu, CheckCircle, XCircle, Monitor, Zap, WifiOff,
  Search, ArrowUpDown, ChevronUp, ChevronDown, Loader2, Check, AlertCircle, AlertTriangle, 
  Coins, History, ChevronRight, Power, Network, ShieldCheck, Database, Server
} from 'lucide-react';

const API_BASE = 'https://my-machines-api.onrender.com';

const statusPriority = { 'Online': 0, 'Syncing': 1, 'Offline': 2, 'Unknown': 3 };

function parseDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`);
}

function formatFullDate(dateStr) {
  if (!dateStr) return <span className="text-white/40 italic">No Data</span>;
  const date = parseDate(dateStr);
  const formattedDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  const formattedTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(date);
  return (
    <div className="flex flex-col">
      <span className="text-white/90 font-medium">{formattedDate}</span>
      <span className="text-white/50 text-[11px] font-mono tracking-widest">{formattedTime}</span>
    </div>
  );
}

function getMachineStatus(machine) {
  if (machine.powerStatus === 'POWER_OFF' || !machine.lastSeen) 
    return { label: 'Offline', badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: <WifiOff size={14} />, dot: 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' };
  
  const lastSeenDate = parseDate(machine.lastSeen);
  const diffInSeconds = (new Date() - lastSeenDate) / 1000;
  
  if (machine.powerStatus === 'POWER_ON' && diffInSeconds <= 15) 
    return { label: 'Online', badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: <Zap size={14} className="animate-pulse" />, dot: 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' };
  
  if (machine.powerStatus === 'POWER_ON' && diffInSeconds > 15) 
    return { label: 'Syncing', badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: <Loader2 size={14} className="animate-spin" />, dot: 'bg-indigo-400 shadow-[0_0_10px_#818cf8]' };
  
  return { label: 'Unknown', badge: 'bg-white/10 text-white/60 border-white/20', icon: <Activity size={14} />, dot: 'bg-white/50' };
}

function EditableMachineName({ machine, onSave }) {
  const currentName = machine.name || `NODE-${machine.machineId.toString().padStart(4, '0')}`;
  const [value, setValue] = useState(currentName);
  const [status, setStatus] = useState('idle');
  const isEditingRef = useRef(false);

  useEffect(() => { if (!isEditingRef.current) setValue(currentName); }, [currentName]);

  const handleBlur = async (e) => {
    isEditingRef.current = false;
    const trimmed = e.target.value.trim();
    if (!trimmed || trimmed === currentName) return setValue(currentName);
    setStatus('saving');
    const ok = await onSave(machine.machineId, trimmed);
    setStatus(ok ? 'saved' : 'error');
    if (!ok) setValue(currentName);
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <div className="flex items-center gap-4 group w-full max-w-[250px]">
      <div className="p-2.5 bg-white/5 rounded-xl text-white/70 border border-white/10 backdrop-blur-md group-hover:border-cyan-500/50 group-hover:text-cyan-400 transition-all duration-300"><Server size={18} /></div>
      <div className="relative flex-1">
        <input type="text" value={value} onChange={(e) => setValue(e.target.value)} onFocus={() => { isEditingRef.current = true; }} onBlur={handleBlur} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setValue(currentName); e.target.blur(); } }} disabled={status === 'saving'} className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-cyan-500 outline-none w-full text-white font-semibold tracking-wide text-sm disabled:opacity-50 transition-all py-1 placeholder-white/30" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
          {status === 'saving' && <Loader2 size={14} className="text-cyan-400 animate-spin" />}
          {status === 'saved' && <Check size={14} className="text-emerald-400 animate-bounce" />}
          {status === 'error' && <AlertCircle size={14} className="text-rose-400" />}
        </div>
      </div>
    </div>
  );
}

function MachineRow({ machine, onSaveName, onResetCashCounter, onResetCoinCounter }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = getMachineStatus(machine);
  const sessions = machine.sessions || [];

  return (
    <React.Fragment>
      <tr className={`group transition-all duration-300 cursor-pointer ${isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`} onClick={(e) => { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') setIsExpanded(!isExpanded); }}>
        <td className="p-5 align-middle rounded-l-2xl border-y border-l border-transparent group-hover:border-white/5"><EditableMachineName machine={machine} onSave={onSaveName} /></td>
        
        <td className="p-5 align-middle border-y border-transparent group-hover:border-white/5">
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-2 border ${status.badge} backdrop-blur-md transition-all`}>
            <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
            {status.label}
          </div>
        </td>
        
        <td className="p-5 align-middle border-y border-transparent group-hover:border-white/5">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white">{Number(machine.currentCoinCount || 0)}</span>
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mt-0.5">Active</span>
          </div>
        </td>

        <td className="p-5 align-middle border-y border-transparent group-hover:border-white/5">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-indigo-400">{Number(machine.offlineCoins || 0)}</span>
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mt-0.5">Offline Coin</span>
          </div>
        </td>

        <td className="p-5 align-middle border-y border-transparent group-hover:border-white/5">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-emerald-400 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">{Number(machine.currentCollected || 0).toFixed(2)}</span>
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mt-0.5">JOD Pending</span>
          </div>
        </td>

        <td className="p-5 align-middle border-y border-transparent group-hover:border-white/5">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white/70">{Number(machine.totalCollected || 0).toFixed(2)}</span>
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mt-0.5">JOD Lifetime</span>
          </div>
        </td>

        <td className="p-5 align-middle rounded-r-2xl border-y border-r border-transparent group-hover:border-white/5 text-right">
          <button className={`p-2.5 rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all ${isExpanded ? 'rotate-90 bg-cyan-500/20 text-cyan-400' : ''}`}><ChevronRight size={18} /></button>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl px-8 py-8 border border-white/10 rounded-2xl mx-4 my-2 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
              
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg"><History className="text-indigo-400" size={20} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-widest uppercase">Telemetry & Logs</h4>
                    <p className="text-xs text-white/40 mt-1">Immutable session records and maintenance actions</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Wipe cash counters?')) onResetCashCounter(machine.machineId); }} className="px-5 py-2.5 bg-white/5 hover:bg-emerald-500/20 text-white hover:text-emerald-400 border border-white/10 hover:border-emerald-500/50 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                    <DollarSign size={16} /> Collect Cash
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Reset coin tracking?')) onResetCoinCounter(machine.machineId); }} className="px-5 py-2.5 bg-white/5 hover:bg-amber-500/20 text-white hover:text-amber-400 border border-white/10 hover:border-amber-500/50 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                    <Coins size={16} /> Flush Coins
                  </button>
                </div>
              </div>

              {sessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                  {sessions.slice().reverse().map((session, index) => (
                    <div key={session.id || index} className="flex flex-col bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.06] transition-colors relative group">
                      <div className="absolute top-4 right-4 text-white/20 font-mono text-xs font-bold">#{sessions.length - index}</div>
                      
                      <div className="flex items-start gap-3 mb-4">
                        <div className="mt-1"><Power className="text-emerald-400" size={16} /></div>
                        <div>
                          <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest mb-1">Boot Sequence</p>
                          {formatFullDate(session.powerOnTime)}
                        </div>
                      </div>
                      
                      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4"></div>
                      
                      <div className="flex items-start gap-3">
                        <div className="mt-1"><Power className="text-rose-400" size={16} /></div>
                        <div>
                          <p className="text-[10px] text-rose-400/80 font-bold uppercase tracking-widest mb-1">Shutdown / Timeout</p>
                          {formatFullDate(session.powerOffTime)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                  <Database size={32} className="text-white/20 mb-4" />
                  <p className="text-white/50 text-sm font-medium tracking-wide">No telemetry data available for this node.</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

export default function App() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/stats`, { credentials: 'include', cache: 'no-store' });
      if (res.redirected && res.url.includes('/login')) return window.location.href = `${API_BASE}/login`;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
      setFetchError(false);
    } catch (err) { setFetchError(true); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateMachineName = async (machineId, newName) => {
    try {
      const res = await fetch(`${API_BASE}/api/machine/${machineId}/update-info`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ name: newName }) });
      return res.ok;
    } catch (err) { return false; }
  };

  const handleResetCashCounter = async (machineId) => {
    try {
      const res = await fetch(`${API_BASE}/api/machine/${machineId}/reset-counter`, { method: 'PUT', credentials: 'include' });
      if (res.ok) fetchStats(); 
    } catch (err) { console.error("Failed to reset cash:", err); }
  };

  const handleResetCoinCounter = async (machineId) => {
    try {
      const res = await fetch(`${API_BASE}/api/machine/${machineId}/reset-coins`, { method: 'PUT', credentials: 'include' });
      if (res.ok) fetchStats(); 
    } catch (err) { console.error("Failed to reset coins:", err); }
  };

  const currentStats = stats || { totalMachines: 0, activeMachines: 0, totalRevenue: 0, totalAcceptedCoins: 0, totalRejectedCoins: 0, machinesList: [], peakData: [], offlineData: [] };

  const filteredAndSortedMachines = useMemo(() => {
    let list = [...(currentStats.machinesList || [])];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(m => (m.name || `NODE-${m.machineId}`).toLowerCase().includes(q) || String(m.machineId).includes(q));
    }
    list.sort((a, b) => {
      let valA, valB;
      switch (sortConfig.key) {
        case 'name': valA = (a.name || `NODE-${a.machineId}`).toLowerCase(); valB = (b.name || `NODE-${b.machineId}`).toLowerCase(); break;
        case 'status': valA = statusPriority[getMachineStatus(a).label] ?? 99; valB = statusPriority[getMachineStatus(b).label] ?? 99; break;
        case 'currentCoinCount': valA = Number(a.currentCoinCount || 0); valB = Number(b.currentCoinCount || 0); break;
        case 'offlineCoins': valA = Number(a.offlineCoins || 0); valB = Number(b.offlineCoins || 0); break;
        case 'currentCollected': valA = Number(a.currentCollected || 0); valB = Number(b.currentCollected || 0); break;
        case 'totalCollected': valA = Number(a.totalCollected || 0); valB = Number(b.totalCollected || 0); break;
        default: return 0;
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [currentStats.machinesList, searchQuery, sortConfig]);

  const auditEvents = useMemo(() => {
    let events = [];
    (currentStats.machinesList || []).forEach(m => {
      const mName = m.name || `NODE-${m.machineId.toString().padStart(4, '0')}`;
      if (m.sessions) {
        m.sessions.forEach(s => {
          if (s.powerOnTime) events.push({ type: 'ON', time: parseDate(s.powerOnTime), machine: mName });
          if (s.powerOffTime) events.push({ type: 'OFF', time: parseDate(s.powerOffTime), machine: mName });
        });
      }
    });
    return events.sort((a, b) => b.time - a.time).slice(0, 8); 
  }, [currentStats.machinesList]);

  if (loading) return ( <div className="flex h-screen items-center justify-center bg-[#030303] text-white"><div className="relative"><Loader2 className="animate-spin text-cyan-500 absolute inset-0 m-auto blur-md" size={64} /><Loader2 className="animate-spin text-white relative z-10" size={64} /></div></div> );
  if (!stats && fetchError) return ( <div className="flex h-screen flex-col items-center justify-center bg-[#030303] text-white"><AlertTriangle size={64} className="text-rose-500 animate-pulse mb-6 drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]" /><h2 className="text-2xl font-bold tracking-widest uppercase">Connection Severed</h2><p className="text-white/50 mt-2">API endpoint unreachable.</p></div> );

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-cyan-500/30 pb-24 relative overflow-hidden">
      
      {/* Immersive Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]"></div>
      </div>

      <header className="sticky top-0 z-30 backdrop-blur-3xl bg-[#030303]/60 border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-cyan-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
            <h1 className="text-4xl font-black tracking-[0.2em] uppercase relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-cyan-500">
              SLR
            </h1>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <div className="hidden sm:flex flex-col">
            <span className="text-white/90 text-sm font-bold tracking-widest uppercase">Nexus Command</span>
            <span className="text-white/40 text-[10px] tracking-widest uppercase flex items-center gap-1"><ShieldCheck size={10} className="text-cyan-500" /> Secure Protocol Active</span>
          </div>
        </div>
      </header>

      <main className="p-6 md:p-8 max-w-[1800px] mx-auto space-y-10 relative z-10">
        
        {/* Bento Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Active Nodes', val: currentStats.activeMachines, total: currentStats.totalMachines, icon: <Network size={24}/>, gradient: 'from-blue-500/20 to-transparent', border: 'border-blue-500/30' }, 
            { label: 'Total Revenue', val: Number(currentStats.totalRevenue).toFixed(2), suffix: 'JOD', icon: <DollarSign size={24}/>, gradient: 'from-emerald-500/20 to-transparent', border: 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]' }, 
            { label: 'Validated Coins', val: currentStats.totalAcceptedCoins, icon: <CheckCircle size={24}/>, gradient: 'from-cyan-500/20 to-transparent', border: 'border-cyan-500/30' }, 
            { label: 'Anomaly / Rejected', val: currentStats.totalRejectedCoins, icon: <XCircle size={24}/>, gradient: 'from-rose-500/20 to-transparent', border: 'border-rose-500/30' }
          ].map((stat, i) => (
            <div key={i} className={`relative overflow-hidden rounded-3xl bg-white/[0.02] p-8 border ${stat.border} backdrop-blur-xl group hover:bg-white/[0.04] transition-all duration-500`}>
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${stat.gradient} opacity-50 rounded-bl-full`}></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white group-hover:scale-110 transition-transform duration-500">{stat.icon}</div>
              </div>
              <h3 className="text-white/50 text-xs font-bold tracking-widest uppercase mb-2 relative z-10">{stat.label}</h3>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className="text-4xl font-bold text-white tracking-tight">{stat.val}</span>
                {stat.total !== undefined && <span className="text-white/30 text-lg font-medium">/ {stat.total}</span>}
                {stat.suffix && <span className="text-emerald-400 font-bold text-sm tracking-widest">{stat.suffix}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Data Grid Section */}
        <div className="rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl overflow-hidden flex flex-col shadow-2xl">
          <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 bg-black/20">
            <h2 className="text-xl font-bold text-white flex items-center gap-3 tracking-widest uppercase"><Cpu className="text-cyan-400" /> Node Directory</h2>
            <div className="relative group w-full sm:w-80">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
              <input type="text" placeholder="Locate by ID or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-6 py-3 text-sm text-white font-medium placeholder-white/30 outline-none focus:border-cyan-500 focus:bg-white/10 transition-all shadow-inner" />
            </div>
          </div>
          
          <div className="overflow-x-auto p-4">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  {['name', 'status', 'currentCoinCount', 'offlineCoins', 'currentCollected', 'totalCollected'].map(col => (
                    <th key={col} className="px-5 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => setSortConfig({ key: col, direction: sortConfig.key === col && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                      <div className="flex items-center gap-2">
                        {col === 'name' ? 'Identifier' : col === 'status' ? 'State' : col === 'currentCoinCount' ? 'Active Coins' : col === 'offlineCoins' ? 'Offline Sync' : col === 'currentCollected' ? 'Pending JOD' : 'Lifetime JOD'}
                        {sortConfig.key === col ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-cyan-400"/> : <ChevronDown size={14} className="text-cyan-400"/>) : <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100 transition-opacity"/>}
                      </div>
                    </th>
                  ))}
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedMachines.map(machine => (
                  <MachineRow key={machine.machineId} machine={machine} onSaveName={handleUpdateMachineName} onResetCashCounter={handleResetCashCounter} onResetCoinCounter={handleResetCoinCounter} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytics & Audit Matrix */}
        <div className="grid gap-6 xl:grid-cols-3">
          
          <div className="xl:col-span-2 space-y-6">
            <div className="rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 flex flex-col h-[400px]">
              <div className="mb-8 flex justify-between items-center">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-3"><Activity className="text-cyan-400" size={18} /> Ingestion Rate / Peak Analysis</h2>
              </div>
              <div className="flex-1 w-full">
                {currentStats.peakData && currentStats.peakData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={currentStats.peakData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCoins" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                      <XAxis dataKey="time" stroke="#ffffff" strokeOpacity={0.3} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#ffffff80' }} />
                      <YAxis stroke="#ffffff" strokeOpacity={0.3} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#ffffff80' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#000000cc', backdropFilter: 'blur(10px)', border: '1px solid #ffffff20', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#22d3ee' }} />
                      <Area type="monotone" dataKey="coins" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorCoins)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    <span className="text-white/30 text-sm tracking-widest uppercase font-semibold">Awaiting Telemetry Data</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 flex flex-col h-[400px]">
              <div className="mb-8 flex justify-between items-center">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-3"><Database className="text-indigo-400" size={18} /> Sync Distribution (Online vs Offline)</h2>
              </div>
              <div className="flex-1 w-full">
                {currentStats.offlineData && currentStats.offlineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentStats.offlineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                      <XAxis dataKey="day" stroke="#ffffff" strokeOpacity={0.3} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#ffffff80' }} />
                      <YAxis stroke="#ffffff" strokeOpacity={0.3} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#ffffff80' }} />
                      <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#000000cc', backdropFilter: 'blur(10px)', border: '1px solid #ffffff20', borderRadius: '12px', color: '#fff' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
                      <Bar dataKey="online" name="Real-time Stream" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} maxBarSize={40} />
                      <Bar dataKey="offline" name="Offline Cache Synced" stackId="a" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    <span className="text-white/30 text-sm tracking-widest uppercase font-semibold">Awaiting Telemetry Data</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 h-full min-h-[824px] relative">
            <div className="mb-10 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-3"><History className="text-emerald-400" size={18} /> Global Event Matrix</h2>
            </div>
            
            <div className="relative border-l border-white/10 pl-6 space-y-10">
              {auditEvents.length > 0 ? auditEvents.map((ev, i) => (
                <div key={i} className="relative group">
                  <div className={`absolute -left-[30px] top-1 w-3 h-3 rounded-full border-2 border-[#030303] ${ev.type === 'ON' ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-rose-400 shadow-[0_0_12px_#fb7185]'}`}></div>
                  
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-white/50 tracking-widest uppercase">
                      {ev.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} // {ev.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <h4 className={`font-bold text-sm tracking-wide ${ev.type === 'ON' ? 'text-emerald-300' : 'text-rose-300'}`}>{ev.type === 'ON' ? 'SYSTEM INITIATION' : 'SYSTEM HALT'}</h4>
                    <p className="text-xs text-white/60">Node <span className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">{ev.machine}</span> state mutation detected.</p>
                  </div>
                </div>
              )) : (
                <div className="text-white/30 text-xs font-semibold tracking-widest uppercase flex items-center gap-3 mt-10">
                  <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse"></div>
                  Monitoring stream idle
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
