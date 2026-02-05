'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import dynamic from 'next/dynamic'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Dumbbell, Trash2, Plus, Minus, CheckCircle, TrendingDown, AlertTriangle } from 'lucide-react'

const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const ReferenceLine = dynamic(() => import('recharts').then(mod => mod.ReferenceLine), { ssr: false })

export default function Home() {
  const [members, setMembers] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<any | null>(null)
  const [weightLogs, setWeightLogs] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [trainingTime, setTrainingTime] = useState('')
  const [workoutProgram, setWorkoutProgram] = useState('')
  const [fullName, setFullName] = useState('')
  const [type, setType] = useState('Birebir')
  const [newWeight, setNewWeight] = useState('')
  const [localNotes, setLocalNotes] = useState('')
  const [localGoal, setLocalGoal] = useState('')
  const [localHeight, setLocalHeight] = useState('')
  const [saveStatus, setSaveStatus] = useState(false)

  // MODAL SCROLL DURDURMA
  useEffect(() => {
    if (selectedMember) { document.body.style.overflow = 'hidden' }
    else { document.body.style.overflow = 'unset' }
  }, [selectedMember])

  // SABİT SIRALAMALI VERİ ÇEKME
  async function fetchData() {
    try {
      // Önce created_at (yeni gelen başa), eğer o aynıysa id (isim) sırasına göre diz
      const { data: mData } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: true }); // Eşitlik bozucu kural eklendi

      const { data: wData } = await supabase.from('weight_logs').select('*')
      
      const membersWithLogs = mData?.map(member => ({
        ...member,
        weight_logs: wData?.filter(log => log.member_id === member.id) || []
      }))

      setMembers(membersWithLogs || [])

      const todayStr = format(new Date(), 'yyyy-MM-dd')
      const { data: aData } = await supabase.from('appointments').select('*').eq('training_date', todayStr)
      setTodayAppointments(aData || [])
    } catch (err) { console.error(err) }
  }

  useEffect(() => { fetchData() }, [])

  // VKİ DURUMU
  const lastWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : 0
  const hVal = parseFloat(localHeight) || 0
  const bmi = (lastWeight > 0 && hVal > 0) ? (lastWeight / (hVal * hVal)).toFixed(1) : '--'

  const getBmiStatus = (val: string) => {
    const n = parseFloat(val)
    if (isNaN(n)) return { label: 'Veri Yok', color: 'text-gray-500' }
    if (n < 18.5) return { label: 'Zayıf', color: 'text-blue-400' }
    if (n < 25) return { label: 'İdeal', color: 'text-green-400' }
    if (n < 30) return { label: 'Fazla Kilolu', color: 'text-yellow-500' }
    return { label: 'Obezite', color: 'text-red-500' }
  }

  async function showProfile(member: any) {
    setSelectedMember(member)
    setLocalNotes(member.notes || '')
    setLocalGoal(member.goal_weight?.toString() || '')
    setLocalHeight(member.height?.toString() || '')
    const { data: wData } = await supabase.from('weight_logs').select('*').eq('member_id', member.id).order('recorded_at', { ascending: true })
    setWeightLogs(wData || [])
    const { data: aData } = await supabase.from('appointments').select('*').eq('member_id', member.id)
    setAppointments(aData || [])
  }

  async function saveField(field: string, value: any) {
    if (!selectedMember) return
    await supabase.from('members').update({ [field]: value }).eq('id', selectedMember.id)
    setSaveStatus(true)
    setTimeout(() => setSaveStatus(false), 2000)
    fetchData()
  }

  async function saveAppointment() {
    if (!selectedDate || !selectedMember) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    await supabase.from('appointments').upsert({ member_id: selectedMember.id, training_date: dateStr, training_time: trainingTime, workout_program: workoutProgram }, { onConflict: 'member_id, training_date' })
    showProfile(selectedMember)
    setSaveStatus(true)
    setTimeout(() => setSaveStatus(false), 2000)
    fetchData()
  }

  // +/- BUTONLARI VE SEANS GÜNCELLEME
  async function updateSession(e: any, memberId: any, newCount: number) { 
    e.stopPropagation(); 
    if (newCount < 0) return; 
    await supabase.from('members').update({ remaining_sessions: newCount }).eq('id', memberId); 
    fetchData(); 
  }

  async function togglePayment(e: any, memberId: any, currentStatus: string) { 
    e.stopPropagation(); 
    const newStatus = currentStatus === 'Ödendi' ? 'Borçlu' : 'Ödendi'; 
    await supabase.from('members').update({ payment_status: newStatus }).eq('id', memberId); 
    fetchData(); 
  }

  async function deleteMember(e: any, memberId: any) { e.stopPropagation(); if (window.confirm(`${memberId} silinsin mi?`)) { await supabase.from('members').delete().eq('id', memberId); fetchData(); } }
  async function addWeight(e: React.FormEvent) { e.preventDefault(); if (!newWeight || !selectedMember) return; await supabase.from('weight_logs').insert([{ member_id: selectedMember.id, weight: parseFloat(newWeight) }]); setNewWeight(''); showProfile(selectedMember); fetchData(); }

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })

  return (
    <main className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {members.some(m => m.remaining_sessions <= 2) && (
          <div className="mb-8 bg-orange-500/10 border border-orange-500/30 p-4 rounded-3xl animate-pulse flex items-center gap-3 shadow-lg">
            <AlertTriangle className="text-orange-500" size={20}/>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-200">Kritik Seanslar Mevcut!</span>
          </div>
        )}

        <header className="mb-12 text-center border-b border-white/5 pb-8">
          <h1 className="text-6xl font-black text-green-400 italic tracking-tighter uppercase drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]">ONE TO ONE</h1>
          <p className="text-gray-500 text-[10px] tracking-[0.6em] font-bold uppercase mt-3 italic">Professional PT Dashboard</p>
        </header>

        {/* AJANDA */}
        <section className="mb-12 text-left px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-6 flex items-center gap-2">
                <Clock className="text-green-500" size={16}/> Günün Randevuları
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {todayAppointments.length > 0 ? todayAppointments.map((app) => (
                    <div key={app.id} className="bg-white/5 border border-white/5 p-6 rounded-[2.5rem] backdrop-blur-md shadow-xl text-left">
                        <div className="flex justify-between items-start mb-4">
                            <span className="font-black text-green-400 text-lg uppercase tracking-tight">{app.member_id}</span>
                            <span className="bg-green-500 text-black text-[10px] font-black px-3 py-1 rounded-full">{app.training_time}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 italic leading-relaxed text-left">{app.workout_program || 'Program henüz yazılmadı'}</p>
                    </div>
                )) : (
                    <div className="col-span-full py-10 border border-dashed border-white/10 rounded-[2.5rem] text-center text-gray-600 text-[10px] font-black uppercase tracking-widest">Bugün için randevu planlanmadı.</div>
                )}
            </div>
        </section>

        {/* ÜYE EKLEME */}
        <section className="mb-12 bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl text-left">
          <form onSubmit={(e) => { e.preventDefault(); if (fullName) { supabase.from('members').insert([{ id: fullName, membership_type: type, remaining_sessions: 12, payment_status: 'Ödendi' }]).then(() => { setFullName(''); fetchData(); }) } }} className="flex flex-col md:flex-row gap-4">
            <input type="text" placeholder="Üye Adı Soyadı" value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 outline-none font-bold" />
            <select value={type} onChange={(e) => setType(e.target.value)} className="bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-bold text-sm outline-none">
              <option value="Birebir">Birebir Seans</option>
              <option value="Grup">Grup Dersi</option>
            </select>
            <button type="submit" className="bg-green-500 text-black font-black px-12 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all uppercase text-sm shadow-xl shadow-green-500/20">Ekle</button>
          </form>
        </section>

        {/* ÜYE LİSTESİ */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 text-left">
          {members.map((member) => {
            const progress = (member.weight_logs && member.weight_logs.length >= 2) ? (member.weight_logs[member.weight_logs.length - 1].weight - member.weight_logs[0].weight).toFixed(1) : null;
            return (
              <div key={member.id} onClick={() => showProfile(member)} className={`group bg-white/5 backdrop-blur-sm p-8 rounded-[3rem] border transition-all duration-300 flex justify-between items-center cursor-pointer shadow-xl ${member.remaining_sessions <= 2 ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/5 hover:border-green-500/30'}`}>
                <div className="flex items-center gap-6">
                  <button onClick={(e) => deleteMember(e, member.id)} className="text-xl opacity-10 group-hover:opacity-100 hover:text-red-500 transition-all"><Trash2 size={22}/></button>
                  <div>
                    <h3 className="font-bold uppercase text-2xl mb-1 tracking-tight">{member.id}</h3>
                    <div className="flex items-center gap-3">
                        <button onClick={(e) => togglePayment(e, member.id, member.payment_status)} className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase ${member.payment_status === 'Ödendi' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500 animate-pulse'}`}>{member.payment_status}</button>
                        {progress && (
                            <span className={`text-[10px] font-black flex items-center gap-1 ${parseFloat(progress) <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                <TrendingDown size={12}/> {progress} KG
                            </span>
                        )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <span className={`text-6xl font-black leading-none ${member.remaining_sessions <= 2 ? 'text-orange-500' : 'text-green-400'}`}>{member.remaining_sessions}</span>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-2 text-center">Seans</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={(e) => updateSession(e, member.id, member.remaining_sessions + 1)} className="w-12 h-12 border border-white/10 text-white rounded-2xl font-black transition-all hover:bg-green-500 hover:text-black hover:border-green-500 flex items-center justify-center shadow-lg"><Plus/></button>
                    <button onClick={(e) => updateSession(e, member.id, member.remaining_sessions - 1)} className="w-12 h-12 border border-white/10 text-white rounded-2xl font-black transition-all hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center shadow-lg"><Minus/></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* MODAL */}
        {selectedMember && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center backdrop-blur-3xl animate-in fade-in duration-300">
            <div className="bg-[#080808] border border-white/10 rounded-[3.5rem] w-full h-full md:h-[95vh] md:w-[95vw] lg:max-w-6xl relative shadow-[0_0_120px_rgba(34,197,94,0.15)] flex flex-col overflow-hidden">
              <button onClick={() => setSelectedMember(null)} className="absolute top-8 right-8 text-gray-500 text-3xl hover:text-white transition-colors z-[110]">✕</button>
              <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar text-left">
                <div className="mb-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-10 border-b border-white/5 pb-10">
                  <div className="text-center md:text-left">
                    <h2 className="text-5xl font-black text-green-400 uppercase tracking-tighter leading-none mb-6 text-left">{selectedMember.id}</h2>
                    <div className="flex flex-wrap gap-5 justify-center md:justify-start">
                      <div className="flex flex-col"><input type="text" value={localGoal} placeholder="0" onChange={(e) => setLocalGoal(e.target.value)} onBlur={() => saveField('goal_weight', parseFloat(localGoal) || 0)} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-2 text-sm text-yellow-500 w-24 outline-none font-bold text-center" /><span className="text-[9px] text-gray-600 font-black uppercase mt-2 text-center">Hedef</span></div>
                      <div className="flex flex-col"><input type="text" value={localHeight} placeholder="1.85" onChange={(e) => setLocalHeight(e.target.value)} onBlur={() => saveField('height', parseFloat(localHeight) || 0)} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-2 text-sm text-blue-400 w-28 outline-none font-bold text-center" /><span className="text-[9px] text-gray-600 font-black uppercase mt-2 text-center">Boy (m)</span></div>
                      <div className="bg-white/5 px-6 py-2 rounded-2xl border border-white/10 text-center flex flex-col justify-center min-w-[100px]"><span className="text-xl font-black leading-none">{bmi}</span><span className={`text-[9px] font-black uppercase mt-1 ${getBmiStatus(bmi).color}`}>{getBmiStatus(bmi).label}</span></div>
                    </div>
                  </div>
                  <div className={`transition-all duration-700 flex items-center gap-3 ${saveStatus ? 'opacity-100' : 'opacity-0'}`}><span className="text-green-500 text-xs font-black uppercase italic">Kaydedildi</span><CheckCircle className="text-green-500" size={24}/></div>
                </div>

                <div className="grid lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="bg-black/60 p-8 rounded-[3rem] border border-white/5 shadow-inner">
                      <div className="flex justify-between items-center mb-8 px-4">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={24}/></button>
                        <h3 className="font-black text-lg uppercase tracking-widest text-green-400">{format(currentMonth, 'MMMM yyyy', { locale: tr })}</h3>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={24}/></button>
                      </div>
                      <div className="grid grid-cols-7 gap-3 text-center">
                        {['Pt', 'Sa', 'Çr', 'Pr', 'Cu', 'Ct', 'Pz'].map(d => <div key={d} className="text-[11px] text-gray-700 font-black uppercase mb-2">{d}</div>)}
                        {daysInMonth.map((day, idx) => {
                          const hasTraining = appointments.some(a => isSameDay(new Date(a.training_date), day))
                          return (
                            <button key={idx} onClick={() => { setSelectedDate(day); const app = appointments.find(a => isSameDay(new Date(a.training_date), day)); setTrainingTime(app?.training_time || ''); setWorkoutProgram(app?.workout_program || ''); }} 
                              className={`aspect-square rounded-2xl text-sm font-bold transition-all flex items-center justify-center
                              ${hasTraining ? 'bg-green-500 text-black shadow-lg scale-105' : 'bg-white/5 text-gray-500 hover:bg-white/10'} 
                              ${selectedDate && isSameDay(day, selectedDate) ? 'ring-2 ring-white ring-offset-4 ring-offset-black' : ''}`}>
                              {format(day, 'd')}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {selectedDate && (
                      <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6 animate-in slide-in-from-bottom duration-500 shadow-inner text-left">
                        <p className="text-green-400 font-black uppercase text-xs tracking-widest text-left">📅 {format(selectedDate, 'd MMMM EEEE', { locale: tr })}</p>
                        <input type="time" value={trainingTime} onChange={(e) => setTrainingTime(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-xl font-black text-green-400 outline-none" />
                        <textarea value={workoutProgram} onChange={(e) => setWorkoutProgram(e.target.value)} className="w-full bg-black border border-white/10 rounded-3xl p-6 h-40 text-sm outline-none resize-none shadow-inner leading-relaxed" placeholder="Egzersizler..."></textarea>
                        <button onClick={saveAppointment} className="w-full bg-green-500 text-black font-black py-4 rounded-[1.5rem] uppercase text-[10px] tracking-widest shadow-xl">Kaydet</button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-8">
                    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 shadow-inner">
                      <div className="h-64 w-full bg-black/30 rounded-[2rem] p-4 text-left">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weightLogs.map(l => ({ z: new Date(l.recorded_at).getTime(), t: new Date(l.recorded_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }), k: l.weight }))}>
                              <CartesianGrid strokeDasharray="6 6" stroke="#1a1a1a" vertical={false} />
                              <XAxis dataKey="z" hide />
                              <YAxis stroke="#404040" fontSize={11} axisLine={false} tickLine={false} domain={['dataMin - 3', 'dataMax + 3']} />
                              <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: 'none' }} />
                              {selectedMember.goal_weight && <ReferenceLine y={selectedMember.goal_weight} stroke="#eab308" strokeDasharray="5 5" />}
                              <Line type="monotone" dataKey="k" stroke="#22c55e" strokeWidth={6} dot={{ fill: '#22c55e', r: 6 }} animationDuration={1500} />
                            </LineChart>
                          </ResponsiveContainer>
                      </div>
                    </div>
                    <form onSubmit={addWeight} className="flex flex-col gap-4 bg-black/60 p-6 rounded-[2.5rem] border border-white/5 text-left"><p className="text-[10px] text-gray-600 font-black uppercase tracking-widest ml-1 text-left">Yeni Ölçüm</p><input type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} className="bg-transparent px-4 py-2 text-2xl font-black border-b border-white/5 outline-none" placeholder="Kilo..." /><button type="submit" className="bg-green-500 text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-lg">Ekle</button></form>
                    <textarea value={localNotes} onChange={(e) => setLocalNotes(e.target.value)} onBlur={() => saveField('notes', localNotes)} className="w-full h-44 bg-black/60 border border-white/5 rounded-[2.5rem] p-7 text-sm outline-none resize-none shadow-inner leading-relaxed text-left" placeholder="Notlar..."></textarea>
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