'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase' 
import dynamic from 'next/dynamic'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Clock, Dumbbell, Trash2, Plus, Minus, CheckCircle, TrendingDown, AlertTriangle, XCircle, Copy, ChevronLeft, ChevronRight, Apple, Instagram } from 'lucide-react'

const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const ReferenceLine = dynamic(() => import('recharts').then(mod => mod.ReferenceLine), { ssr: false })

export default function AdminDashboard() {
  const [members, setMembers] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<any | null>(null)
  const [weightLogs, setWeightLogs] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [dietPlan, setDietPlan] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [trainingTime, setTrainingTime] = useState('')
  const [workoutProgram, setWorkoutProgram] = useState('')
  const [newWeight, setNewWeight] = useState('')
  const [localNotes, setLocalNotes] = useState('')
  const [localGoal, setLocalGoal] = useState('')
  const [localHeight, setLocalHeight] = useState('')
  const [saveStatus, setSaveStatus] = useState(false)

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

  useEffect(() => { fetchData() }, [])

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault(); if (!fullName) return;
    const { error } = await supabase.from('members').insert([{ id: fullName, slug: slugify(fullName), membership_type: 'Birebir', remaining_sessions: 12, payment_status: 'Ödendi' }]);
    if (!error) { setFullName(''); fetchData(); }
  }

  async function togglePayment(e: any, memberId: any, currentStatus: string) { 
    e.stopPropagation(); 
    const newStatus = currentStatus === 'Ödendi' ? 'Borçlu' : 'Ödendi'; 
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, payment_status: newStatus } : m));
    await supabase.from('members').update({ payment_status: newStatus }).eq('id', memberId); 
  }

  async function updateSession(e: any, memberId: any, newCount: number) { 
    e.stopPropagation(); if (newCount < 0) return; 
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, remaining_sessions: newCount } : m));
    await supabase.from('members').update({ remaining_sessions: newCount }).eq('id', memberId); 
  }

  async function showProfile(member: any) {
    setSelectedMember(member); setLocalNotes(member.notes || ''); setLocalGoal(member.goal_weight?.toString() || ''); setLocalHeight(member.height?.toString() || '');
    const { data: wData } = await supabase.from('weight_logs').select('*').eq('member_id', member.id).order('recorded_at', { ascending: true });
    setWeightLogs(wData || []);
    const { data: aData } = await supabase.from('appointments').select('*').eq('member_id', member.id);
    setAppointments(aData || []);
    const { data: dData } = await supabase.from('diet_plans').select('*').eq('member_id', member.id).maybeSingle();
    setDietPlan(dData || { breakfast: '', lunch: '', dinner: '', snacks: '' });
  }

  async function saveField(field: string, value: any) {
    if (!selectedMember) return;
    setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, [field]: value } : m));
    await supabase.from('members').update({ [field]: value }).eq('id', selectedMember.id);
    setSaveStatus(true); setTimeout(() => setSaveStatus(false), 2000);
  }

  async function saveDietPlan(field: string, value: string) {
    if (!selectedMember) return;
    const newPlan = { ...dietPlan, [field]: value, member_id: selectedMember.id };
    await supabase.from('diet_plans').upsert(newPlan, { onConflict: 'member_id' });
    setDietPlan(newPlan); setSaveStatus(true); setTimeout(() => setSaveStatus(false), 2000);
  }

  async function saveAppointment() {
    if (!selectedDate || !selectedMember) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    await supabase.from('appointments').upsert({ member_id: selectedMember.id, training_date: dateStr, training_time: trainingTime, workout_program: workoutProgram }, { onConflict: 'member_id, training_date' });
    showProfile(selectedMember); setSaveStatus(true); setTimeout(() => setSaveStatus(false), 2000); fetchData();
  }

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const lastWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : 0;
  const bmi = (lastWeight > 0 && parseFloat(localHeight) > 0) ? (lastWeight / (parseFloat(localHeight) ** 2)).toFixed(1) : '--';
  const getBmiStatus = (val: string) => {
    const n = parseFloat(val); if (isNaN(n)) return { label: '---', color: 'text-gray-500' };
    if (n < 18.5) return { label: 'Zayıf', color: 'text-blue-400' }; if (n < 25) return { label: 'İdeal', color: 'text-green-400' };
    if (n < 30) return { label: 'Kilolu', color: 'text-yellow-500' }; return { label: 'Obezite', color: 'text-red-500' };
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-green-500/30 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        {members.some(m => m.remaining_sessions <= 2) && (
          <div className="mb-8 bg-orange-500/10 border border-orange-500/30 p-4 rounded-3xl animate-pulse flex items-center gap-3">
            <AlertTriangle className="text-orange-500" size={20}/><span className="text-[10px] font-black uppercase tracking-widest text-orange-200 text-left">Seansı Azalan Üyeler Var!</span>
          </div>
        )}

        <header className="mb-12 text-center border-b border-white/5 pb-8">
          <h1 className="text-6xl font-black text-green-400 italic tracking-tighter uppercase text-center drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]">ONE TO ONE</h1>
          <p className="text-gray-500 text-[10px] tracking-[0.6em] font-bold uppercase mt-3 italic text-center">Professional PT Management</p>
        </header>

        <section className="mb-12 text-left">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-6 flex items-center gap-2 px-2"><Clock className="text-green-500" size={16}/> Günün Randevuları ({format(new Date(), 'd MMMM', { locale: tr })})</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {todayAppointments.length > 0 ? todayAppointments.map((app) => (
                    <div key={app.id} className="bg-white/5 border border-white/5 p-6 rounded-[2.5rem] shadow-xl text-left">
                        <div className="flex justify-between items-start mb-4 text-left"><span className="font-black text-green-400 text-lg uppercase text-left">{app.member_id}</span><span className="bg-green-500 text-black text-[10px] font-black px-3 py-1 rounded-full">{app.training_time}</span></div>
                        <p className="text-[10px] text-gray-400 italic text-left">{app.workout_program || 'Not yok'}</p>
                    </div>
                )) : <div className="col-span-full py-10 border border-dashed border-white/10 rounded-[2.5rem] text-center text-gray-600 font-black uppercase text-[10px]">Bugün için randevu yok.</div>}
            </div>
        </section>

        <section className="mb-12 bg-white/5 p-8 rounded-[3rem] border border-white/5 text-left shadow-2xl">
          <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-4">
            <input type="text" placeholder="Yeni Üye Adı" value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 outline-none font-bold text-left" />
            <button type="submit" className="bg-green-500 text-black font-black px-12 py-4 rounded-2xl uppercase text-sm hover:scale-105 transition-all">Kaydet</button>
          </form>
        </section>

        <div className="grid md:grid-cols-2 gap-6 mb-12 text-left">
          {members.map((member) => {
             const logs = member.weight_logs || [];
             const prog = logs.length >= 2 ? (logs[logs.length-1].weight - logs[0].weight).toFixed(1) : null;
             return (
                <div key={member.id} onClick={() => showProfile(member)} className={`group bg-white/5 p-8 rounded-[3rem] border transition-all flex justify-between items-center cursor-pointer shadow-xl ${member.remaining_sessions <= 2 ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/5 hover:border-green-500/30'}`}>
                    <div className="flex items-center gap-6 text-left">
                        <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Silinsin mi?')) { supabase.from('members').delete().eq('id', member.id).then(() => fetchData()); } }} className="opacity-10 group-hover:opacity-100 hover:text-red-500"><Trash2 size={22}/></button>
                        <div className="text-left">
                            <h3 className="font-bold uppercase text-2xl mb-1 text-left">{member.id}</h3>
                            <div className="flex items-center gap-3 text-left">
                                <button onClick={(e) => togglePayment(e, member.id, member.payment_status)} className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase ${member.payment_status === 'Ödendi' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500 animate-pulse'}`}>{member.payment_status}</button>
                                {prog && <span className={`text-[10px] font-black flex items-center gap-1 ${parseFloat(prog) <= 0 ? 'text-green-400' : 'text-red-400'}`}><TrendingDown size={12}/> {prog} KG</span>}
                                <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/${member.slug}`); alert("Link kopyalandı!"); }} className="text-gray-500 hover:text-blue-400"><Copy size={14}/></button>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-8 text-left">
                        <span className={`text-6xl font-black ${member.remaining_sessions <= 2 ? 'text-orange-500' : 'text-green-400'}`}>{member.remaining_sessions}</span>
                        <div className="flex flex-col gap-2">
                            <button onClick={(e) => updateSession(e, member.id, member.remaining_sessions + 1)} className="w-12 h-12 border border-white/10 rounded-2xl font-black flex items-center justify-center hover:bg-green-500 transition-all"><Plus/></button>
                            <button onClick={(e) => updateSession(e, member.id, member.remaining_sessions - 1)} className="w-12 h-12 border border-white/10 rounded-2xl font-black flex items-center justify-center hover:bg-red-500 transition-all"><Minus/></button>
                        </div>
                    </div>
                </div>
             )
          })}
        </div>

        {selectedMember && (
          <div className="fixed inset-0 bg-black/95 z-[100] overflow-y-auto p-4 md:p-10 flex items-start justify-center">
            <div className="bg-[#080808] border border-white/10 rounded-[3.5rem] w-full max-w-6xl relative p-8 md:p-12 shadow-2xl flex flex-col my-auto text-left">
              <button onClick={() => setSelectedMember(null)} className="absolute top-8 right-8 text-gray-500 text-3xl hover:text-white transition-all z-[110]">✕</button>
              <div className="mb-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-10 border-b border-white/5 pb-10 text-left">
                  <div className="text-left w-full">
                    <h2 className="text-5xl font-black text-green-400 uppercase leading-none mb-6 text-left">{selectedMember.id}</h2>
                    <div className="flex flex-wrap gap-5 justify-start text-left">
                      <div className="flex flex-col items-center"><input type="text" value={localGoal} placeholder="0" onChange={(e) => setLocalGoal(e.target.value)} onBlur={() => saveField('goal_weight', parseFloat(localGoal) || 0)} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-2 text-sm text-yellow-500 w-24 outline-none font-bold text-center" /><span className="text-[9px] text-gray-600 font-black uppercase mt-2">Hedef</span></div>
                      <div className="flex flex-col items-center"><input type="text" value={localHeight} placeholder="1.85" onChange={(e) => setLocalHeight(e.target.value)} onBlur={() => saveField('height', parseFloat(localHeight) || 0)} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-2 text-sm text-blue-400 w-28 outline-none font-bold text-center" /><span className="text-[9px] text-gray-600 font-black uppercase mt-2">Boy (m)</span></div>
                      <div className="bg-white/5 px-6 py-2 rounded-2xl border border-white/10 text-center flex flex-col justify-center min-w-[100px]"><span className="text-xl font-black leading-none">{bmi}</span><span className={`text-[9px] font-black uppercase mt-1 ${getBmiStatus(bmi).color}`}>{getBmiStatus(bmi).label}</span></div>
                    </div>
                  </div>
                  <div className={`transition-all duration-700 flex items-center gap-3 ${saveStatus ? 'opacity-100' : 'opacity-0'}`}><span className="text-green-500 text-xs font-black uppercase italic tracking-widest text-left text-left">Kaydedildi</span><CheckCircle className="text-green-500" size={24}/></div>
              </div>
              <div className="grid lg:grid-cols-2 gap-12 text-left">
                <div className="space-y-8 text-left">
                  <div className="bg-black/60 p-8 rounded-[3rem] border border-white/5 shadow-inner text-left">
                    <div className="flex justify-between items-center mb-8 px-4 text-center"><button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={24}/></button><h3 className="font-black text-lg uppercase text-green-400">{format(currentMonth, 'MMMM yyyy', { locale: tr })}</h3><button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={24}/></button></div>
                    <div className="grid grid-cols-7 gap-3 text-center">
                      {['Pt', 'Sa', 'Çr', 'Pr', 'Cu', 'Ct', 'Pz'].map(d => <div key={d} className="text-[11px] text-gray-700 font-black uppercase mb-2">{d}</div>)}
                      {daysInMonth.map((day, idx) => (
                        <button key={idx} onClick={() => { setSelectedDate(day); const app = appointments.find(a => isSameDay(new Date(a.training_date), day)); setTrainingTime(app?.training_time || ''); setWorkoutProgram(app?.workout_program || ''); }} 
                          className={`aspect-square rounded-2xl text-sm font-bold flex items-center justify-center ${appointments.some(a => isSameDay(new Date(a.training_date), day)) ? 'bg-green-500 text-black shadow-lg scale-105' : 'bg-white/5 text-gray-500 hover:bg-white/10'} ${selectedDate && isSameDay(day, selectedDate) ? 'ring-2 ring-white' : ''}`}>{format(day, 'd')}</button>
                      ))}
                    </div>
                  </div>
                  {selectedDate && (
                    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6 animate-in slide-in-from-bottom duration-500 shadow-inner text-left">
                        <div className="flex justify-between items-center text-left"><p className="text-green-400 font-black uppercase text-xs tracking-widest text-left">📅 {format(selectedDate, 'd MMMM EEEE', { locale: tr })}</p></div>
                        <input type="time" value={trainingTime} onChange={(e) => setTrainingTime(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-xl font-black text-green-400 outline-none" /><textarea value={workoutProgram} onChange={(e) => setWorkoutProgram(e.target.value)} className="w-full bg-black border border-white/10 rounded-3xl p-6 h-40 text-sm outline-none resize-none text-left" placeholder="Program..."></textarea><button onClick={saveAppointment} className="w-full bg-green-500 text-black font-black py-4 rounded-[1.5rem] uppercase text-[10px] tracking-widest shadow-xl">Kaydet</button>
                    </div>
                  )}
                </div>
                <div className="space-y-8 text-left">
                    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-inner h-64 text-left">
                        <ResponsiveContainer width="100%" height="100%"><LineChart data={weightLogs.map(l => ({ z: new Date(l.recorded_at).getTime(), t: format(new Date(l.recorded_at), 'd MMM', { locale: tr }), k: l.weight }))}><XAxis dataKey="z" hide /><YAxis stroke="#404040" fontSize={11} domain={['dataMin - 3', 'dataMax + 3']} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '15px' }} />{selectedMember.goal_weight && <ReferenceLine y={selectedMember.goal_weight} stroke="#eab308" strokeDasharray="5 5" label={{ position: 'right', value: 'Hedef', fill: '#eab308', fontSize: 10 }} />}<Line type="monotone" dataKey="k" stroke="#22c55e" strokeWidth={6} dot={{ fill: '#22c55e', r: 6 }} animationDuration={1000} /></LineChart></ResponsiveContainer>
                    </div>
                    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-4 text-left">
                      <h3 className="text-[10px] font-black uppercase text-green-400 flex items-center gap-2 px-2"><Apple size={14}/> Beslenme Programı</h3>
                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="space-y-2 text-left"><p className="text-[9px] text-gray-500 font-black uppercase ml-1">Kahvaltı</p><textarea onBlur={(e) => saveDietPlan('breakfast', e.target.value)} defaultValue={dietPlan?.breakfast} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs outline-none h-20 resize-none italic text-left"/></div>
                        <div className="space-y-2 text-left"><p className="text-[9px] text-gray-500 font-black uppercase ml-1">Öğle</p><textarea onBlur={(e) => saveDietPlan('lunch', e.target.value)} defaultValue={dietPlan?.lunch} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs outline-none h-20 resize-none italic text-left"/></div>
                        <div className="space-y-2 text-left"><p className="text-[9px] text-gray-500 font-black uppercase ml-1">Akşam</p><textarea onBlur={(e) => saveDietPlan('dinner', e.target.value)} defaultValue={dietPlan?.dinner} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs outline-none h-20 resize-none italic text-left"/></div>
                        <div className="space-y-2 text-left"><p className="text-[9px] text-gray-500 font-black uppercase ml-1">Atıştırmalık</p><textarea onBlur={(e) => saveDietPlan('snacks', e.target.value)} defaultValue={dietPlan?.snacks} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs outline-none h-20 resize-none italic text-left"/></div>
                      </div>
                    </div>
                    <textarea value={localNotes} onChange={(e) => setLocalNotes(e.target.value)} onBlur={() => saveField('notes', localNotes)} className="w-full h-40 bg-black/60 border border-white/5 rounded-[2.5rem] p-7 text-sm outline-none resize-none shadow-inner text-left" placeholder="Hoca notları..."></textarea>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}