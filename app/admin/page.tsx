'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase' 
import dynamic from 'next/dynamic'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Clock, Dumbbell, Trash2, Plus, Minus, CheckCircle, TrendingDown, AlertTriangle, XCircle, Copy, ChevronLeft, ChevronRight, Apple, Ruler, Trash, Lock, Send, LogOut } from 'lucide-react'

// Grafikler - Client-side Only
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const ReferenceLine = dynamic(() => import('recharts').then(mod => mod.ReferenceLine), { ssr: false })

export default function AdminDashboard() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<any | null>(null)
  const [weightLogs, setWeightLogs] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [dietPlan, setDietPlan] = useState<any>(null)
  const [measurements, setMeasurements] = useState<any[]>([])
  
  const [fullName, setFullName] = useState('')
  const [newPass, setNewPass] = useState('12345')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [trainingTime, setTrainingTime] = useState('')
  const [workoutProgram, setWorkoutProgram] = useState('')
  const [newWeight, setNewWeight] = useState('')
  const [localNotes, setLocalNotes] = useState('')
  const [localGoal, setLocalGoal] = useState('')
  const [localHeight, setLocalHeight] = useState('')
  const [saveStatus, setSaveStatus] = useState(false)
  
  const [mShoulder, setMShoulder] = useState('')
  const [mChest, setMChest] = useState('')
  const [mArm, setMArm] = useState('')
  const [mWaist, setMWaist] = useState('')

  // 1. GÜVENLİK KONTROLÜ
  useEffect(() => {
    const role = localStorage.getItem('user_role')
    if (role !== 'admin') {
      router.push('/')
    } else {
      setIsAuthorized(true)
    }
  }, [router])

  // 2. SCROLL KİLİDİ
  useEffect(() => {
    if (selectedMember) { document.body.style.overflow = 'hidden' }
    else { document.body.style.overflow = 'unset' }
  }, [selectedMember])

  const slugify = (text: string) => {
    const map: any = { 'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u', 'ö': 'o', 'Ö': 'o', 'ı': 'i', 'İ': 'i' };
    let str = text;
    for (let key in map) { str = str.replace(new RegExp(key, 'g'), map[key]); }
    return str.toLowerCase().trim().replace(/\s+/g, '').replace(/[^-a-z0-9]/g, '');
  }

  async function fetchData() {
    try {
      const { data: mData } = await supabase.from('members').select('*').order('created_at', { ascending: false });
      const { data: wData } = await supabase.from('weight_logs').select('*')
      setMembers(mData?.map(m => ({ ...m, weight_logs: wData?.filter(log => log.member_id === m.id) || [] })) || [])
      
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      const { data: aData } = await supabase.from('appointments').select('*').eq('training_date', todayStr)
      setTodayAppointments(aData || [])
    } catch (err) { console.error(err) }
  }

  useEffect(() => { if (isAuthorized) fetchData() }, [isAuthorized])

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault(); if (!fullName) return;
    const { error } = await supabase.from('members').insert([{ 
      id: fullName.trim(), slug: slugify(fullName), password: newPass, membership_type: 'Birebir', remaining_sessions: 12, payment_status: 'Ödendi' 
    }]);
    if (!error) { setFullName(''); setNewPass('12345'); fetchData(); }
    else { alert("Hata: " + error.message); }
  }

  async function handleLogout() { localStorage.clear(); router.push('/'); }

  async function showProfile(member: any) {
    setSelectedMember(member); setLocalNotes(member.notes || ''); setLocalGoal(member.goal_weight?.toString() || ''); setLocalHeight(member.height?.toString() || '');
    const { data: wData } = await supabase.from('weight_logs').select('*').eq('member_id', member.id).order('recorded_at', { ascending: true });
    setWeightLogs(wData || []);
    const { data: aData } = await supabase.from('appointments').select('*').eq('member_id', member.id).order('training_date', { ascending: false });
    setAppointments(aData || []);
    const { data: dData } = await supabase.from('diet_plans').select('*').eq('member_id', member.id).maybeSingle();
    setDietPlan(dData || { breakfast: '', lunch: '', dinner: '', snacks: '' });
    const { data: msData } = await supabase.from('body_measurements').select('*').eq('member_id', member.id).order('recorded_at', { ascending: false });
    setMeasurements(msData || []);
  }

  async function saveField(field: string, value: any) {
    if (!selectedMember) return;
    const { error } = await supabase.from('members').update({ [field]: value }).eq('id', selectedMember.id);
    if (!error) {
      setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, [field]: value } : m));
      setSaveStatus(true); setTimeout(() => setSaveStatus(false), 2000);
    }
  }

  async function togglePayment(e: any, memberId: any, currentStatus: string) { 
    e.stopPropagation(); 
    const newStatus = currentStatus === 'Ödendi' ? 'Ödenmedi' : 'Ödendi'; 
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, payment_status: newStatus } : m));
    await supabase.from('members').update({ payment_status: newStatus }).eq('id', memberId); 
  }

  async function updateSession(e: any, memberId: any, newCount: number) { 
    e.stopPropagation(); if (newCount < 0) return; 
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, remaining_sessions: newCount } : m));
    await supabase.from('members').update({ remaining_sessions: newCount }).eq('id', memberId); 
  }

  async function addWeight(e: React.FormEvent) {
    e.preventDefault(); if (!newWeight || !selectedMember) return;
    await supabase.from('weight_logs').insert([{ member_id: selectedMember.id, weight: parseFloat(newWeight) }]);
    setNewWeight(''); showProfile(selectedMember); fetchData();
  }

  async function addMeasurement() {
    if (!selectedMember) return;
    const { error } = await supabase.from('body_measurements').insert([{ member_id: selectedMember.id, shoulder: parseFloat(mShoulder) || 0, chest: parseFloat(mChest) || 0, arm: parseFloat(mArm) || 0, waist: parseFloat(mWaist) || 0 }]);
    if (!error) { setMShoulder(''); setMChest(''); setMArm(''); setMWaist(''); setSaveStatus(true); setTimeout(() => setSaveStatus(false), 2000); showProfile(selectedMember); }
  }

  async function saveDietPlan(field: string, value: string) {
    if (!selectedMember) return;
    const newPlan = { ...dietPlan, [field]: value, member_id: selectedMember.id };
    await supabase.from('diet_plans').upsert(newPlan, { onConflict: 'member_id' });
    setDietPlan(newPlan); setSaveStatus(true); setTimeout(() => setSaveStatus(false), 2000);
  }

  async function saveAppointment() {
    if (!selectedDate || !selectedMember) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    await supabase.from('appointments').upsert({ member_id: selectedMember.id, training_date: dateStr, training_time: trainingTime, workout_program: workoutProgram }, { onConflict: 'member_id, training_date' });
    showProfile(selectedMember); setSaveStatus(true); setTimeout(() => setSaveStatus(false), 2000); fetchData();
  }

  if (!isAuthorized) return null

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const lastWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : 0;
  const bmi = (lastWeight > 0 && parseFloat(localHeight) > 0) ? (lastWeight / (parseFloat(localHeight) ** 2)).toFixed(1) : '--';
  const getBmiStatus = (val: string) => {
    const n = parseFloat(val); if (isNaN(n)) return { label: '---', color: 'text-gray-500' };
    if (n < 18.5) return { label: 'Zayıf', color: 'text-blue-400' }; if (n < 25) return { label: 'İdeal', color: 'text-green-400' };
    if (n < 30) return { label: 'Kilolu', color: 'text-yellow-500' }; return { label: 'Obezite', color: 'text-red-500' };
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-green-500/30 overflow-x-hidden text-left">
      <div className="max-w-6xl mx-auto">
        
        {/* AZALAN SEANS BANNER */}
        {members.some(m => m.remaining_sessions <= 2) && (
          <div className="mb-8 bg-orange-500/10 border border-orange-500/30 p-4 rounded-3xl animate-pulse flex items-center gap-3">
            <AlertTriangle className="text-orange-500" size={24}/><span className="text-[10px] font-black uppercase text-orange-200 tracking-widest text-left">Seansı Azalan Üyeler Var!</span>
          </div>
        )}

        <header className="mb-12 flex justify-between items-center border-b border-white/5 pb-8">
            <div className="text-left">
                <h1 className="text-5xl font-black text-green-400 italic uppercase drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]">ONE TO ONE</h1>
                <p className="text-gray-500 text-[10px] tracking-[0.5em] font-bold uppercase mt-1">Professional Antrenör Paneli</p>
            </div>
            <button onClick={handleLogout} className="bg-white/5 p-4 rounded-2xl hover:bg-red-500/20 transition-all group text-left"><LogOut className="text-gray-500 group-hover:text-red-500" size={24}/></button>
        </header>

        {/* GÜNÜN AJANDASI */}
        <section className="mb-12 text-left px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-6 flex items-center gap-2"><Clock className="text-green-500" size={16}/> Günün Randevuları</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {todayAppointments.length > 0 ? todayAppointments.map((app) => (
                    <div key={app.id} className="bg-white/5 border border-white/5 p-6 rounded-[2.5rem] shadow-xl text-left">
                        <div className="flex justify-between items-start mb-4 text-left"><span className="font-black text-green-400 text-lg uppercase">{app.member_id}</span><span className="bg-green-500 text-black text-[10px] font-black px-3 py-1 rounded-full">{app.training_time}</span></div>
                        <p className="text-[10px] text-gray-400 italic leading-relaxed text-left">{app.workout_program || 'Not yok.'}</p>
                    </div>
                )) : <div className="col-span-full py-10 border border-dashed border-white/10 rounded-[2.5rem] text-center text-gray-600 font-black uppercase text-[10px]">Planlı randevu yok.</div>}
            </div>
        </section>

        {/* ÜYE EKLEME */}
        <section className="mb-12 bg-white/5 p-8 rounded-[3rem] border border-white/5 text-left shadow-2xl">
          <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-4">
            <input type="text" placeholder="Üye Adı Soyadı" value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 outline-none font-bold text-left" />
            <div className="relative md:w-48 text-left">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16}/>
              <input type="text" placeholder="Şifre" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-10 pr-4 outline-none font-bold text-xs text-left" />
            </div>
            <button type="submit" className="bg-green-500 text-black font-black px-12 py-4 rounded-2xl uppercase text-sm active:scale-95 transition-all text-left">Kaydet</button>
          </form>
        </section>

        {/* ÜYE LİSTESİ */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 text-left">
          {members.map((member) => (
            <div key={member.id} onClick={() => showProfile(member)} className={`group bg-white/5 p-8 rounded-[3rem] border transition-all flex justify-between items-center cursor-pointer shadow-xl ${member.remaining_sessions <= 2 ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/5 hover:border-green-500/30'}`}>
              <div className="flex items-center gap-6 text-left">
                <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Üye silinsin mi?')) { supabase.from('members').delete().eq('id', member.id).then(() => fetchData()); } }} className="opacity-10 group-hover:opacity-100 hover:text-red-500 transition-all text-left"><Trash2 size={22}/></button>
                <div className="text-left">
                  <h3 className="font-bold uppercase text-2xl mb-1 text-left">{member.id}</h3>
                  <div className="flex items-center gap-3 text-left text-left">
                      <button onClick={(e) => togglePayment(e, member.id, member.payment_status)} className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase ${member.payment_status === 'Ödendi' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500 animate-pulse'}`}>{member.payment_status}</button>
                      <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/login`); alert("Giriş linki kopyalandı!"); }} className="text-gray-500 hover:text-blue-400 transition-colors text-left"><Copy size={14}/></button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-8 text-left">
                <span className={`text-6xl font-black ${member.remaining_sessions <= 2 ? 'text-orange-500' : 'text-green-400'}`}>{member.remaining_sessions}</span>
                <div className="flex flex-col gap-2 text-left">
                    <button onClick={(e) => updateSession(e, member.id, member.remaining_sessions + 1)} className="w-10 h-10 border border-white/10 rounded-xl font-black flex items-center justify-center hover:bg-green-500 transition-all text-left"><Plus size={18}/></button>
                    <button onClick={(e) => updateSession(e, member.id, member.remaining_sessions - 1)} className="w-10 h-10 border border-white/10 rounded-xl font-black flex items-center justify-center hover:bg-red-500 transition-all text-left"><Minus size={18}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL DETAY */}
        {selectedMember && (
          <div className="fixed inset-0 bg-black/95 z-[100] overflow-y-auto p-4 md:p-10 flex items-start justify-center">
            <div className="bg-[#080808] border border-white/10 rounded-[3.5rem] w-full max-w-6xl relative p-8 md:p-12 shadow-2xl flex flex-col my-auto text-left">
              <button onClick={() => setSelectedMember(null)} className="absolute top-8 right-8 text-gray-500 text-3xl hover:text-white transition-all z-[110]">✕</button>
              <div className="mb-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-10 border-b border-white/5 pb-10 text-left w-full text-left">
                  <div className="text-left w-full">
                    <h2 className="text-5xl font-black text-green-400 uppercase leading-none mb-6 text-left">{selectedMember.id}</h2>
                    <div className="flex flex-wrap gap-5 justify-start text-left text-left">
                      <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3 text-left">
                        <Lock size={14} className="text-gray-500 text-left"/><span className="text-[10px] font-black uppercase text-gray-600 text-left">Giriş: {selectedMember.slug}</span>
                        <input type="text" defaultValue={selectedMember.password} onBlur={(e) => saveField('password', e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold text-blue-400 w-24 text-left" />
                        <button onClick={() => {
                          const msg = `Selam! One To One antrenör panelin hazır.\nKullanıcı adın: ${selectedMember.slug}\nŞifren: ${selectedMember.password}\nLink: ${window.location.origin}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                        }} className="text-green-500 hover:scale-110 transition-transform text-left"><Send size={16}/></button>
                      </div>
                      <div className="flex flex-col items-center"><input type="text" value={localGoal} onChange={(e) => setLocalGoal(e.target.value)} onBlur={() => saveField('goal_weight', parseFloat(localGoal) || 0)} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-2 text-sm text-yellow-500 w-24 outline-none font-bold text-center" /><span className="text-[9px] text-gray-600 font-black uppercase mt-2">Hedef KG</span></div>
                      <div className="flex flex-col items-center"><input type="text" value={localHeight} onChange={(e) => setLocalHeight(e.target.value)} onBlur={() => saveField('height', parseFloat(localHeight) || 0)} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-2 text-sm text-blue-400 w-28 outline-none font-bold text-center" /><span className="text-[9px] text-gray-600 font-black uppercase mt-2">Boy (m)</span></div>
                      <div className="bg-white/5 px-6 py-2 rounded-2xl border border-white/10 text-center flex flex-col justify-center min-w-[100px] text-left"><span className="text-xl font-black leading-none">{bmi}</span><span className={`text-[9px] font-black uppercase mt-1 ${getBmiStatus(bmi).color}`}>{getBmiStatus(bmi).label}</span></div>
                    </div>
                  </div>
                  <div className={`transition-all duration-700 flex items-center gap-3 ${saveStatus ? 'opacity-100' : 'opacity-0'}`}><span className="text-green-500 text-xs font-black uppercase italic tracking-widest text-left">Kaydedildi</span><CheckCircle className="text-green-500" size={24}/></div>
              </div>

              <div className="grid lg:grid-cols-2 gap-12 text-left">
                {/* SOL SÜTUN */}
                <div className="space-y-8 text-left text-left">
                  <div className="bg-black/60 p-8 rounded-[3rem] border border-white/5 shadow-inner text-left text-left">
                    <div className="flex justify-between items-center mb-8 px-4 text-center"><button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={24}/></button><h3 className="font-black text-lg uppercase text-green-400">{format(currentMonth, 'MMMM yyyy', { locale: tr })}</h3><button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={24}/></button></div>
                    <div className="grid grid-cols-7 gap-3 text-center text-left">
                      {['Pt', 'Sa', 'Çr', 'Pr', 'Cu', 'Ct', 'Pz'].map(d => <div key={d} className="text-[11px] text-gray-700 font-black uppercase mb-2">{d}</div>)}
                      {daysInMonth.map((day, idx) => (
                        <button key={idx} onClick={() => { setSelectedDate(day); const app = appointments.find(a => isSameDay(new Date(a.training_date), day)); setTrainingTime(app?.training_time || ''); setWorkoutProgram(app?.workout_program || ''); }} 
                          className={`aspect-square rounded-2xl text-sm font-bold flex items-center justify-center ${appointments.some(a => isSameDay(new Date(a.training_date), day)) ? 'bg-green-500 text-black shadow-lg scale-105' : 'bg-white/5 text-gray-500'} ${selectedDate && isSameDay(day, selectedDate) ? 'ring-2 ring-white' : ''}`}>{format(day, 'd')}</button>
                      ))}
                    </div>
                  </div>
                  {selectedDate && (
                    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6 animate-in slide-in-from-bottom duration-500 shadow-inner text-left text-left text-left">
                        <div className="flex justify-between items-center"><p className="text-green-400 font-black uppercase text-xs tracking-widest text-left">📅 {format(selectedDate, 'd MMMM EEEE', { locale: tr })}</p>{appointments.some(a => isSameDay(new Date(a.training_date), selectedDate)) && (<button onClick={() => { if (window.confirm('Randevu silinsin mi?')) { supabase.from('appointments').delete().eq('member_id', selectedMember.id).eq('training_date', format(selectedDate, 'yyyy-MM-dd')).then(() => showProfile(selectedMember)); } }} className="text-red-500/50 hover:text-red-500 text-[10px] font-black uppercase flex items-center gap-1 transition-all text-left"><Trash size={14}/> Sil</button>)}</div>
                        <input type="time" value={trainingTime} onChange={(e) => setTrainingTime(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-xl font-black text-green-400 outline-none text-left" /><textarea value={workoutProgram} onChange={(e) => setWorkoutProgram(e.target.value)} className="w-full bg-black border border-white/10 rounded-3xl p-6 h-40 text-sm outline-none resize-none text-left leading-relaxed text-left" placeholder="Antrenman notları..."></textarea><button onClick={saveAppointment} className="w-full bg-green-500 text-black font-black py-4 rounded-[1.5rem] uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-xl shadow-green-500/10 text-left">Kaydet</button>
                    </div>
                  )}
                  <textarea value={localNotes} onChange={(e) => setLocalNotes(e.target.value)} onBlur={() => saveField('notes', localNotes)} className="w-full h-64 bg-black/60 border border-white/5 rounded-[2.5rem] p-8 text-sm outline-none resize-none shadow-inner italic text-left leading-relaxed text-left" placeholder="Genel antrenör notları..."></textarea>
                </div>
                
                {/* SAĞ SÜTUN */}
                <div className="space-y-8 text-left text-left">
                    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-inner h-64 text-left">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weightLogs.map(l => ({ z: new Date(l.recorded_at).getTime(), t: format(new Date(l.recorded_at), 'd MMM', { locale: tr }), k: l.weight }))}>
                                <XAxis dataKey="z" hide /><YAxis stroke="#404040" fontSize={11} domain={['dataMin - 3', 'dataMax + 3']} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '15px' }} />
                                {selectedMember.goal_weight && <ReferenceLine y={selectedMember.goal_weight} stroke="#eab308" strokeDasharray="5 5" label={{ position: 'right', value: 'Hedef', fill: '#eab308', fontSize: 10 }} />}
                                <Line type="monotone" dataKey="k" stroke="#22c55e" strokeWidth={6} dot={{ fill: '#22c55e', r: 6 }} animationDuration={1000} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    
                    {/* ÖLÇÜLER */}
                    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6 shadow-inner text-left text-left">
                      <h3 className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-2 px-2 text-left"><Ruler size={14}/> Vücut Ölçü Takibi (cm)</h3>
                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="flex flex-col gap-1 text-left"><p className="text-[8px] text-gray-500 font-black uppercase ml-1">Omuz</p><input type="number" value={mShoulder} onChange={(e) => setMShoulder(e.target.value)} className="bg-black/60 border border-white/5 rounded-xl p-3 text-xs outline-none text-left" placeholder="0"/></div>
                        <div className="flex flex-col gap-1 text-left"><p className="text-[8px] text-gray-500 font-black uppercase ml-1">Göğüs</p><input type="number" value={mChest} onChange={(e) => setMChest(e.target.value)} className="bg-black/60 border border-white/5 rounded-xl p-3 text-xs outline-none text-left" placeholder="0"/></div>
                        <div className="flex flex-col gap-1 text-left"><p className="text-[8px] text-gray-500 font-black uppercase ml-1">Kol</p><input type="number" value={mArm} onChange={(e) => setMArm(e.target.value)} className="bg-black/60 border border-white/5 rounded-xl p-3 text-xs outline-none text-left" placeholder="0"/></div>
                        <div className="flex flex-col gap-1 text-left"><p className="text-[8px] text-gray-500 font-black uppercase ml-1">Bel</p><input type="number" value={mWaist} onChange={(e) => setMWaist(e.target.value)} className="bg-black/60 border border-white/5 rounded-xl p-3 text-xs outline-none text-left" placeholder="0"/></div>
                      </div>
                      <button onClick={addMeasurement} className="w-full bg-blue-500 text-white font-black py-3 rounded-2xl uppercase text-[9px] active:scale-95 transition-all shadow-lg text-left">Ölçüleri Kaydet</button>
                    </div>

                    {/* BESLENME PROGRAMI (GERİ GELDİ!) */}
                    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-4 shadow-inner text-left text-left text-left">
                      <h3 className="text-[10px] font-black uppercase text-green-400 flex items-center gap-2 px-2 text-left"><Apple size={14}/> Beslenme Yönetimi</h3>
                      <div className="grid grid-cols-2 gap-4 text-left">
                        <textarea onBlur={(e) => saveDietPlan('breakfast', e.target.value)} defaultValue={dietPlan?.breakfast} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs outline-none h-20 resize-none italic text-left" placeholder="Kahvaltı"/>
                        <textarea onBlur={(e) => saveDietPlan('lunch', e.target.value)} defaultValue={dietPlan?.lunch} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs outline-none h-20 resize-none italic text-left" placeholder="Öğle"/>
                        <textarea onBlur={(e) => saveDietPlan('dinner', e.target.value)} defaultValue={dietPlan?.dinner} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs outline-none h-20 resize-none italic text-left" placeholder="Akşam"/>
                        <textarea onBlur={(e) => saveDietPlan('snacks', e.target.value)} defaultValue={dietPlan?.snacks} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs outline-none h-20 resize-none italic text-left" placeholder="Atıştırmalık"/>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}