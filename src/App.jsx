import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, AreaChart, Area, Legend 
} from 'recharts';
import {
  Activity, DollarSign, Cpu, CheckCircle, XCircle, Monitor, Zap, ZapOff, WifiOff,
  Search, ArrowUpDown, ChevronUp, ChevronDown, Loader2, Check, AlertCircle, AlertTriangle, 
  Coins, History, ChevronRight, Power, Network, ShieldCheck
} from 'lucide-react';

const API_BASE = 'https://my-machines-api.onrender.com';

const statusPriority = { 'متصل (Online)': 0, 'تزامن (Syncing)': 1, 'مفصول (Offline)': 2, 'Unknown': 3 };

function parseDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`);
}

function formatFullDate(dateStr) {
  if (!dateStr) return <span className="text-slate-600 italic">لا يوجد بيانات</span>;
  const date = parseDate(dateStr);
  const formattedDate = new Intl.DateTimeFormat('ar-JO', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  const formattedTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(date);
  return (
    <div className="flex flex-col">
      <span className="text-slate-300 font-medium">{formattedDate}</span>
      <span className="text-slate-400 text-[11px] font-mono">{formattedTime}</span>
    </div>
  );
}

function getMachineStatus(machine) {
  if (machine.powerStatus === 'POWER_OFF' || !machine.lastSeen) 
    return { label: 'مفصول (Offline)', color: 'bg-rose-500/10 text-rose-400 border border-rose-500/30', icon: <WifiOff size={14} />, glow: 'shadow-[0_0_15px_rgba(244,63,94,0.1)]' };
  
  const lastSeenDate = parseDate(machine.lastSeen);
  const diffInSeconds = (new Date() - lastSeenDate) / 1000;
  
  if (machine.powerStatus === 'POWER_ON' && diffInSeconds <= 15) 
    return { label: 'متصل (Online)', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30', icon: <Zap size={14} className="animate-pulse" />, glow: 'shadow-[0_0_15px_rgba(52,211,153,0.15)]' };
  
  if (machine.powerStatus === 'POWER_ON' && diffInSeconds > 15) 
    return { label: 'تزامن (Syncing)', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/30', icon: <Loader2 size={14} className="animate-spin" />, glow: 'shadow-[0_0_15px_rgba(251,191,36,0.1)]' };
  
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
      <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]"><Monitor size={16} /></div>
      <div className="relative flex-1">
        <input type="text" value={value} onChange={(e) => setValue(e.target.value)} onFocus={() => { isEditingRef.current = true; }} onBlur={handleBlur} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setValue(currentName); e.target.blur(); } }} disabled={status === 'saving'} className="bg-transparent border-b-2 border-transparent hover:border-slate-700 focus:border-cyan-500 outline-none w-full text-slate-100 font-bold text-base disabled:opacity-50 transition-all py-1 placeholder-slate-600" />
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
      <tr className={`group transition-all duration-300 border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer ${isExpanded ? 'bg-slate-800/20' : ''}`} onClick={(e) => { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') setIsExpanded(!isExpanded); }}>
        <td className="p-4 align-middle text-right"><EditableMachineName machine={machine} onSave={onSaveName} /></td>
        <td className="p-4 align-middle text-right"><div className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-2 ${status.color} ${status.glow} transition-all`}>{status.icon} {status.label}</div></td>
        
        <td className="p-4 align-middle text-right">
          <div className="flex flex-col">
            <span className="text-lg font-black text-amber-400">{Number(machine.currentCoinCount || 0)}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">عملات</span>
          </div>
        </td>

        <td className="p-4 align-middle text-right">
          <div className="flex flex-col">
            <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">{Number(machine.currentCollected || 0).toFixed(2)}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">رصيد السحب (JOD)</span>
          </div>
        </td>

        <td className="p-4 align-middle text-right">
          <div className="flex flex-col">
            <span className="text-lg font-black text-slate-300">{Number(machine.totalCollected || 0).toFixed(2)}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">الإجمالي (JOD)</span>
          </div>
        </td>

        <td className="p-4 align-middle text-left"><button className={`p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700/50 ${isExpanded ? 'rotate-90 bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : ''}`}><ChevronRight size={18} /></button></td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-0 border-b border-slate-800/50">
            <div className="bg-slate-900/80 px-6 py-6 border-r-2 border-cyan-500/50 shadow-inner">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2">
                  <History className="text-cyan-400" size={18} />
                  <h4 className="text-sm font-bold text-slate-200 tracking-wide">سجلات الجلسات للماكينة</h4>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); if(window.confirm('هل أنت متأكد من سحب الكاش وتصفير العداد النقدي الحالي؟')) onResetCashCounter(machine.machineId); }} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2">
                    <DollarSign size={16} /> تصفير الكاش
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if(window.confirm('هل أنت متأكد من تصفير عداد حبات العملات؟')) onResetCoinCounter(machine.machineId); }} className="px-4 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white border border-amber-500/30 rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2">
                    <Coins size={16} /> تصفير العملات
                  </button>
                </div>
              </div>

              {sessions.length > 0 ? (
                <div className="grid gap-3 max-h-[300px] overflow-y-auto pl-2 custom-scrollbar" dir="ltr">
                  {sessions.slice().reverse().map((session, index) => (
                    <div key={session.id || index} className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-slate-950/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors shadow-sm" dir="rtl">
                      <div className="flex items-center gap-4 mb-3 md:mb-0">
                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400 border border-slate-700"><span className="text-xs font-bold">#{sessions.length - index}</span></div>
                        <div className="flex items-start gap-3 border-r-2 border-emerald-500/50 pr-3">
                          <Power className="text-emerald-400 mt-0.5" size={16} />
                          <div><p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider mb-1">تشغيل (Power ON)</p>{formatFullDate(session.powerOnTime)}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 border-r-2 border-rose-500/50 pr-3 md:mr-8">
                        <Power className="text-rose-400 mt-0.5" size={16} />
                        <div><p className="text-[10px] text-rose-400/80 font-bold uppercase tracking-wider mb-1">إيقاف (Power OFF)</p>{formatFullDate(session.powerOffTime)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                  <History size={32} className="text-slate-600 mb-3" />
                  <p className="text-slate-400 text-sm font-medium">لا يوجد سجلات لهذه الماكينة.</p>
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

  // تجهيز بيانات سجل الأحداث الزمني (Audit Timeline)
  const auditEvents = useMemo(() => {
    let events = [];
    (currentStats.machinesList || []).forEach(m => {
      const mName = m.name || `Machine #${m.machineId}`;
      if (m.sessions) {
        m.sessions.forEach(s => {
          if (s.powerOnTime) events.push({ type: 'ON', time: parseDate(s.powerOnTime), machine: mName });
          if (s.powerOffTime) events.push({ type: 'OFF', time: parseDate(s.powerOffTime), machine: mName });
        });
      }
    });
    return events.sort((a, b) => b.time - a.time).slice(0, 8); // أحدث 8 أحداث
  }, [currentStats.machinesList]);

  // بيانات افتراضية للمخططات لحين ربطها بنقاط API حقيقية مستقبلاً
  const mockPeakData = [
    { time: '08:00', coins: 12 }, { time: '10:00', coins: 45 }, { time: '12:00', coins: 120 }, 
    { time: '14:00', coins: 90 }, { time: '16:00', coins: 65 }, { time: '18:00', coins: 180 }, 
    { time: '20:00', coins: 140 }, { time: '22:00', coins: 50 }
  ];

  const mockOfflineData = [
    { day: 'السبت', online: 150, offline: 10 }, { day: 'الأحد', online: 200, offline: 18 },
    { day: 'الإثنين', online: 180, offline: 5 }, { day: 'الثلاثاء', online: 220, offline: 40 },
    { day: 'الأربعاء', online: 250, offline: 0 }, { day: 'الخميس', online: 190, offline: 25 }
  ];

  if (loading) return ( <div className="flex h-screen items-center justify-center bg-[#0B0F19] text-xl font-bold text-white" dir="rtl"><Activity className="animate-spin text-cyan-400" size={48} /></div> );
  if (!stats && fetchError) return ( <div className="flex h-screen flex-col items-center justify-center bg-[#0B0F19] text-white" dir="rtl"><AlertTriangle size={48} className="text-rose-400 animate-pulse mb-4" /><h2>تعذّر الوصول للسيرفر</h2></div> );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-cyan-500/30 pb-20" dir="rtl">
      {/* Header - SLR Branding */}
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-[#0B0F19]/80 border-b border-slate-800/80 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-extrabold tracking-widest uppercase bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              SLR
            </h1>
            <div className="border-r-2 border-slate-700 pr-4">
              <span className="text-slate-300 text-lg font-bold tracking-wide block">لوحة القيادة المركزية</span>
              <span className="text-slate-500 text-xs flex items-center gap-1"><ShieldCheck size={12} className="text-cyan-500" /> نظام دفع مشفر وآمن</span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 relative z-10">
        
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'الماكينات المتصلة', val: currentStats.activeMachines, total: currentStats.totalMachines, icon: <Network size={20}/>, color: 'blue' }, 
            { label: 'إجمالي الإيرادات', val: Number(currentStats.totalRevenue).toFixed(2), suffix: 'JOD', icon: <DollarSign size={20}/>, color: 'emerald', glow: true }, 
            { label: 'العملات المقبولة', val: currentStats.totalAcceptedCoins, icon: <CheckCircle size={20}/>, color: 'cyan' }, 
            { label: 'العملات المرفوضة', val: currentStats.totalRejectedCoins, icon: <XCircle size={20}/>, color: 'rose' }
          ].map((stat, i) => (
            <div key={i} className={`relative overflow-hidden rounded-2xl bg-slate-900/50 p-6 border ${stat.glow ? 'border-emerald-500/30 shadow-[0_0_30px_rgba(52,211,153,0.1)]' : 'border-slate-800/80'} backdrop-blur-sm group hover:-translate-y-1 transition-transform`}>
              <div className={`absolute top-0 left-0 p-8 opacity-10 bg-gradient-to-br from-${stat.color}-500 to-transparent rounded-br-full`}></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-400 ring-1 ring-${stat.color}-500/20`}>{stat.icon}</div>
              </div>
              <h3 className="text-slate-400 text-sm font-bold tracking-wider mb-1 relative z-10">{stat.label}</h3>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className={`text-4xl font-black ${stat.glow ? 'text-emerald-400' : 'text-white'}`}>{stat.val}</span>
                {stat.total !== undefined && <span className="text-slate-500 text-sm font-bold">/ {stat.total}</span>}
                {stat.suffix && <span className="text-emerald-500/50 font-bold text-sm">{stat.suffix}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Main Table Section */}
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/80">
            <h2 className="text-xl font-black text-white flex items-center gap-3"><Monitor className="text-cyan-500" /> إدارة شبكة الماكينات</h2>
            <div className="relative group w-full sm:w-72">
              <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" placeholder="البحث بالاسم أو المعرف..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#0B0F19] border border-slate-700/80 rounded-xl pr-11 pl-4 py-2.5 text-sm text-slate-200 font-medium placeholder-slate-600 outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#0B0F19]/50 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-800/80">
                  {['name', 'status', 'currentCoinCount', 'currentCollected', 'totalCollected'].map(col => (
                    <th key={col} className="p-5 cursor-pointer hover:text-white transition-colors select-none" onClick={() => setSortConfig({ key: col, direction: sortConfig.key === col && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                      <div className="flex items-center justify-start gap-2">
                        {col === 'name' ? 'معرف الماكينة' : col === 'status' ? 'الحالة الحالية' : col === 'currentCoinCount' ? 'العملات' : col === 'currentCollected' ? 'رصيد السحب' : 'الإجمالي التراكمي'}
                        {sortConfig.key === col ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-cyan-500"/> : <ChevronDown size={14} className="text-cyan-500"/>) : <ArrowUpDown size={14} className="opacity-30"/>}
                      </div>
                    </th>
                  ))}
                  <th className="p-5 text-left">التفاصيل</th>
                </tr>
              </thead>
              <tbody>{filteredAndSortedMachines.map(machine => (<MachineRow key={machine.machineId} machine={machine} onSaveName={handleUpdateMachineName} onResetCashCounter={handleResetCashCounter} onResetCoinCounter={handleResetCoinCounter} />))}</tbody>
            </table>
          </div>
        </div>

        {/* Charts and Audit Section */}
        <div className="grid gap-6 xl:grid-cols-3">
          
          {/* Charts Column (Takes 2 columns on large screens) */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Peak Time Chart */}
            <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 p-6 flex flex-col h-[350px]">
              <div className="mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><Zap className="text-cyan-500" size={20} /> أوقات الذروة واستهلاك الماكينات</h2>
              </div>
              <div className="flex-1 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockPeakData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCoins" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                    <Area type="monotone" dataKey="coins" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorCoins)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Offline vs Online Chart */}
            <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 p-6 flex flex-col h-[350px]">
              <div className="mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><History className="text-amber-500" size={20} /> تحليل العملات (أونلاين مقابل المتزامن أوفلاين)</h2>
              </div>
              <div className="flex-1 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockOfflineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#1e293b', opacity: 0.4 }} contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="online" name="مباشر (Online)" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} maxBarSize={50} />
                    <Bar dataKey="offline" name="تزامن أوفلاين" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Audit Timeline Column */}
          <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 p-6 h-full min-h-[724px]">
            <div className="mb-6 border-b border-slate-800 pb-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Activity className="text-purple-500" size={20} /> سجل الأحداث الزمني</h2>
            </div>
            
            <div className="relative border-r-2 border-slate-700/50 pr-6 space-y-8 mt-6 before:content-[''] before:absolute before:top-0 before:-right-0.5 before:w-1.5 before:h-full before:bg-gradient-to-b before:from-slate-700/50 before:to-transparent">
              {auditEvents.length > 0 ? auditEvents.map((ev, i) => (
                <div key={i} className="relative group">
                  {/* Timeline Node Point */}
                  <div className={`absolute -right-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-[#0B0F19] ${ev.type === 'ON' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`}></div>
                  
                  <div className="flex flex-col gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit ${ev.type === 'ON' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'}`}>
                      {ev.time.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })} - {ev.time.toLocaleDateString('ar-JO', { month: 'short', day: 'numeric' })}
                    </span>
                    <h4 className="text-white font-bold text-sm mt-1">{ev.type === 'ON' ? 'إقلاع النظام (Power ON)' : 'إيقاف النظام (Power OFF)'}</h4>
                    <p className="text-xs text-slate-400 mt-1">تحديث حالة الماكينة <span className="text-cyan-400 font-bold">{ev.machine}</span></p>
                  </div>
                </div>
              )) : (
                <div className="text-slate-500 text-sm text-center mt-10 italic">لا يوجد أحداث مسجلة حالياً</div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
