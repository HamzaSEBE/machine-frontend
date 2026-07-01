import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Activity, DollarSign, Cpu, CheckCircle, XCircle, Monitor, Zap, ZapOff, WifiOff,
  Search, ArrowUpDown, ChevronUp, ChevronDown, Loader2, Check, AlertCircle, AlertTriangle, 
  Coins, History, ChevronRight, Power
} from 'lucide-react';

const API_BASE = 'https://my-machines-api.onrender.com';

const statusPriority = { 'Online & Active': 0, 'No Internet (Running)': 1, 'Power Off': 2, 'Unknown': 3 };

function parseDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`);
}

function formatFullDate(dateStr) {
  if (!dateStr) return <span className="text-slate-600 italic">No Data</span>;
  const date = parseDate(dateStr);
  const formattedDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  const formattedTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(date);
  return (
    <div className="flex flex-col">
      <span className="text-slate-300 font-medium">{formattedDate}</span>
      <span className="text-slate-400 text-[11px] font-mono">{formattedTime}</span>
    </div>
  );
}

function getMachineStatus(machine) {
  if (machine.powerStatus === 'POWER_OFF' || !machine.lastSeen) return { label: 'Power Off', color: 'bg-slate-800/80 text-slate-400 border border-slate-700/50', icon: <ZapOff size={14} />, glow: '' };
  const lastSeenDate = parseDate(machine.lastSeen);
  const diffInSeconds = (new Date() - lastSeenDate) / 1000;
  if (machine.powerStatus === 'POWER_ON' && diffInSeconds <= 15) return { label: 'Online & Active', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30', icon: <Zap size={14} className="animate-pulse" />, glow: 'shadow-[0_0_15px_rgba(52,211,153,0.15)]' };
  if (machine.powerStatus === 'POWER_ON' && diffInSeconds > 15) return { label: 'Running (No Sync)', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/30', icon: <WifiOff size={14} />, glow: 'shadow-[0_0_15px_rgba(251,191,36,0.1)]' };
  return { label: 'Unknown', color: 'bg-slate-800/80 text-slate-400 border border-slate-700/50', icon: <Activity size={14} />, glow: '' };
}

function EditableMachineName({ machine, onSave }) {
  const currentName = machine.name || `Machine #${machine.machineId}`;
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
    <div className="flex items-center gap-3 group w-full max-w-[200px]">
      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]"><Monitor size={16} /></div>
      <div className="relative flex-1">
        <input type="text" value={value} onChange={(e) => setValue(e.target.value)} onFocus={() => { isEditingRef.current = true; }} onBlur={handleBlur} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setValue(currentName); e.target.blur(); } }} disabled={status === 'saving'} className="bg-transparent border-b-2 border-transparent hover:border-slate-700 focus:border-blue-500 outline-none w-full text-slate-100 font-bold text-base disabled:opacity-50 transition-all py-1 placeholder-slate-600" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
          {status === 'saving' && <Loader2 size={14} className="text-blue-400 animate-spin" />}
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
      <tr className={`group transition-all duration-300 border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer ${isExpanded ? 'bg-slate-800/20' : ''}`} onClick={(e) => { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') setIsExpanded(!isExpanded); }}>
        <td className="p-4 align-middle"><EditableMachineName machine={machine} onSave={onSaveName} /></td>
        <td className="p-4 align-middle"><div className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-2 ${status.color} ${status.glow} transition-all`}>{status.icon} {status.label}</div></td>
        
        {/* عداد حبات العملات */}
        <td className="p-4 align-middle">
          <div className="flex flex-col">
            <span className="text-lg font-black text-amber-400">
              {Number(machine.currentCoinCount || 0)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">Coins</span>
          </div>
        </td>

        {/* عداد السحب النقدي (JOD) */}
        <td className="p-4 align-middle">
          <div className="flex flex-col">
            <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              {Number(machine.currentCollected || 0).toFixed(2)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">To Collect (JOD)</span>
          </div>
        </td>

        {/* العداد الإجمالي (JOD) */}
        <td className="p-4 align-middle">
          <div className="flex flex-col">
            <span className="text-lg font-black text-slate-300">
              {Number(machine.totalCollected || 0).toFixed(2)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">Lifetime (JOD)</span>
          </div>
        </td>

        <td className="p-4 align-middle text-right"><button className={`p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700/50 ${isExpanded ? 'rotate-90 bg-blue-500/20 text-blue-400 border-blue-500/30' : ''}`}><ChevronRight size={18} /></button></td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-0 border-b border-slate-800/50">
            <div className="bg-slate-900/80 px-6 py-6 border-x-2 border-blue-500/50 shadow-inner">
              
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2">
                  <History className="text-blue-400" size={18} />
                  <h4 className="text-sm font-bold text-slate-200 tracking-wide">Machine Session Records</h4>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {/* زر تصفير الكاش */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if(window.confirm('هل أنت متأكد من سحب الكاش وتصفير العداد النقدي الحالي؟')) {
                        onResetCashCounter(machine.machineId);
                      }
                    }}
                    className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
                  >
                    <DollarSign size={16} /> تصفير الكاش
                  </button>

                  {/* زر تصفير عدد العملات */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if(window.confirm('هل أنت متأكد من تصفير عداد حبات العملات؟')) {
                        onResetCoinCounter(machine.machineId);
                      }
                    }}
                    className="px-4 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white border border-amber-500/30 rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
                  >
                    <Coins size={16} /> تصفير العملات
                  </button>
                </div>
              </div>

              {sessions.length > 0 ? (
                <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {sessions.map((session, index) => (
                    <div key={session.id || index} className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-slate-950/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors shadow-sm">
                      <div className="flex items-center gap-4 mb-3 md:mb-0">
                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400 border border-slate-700"><span className="text-xs font-bold">#{sessions.length - index}</span></div>
                        <div className="flex items-start gap-3 border-l-2 border-emerald-500/50 pl-3">
                          <Power className="text-emerald-400 mt-0.5" size={16} />
                          <div><p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider mb-1">Power ON</p>{formatFullDate(session.powerOnTime)}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 border-l-2 border-rose-500/50 pl-3 md:ml-8">
                        <Power className="text-rose-400 mt-0.5" size={16} />
                        <div><p className="text-[10px] text-rose-400/80 font-bold uppercase tracking-wider mb-1">Power OFF</p>{formatFullDate(session.powerOffTime)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                  <History size={32} className="text-slate-600 mb-3" />
                  <p className="text-slate-400 text-sm font-medium">No session records found.</p>
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

  const currentStats = stats || { totalMachines: 0, activeMachines: 0, totalRevenue: 0, totalAcceptedCoins: 0, totalRejectedCoins: 0, machinesList: [] };

  const filteredAndSortedMachines = useMemo(() => {
    let list = [...(currentStats.machinesList || [])];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(m => (m.name || `Machine #${m.machineId}`).toLowerCase().includes(q) || String(m.machineId).includes(q));
    }
    list.sort((a, b) => {
      let valA, valB;
      switch (sortConfig.key) {
        case 'name': valA = (a.name || `Machine #${a.machineId}`).toLowerCase(); valB = (b.name || `Machine #${b.machineId}`).toLowerCase(); break;
        case 'status': valA = statusPriority[getMachineStatus(a).label] ?? 99; valB = statusPriority[getMachineStatus(b).label] ?? 99; break;
        case 'currentCoinCount': valA = Number(a.currentCoinCount || 0); valB = Number(b.currentCoinCount || 0); break;
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

  const chartData = [
    { name: 'Accepted', count: currentStats.totalAcceptedCoins, color: '#10b981' },
    { name: 'Rejected', count: currentStats.totalRejectedCoins, color: '#f43f5e' },
  ];

  if (loading) return ( <div className="flex h-screen items-center justify-center bg-[#0B0F19] text-xl font-bold text-white"><Activity className="animate-spin text-blue-400" size={48} /></div> );
  if (!stats && fetchError) return ( <div className="flex h-screen flex-col items-center justify-center bg-[#0B0F19] text-white"><AlertTriangle size={48} className="text-rose-400 animate-pulse mb-4" /><h2>تعذّر الوصول للسيرفر</h2></div> );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-blue-500/30 pb-20">
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-[#0B0F19]/80 border-b border-slate-800/80 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl"><Cpu size={24} className="text-white" /></div><div><h1 className="text-2xl font-black text-white">Nexus Control <span className="text-blue-500">Center</span></h1></div></div>
      </header>
      <main className="p-8 max-w-[1600px] mx-auto space-y-10 relative z-10 mt-4">
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[{ label: 'Active Nodes', val: currentStats.activeMachines, total: currentStats.totalMachines, icon: <Monitor size={20}/>, color: 'blue' }, { label: 'Total Revenue (Lifetime)', val: Number(currentStats.totalRevenue).toFixed(2), suffix: 'JOD', icon: <DollarSign size={20}/>, color: 'emerald', glow: true }, { label: 'Valid Coins', val: currentStats.totalAcceptedCoins, icon: <CheckCircle size={20}/>, color: 'teal' }, { label: 'Rejected Coins', val: currentStats.totalRejectedCoins, icon: <XCircle size={20}/>, color: 'rose' }].map((stat, i) => (
            <div key={i} className={`relative overflow-hidden rounded-2xl bg-slate-900/50 p-6 border ${stat.glow ? 'border-emerald-500/30 shadow-[0_0_30px_rgba(52,211,153,0.1)]' : 'border-slate-800/80'} backdrop-blur-sm group`}><div className={`absolute top-0 right-0 p-8 opacity-10 bg-gradient-to-bl from-${stat.color}-500 to-transparent rounded-bl-full`}></div><div className="flex justify-between items-start mb-4 relative z-10"><div className={`p-3 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-400 ring-1 ring-${stat.color}-500/20`}>{stat.icon}</div></div><h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1 relative z-10">{stat.label}</h3><div className="flex items-baseline gap-2 relative z-10"><span className={`text-4xl font-black ${stat.glow ? 'text-emerald-400' : 'text-white'}`}>{stat.val}</span>{stat.suffix && <span className="text-emerald-500/50 font-bold text-sm">{stat.suffix}</span>}</div></div>
          ))}
        </div>

        <div className="grid gap-8 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/80"><h2 className="text-xl font-black text-white flex items-center gap-3">Fleet Management</h2><div className="relative group w-full sm:w-72"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" placeholder="Search by ID or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#0B0F19] border border-slate-700/80 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-200 font-medium placeholder-slate-600 outline-none focus:border-blue-500" /></div></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0B0F19]/50 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-800/80">
                    {['name', 'status', 'currentCoinCount', 'currentCollected', 'totalCollected'].map(col => (
                      <th key={col} className="p-5 cursor-pointer hover:text-white transition-colors select-none" onClick={() => setSortConfig({ key: col, direction: sortConfig.key === col && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                        <div className="flex items-center gap-2">
                          {col === 'name' ? 'Identifier' : col === 'status' ? 'Current State' : col === 'currentCoinCount' ? 'Coins' : col === 'currentCollected' ? 'To Collect' : 'Lifetime Total'}
                          {sortConfig.key === col ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-blue-500"/> : <ChevronDown size={14} className="text-blue-500"/>) : <ArrowUpDown size={14} className="opacity-30"/>}
                        </div>
                      </th>
                    ))}
                    <th className="p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>{filteredAndSortedMachines.map(machine => (<MachineRow key={machine.machineId} machine={machine} onSaveName={handleUpdateMachineName} onResetCashCounter={handleResetCashCounter} onResetCoinCounter={handleResetCoinCounter} />))}</tbody>
              </table>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 p-6 flex flex-col"><div className="mb-8"><h2 className="text-xl font-black text-white flex items-center gap-3">Coin Analytics</h2></div><div className="flex-1 w-full min-h-[350px] relative"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} /><XAxis dataKey="name" stroke="#64748b" axisLine={false} tickLine={false} /><YAxis stroke="#64748b" axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: '#1e293b', opacity: 0.4 }} contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #334155', borderRadius: '12px' }} /><Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={80}>{chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Bar></BarChart></ResponsiveContainer></div></div>
        </div>
      </main>
    </div>
  );
}
