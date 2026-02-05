'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import dynamic from 'next/dynamic'

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
  const [fullName, setFullName] = useState('')
  const [type, setType] = useState('Birebir')
  const [newWeight, setNewWeight] = useState('')
  const [weightLogs, setWeightLogs] = useState<any[]>([])
  const [localNotes, setLocalNotes] = useState('')
  const [localGoal, setLocalGoal] = useState('')
  const [localHeight, setLocalHeight] = useState('') // BOY İÇİN YENİ STATE
  const [saveStatus, setSaveStatus] = useState(false)

  async function fetchMembers() {
    const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false })
    setMembers(data || [])
  }

  useEffect(() => { fetchMembers() }, [])

  async function showProfile(member: any) {
    setSelectedMember(member)
    setLocalNotes(member.notes || '')
    setLocalGoal(member.goal_weight?.toString() || '')
    setLocalHeight(member.height?.toString() || '') // Boyu yükle
    const { data } = await supabase.from('weight_logs').select('*').eq('member_id', member.id).order('recorded_at', { ascending: true })
    setWeightLogs(data || [])
  }

  // VKİ HESAPLAMA MANTIĞI
  const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : 0
  const heightInMeters = parseFloat(localHeight) || 0
  const bmi = (currentWeight > 0 && heightInMeters > 0) 
    ? (currentWeight / (heightInMeters * heightInMeters)).toFixed(1) 
    : '--'

  // VKİ DURUM RENGİ VE METNİ
  const getBmiStatus = (val: string) => {
    const n = parseFloat(val)
    if (isNaN(n)) return { label: 'Boy/Kilo Eksik', color: 'text-gray-500' }
    if (n < 18.5) return { label: 'Zayıf', color: 'text-blue-400' }
    if (n < 25) return { label: 'İdeal', color: 'text-green-400' }
    if (n < 30) return { label: 'Fazla Kilolu', color: 'text-yellow-500' }
    return { label: 'Obezite', color: 'text-red-500' }
  }

  async function saveField(field: string, value: any) {
    if (!selectedMember) return
    await supabase.from('members').update({ [field]: value }).eq('id', selectedMember.id)
    setSaveStatus(true)
    setTimeout(() => setSaveStatus(false), 2000)
    fetchMembers()
  }

  // Seans, Ödeme ve Silme fonksiyonları aynı kalıyor...
  async function updateSession(e: any, memberId: any, newCount: number) { e.stopPropagation(); if (newCount < 0) return; await supabase.from('members').update({ remaining_sessions: newCount }).eq('id', memberId); fetchMembers(); }
  async function togglePayment(e: any, memberId: any, currentStatus: string) { e.stopPropagation(); const newStatus = currentStatus === 'Ödendi' ? 'Borçlu' : 'Ödendi'; await supabase.from('members').update({ payment_status: newStatus }).eq('id', memberId); fetchMembers(); }
  async function deleteMember(e: any, memberId: any) { e.stopPropagation(); if (window.confirm(`${memberId} silinsin mi?`)) { await supabase.from('members').delete().eq('id', memberId); fetchMembers(); } }
  async function addWeight(e: React.FormEvent) { e.preventDefault(); if (!newWeight || !selectedMember) return; await supabase.from('weight_logs').insert([{ member_id: selectedMember.id, weight: parseFloat(newWeight) }]); setNewWeight(''); showProfile(selectedMember); }

  return (
    <main className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center border-b border-white/5 pb-8">
          <h1 className="text-6xl font-black text-green-400 italic tracking-tighter uppercase">ONE TO ONE</h1>
          <p className="text-gray-600 text-[10px] tracking-[0.6em] font-bold uppercase mt-3 italic">Personal Training Panel</p>
        </header>

        {/* ÜYE EKLEME */}
        <section className="mb-12 bg-white/5 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/10">
          <form onSubmit={(e) => { e.preventDefault(); if (fullName) { supabase.from('members').insert([{ id: fullName, membership_type: type, remaining_sessions: 12, payment_status: 'Ödendi' }]).then(() => { setFullName(''); fetchMembers(); }) } }} className="flex flex-col md:flex-row gap-4">
            <input type="text" placeholder="Yeni Üye Adı" value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-green-500/50" />
            <select value={type} onChange={(e) => setType(e.target.value)} className="bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-bold text-sm outline-none">
              <option value="Birebir">Birebir Seans</option>
              <option value="Grup">Grup Dersi</option>
            </select>
            <button type="submit" className="bg-green-500 text-black font-black px-10 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all uppercase text-sm">Ekle</button>
          </form>
        </section>

        {/* LİSTE */}
        <div className="grid gap-5">
          {members.map((member) => (
            <div key={member.id} onClick={() => showProfile(member)} className={`group relative bg-white/5 backdrop-blur-sm p-6 rounded-[2rem] border transition-all duration-300 flex justify-between items-center cursor-pointer shadow-lg ${member.remaining_sessions <= 2 ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/5 hover:border-green-500/30'}`}>
              <div className="flex items-center gap-6">
                <button onClick={(e) => deleteMember(e, member.id)} className="text-xl opacity-10 group-hover:opacity-100 hover:text-red-500 transition-all">🗑️</button>
                <div>
                  <h3 className="font-bold uppercase text-xl mb-1">{member.id}</h3>
                  <button onClick={(e) => togglePayment(e, member.id, member.payment_status)} className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${member.payment_status === 'Ödendi' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500 animate-pulse'}`}>
                    {member.payment_status}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <span className={`text-5xl font-black leading-none ${member.remaining_sessions <= 2 ? 'text-orange-500' : 'text-green-400'}`}>{member.remaining_sessions}</span>
                  <p className="text-[9px] text-gray-500 font-bold uppercase mt-2">Seans</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={(e) => updateSession(e, member.id, member.remaining_sessions + 1)} className="w-10 h-10 border border-white/10 text-white rounded-xl font-black hover:bg-green-500 hover:text-black transition-all">+</button>
                  <button onClick={(e) => updateSession(e, member.id, member.remaining_sessions - 1)} className="w-10 h-10 border border-white/10 text-white rounded-xl font-black hover:bg-red-500 hover:text-white transition-all">-</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PROFİL MODAL */}
        {selectedMember && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-2xl">
            <div className="bg-[#0f0f0f] border border-white/10 p-10 rounded-[3rem] max-w-2xl w-full relative overflow-y-auto max-h-[95vh] shadow-2xl">
              <button onClick={() => setSelectedMember(null)} className="absolute top-10 right-10 text-gray-500 text-2xl hover:text-white transition-colors">✕</button>
              
              <div className="mb-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-6 border-b border-white/5 pb-8 text-center md:text-left">
                <div className="flex flex-col gap-2">
                  <h2 className="text-4xl font-black text-green-400 uppercase tracking-tighter leading-none">{selectedMember.id}</h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
                    <div className="flex flex-col">
                      <input type="text" value={localGoal} placeholder="0" onChange={(e) => setLocalGoal(e.target.value)} onBlur={() => saveField('goal_weight', parseFloat(localGoal) || 0)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-yellow-500 w-20 outline-none font-bold" />
                      <span className="text-[8px] text-gray-600 uppercase font-black mt-1">Hedef Kilo</span>
                    </div>
                    <div className="flex flex-col border-l border-white/10 pl-4">
                      <input type="text" value={localHeight} placeholder="1.85" onChange={(e) => setLocalHeight(e.target.value)} onBlur={() => saveField('height', parseFloat(localHeight) || 0)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-blue-400 w-24 outline-none font-bold" />
                      <span className="text-[8px] text-gray-600 uppercase font-black mt-1">Boy (Metre)</span>
                    </div>
                  </div>
                </div>

                {/* VKİ GÖSTERGESİ */}
                <div className="bg-white/5 p-4 rounded-3xl border border-white/10 min-w-[120px] text-center">
                   <p className="text-[8px] text-gray-600 uppercase font-black mb-1">Vücut Kitle İndeksi</p>
                   <p className="text-3xl font-black leading-none">{bmi}</p>
                   <p className={`text-[9px] font-black uppercase mt-2 ${getBmiStatus(bmi).color}`}>{getBmiStatus(bmi).label}</p>
                </div>

                <div className={`transition-all duration-500 ${saveStatus ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-green-500 text-[10px] font-black uppercase">✓ Kaydedildi</span>
                </div>
              </div>

              {/* GRAFİK */}
              <div className="h-64 w-full mb-10 bg-black/40 p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightLogs.map(log => ({ zamanId: new Date(log.recorded_at).getTime(), tarihLabel: new Date(log.recorded_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }), kilo: log.weight }))}>
                    <CartesianGrid strokeDasharray="6 6" stroke="#1a1a1a" vertical={false} />
                    <XAxis dataKey="zamanId" hide />
                    <YAxis stroke="#404040" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 3', 'dataMax + 3']} />
                    <Tooltip labelFormatter={(v) => { const item = weightLogs.find(d => new Date(d.recorded_at).getTime() === v); return item ? new Date(item.recorded_at).toLocaleDateString('tr-TR') : '' }} contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: 'none' }} />
                    {selectedMember.goal_weight && <ReferenceLine y={selectedMember.goal_weight} stroke="#eab308" strokeDasharray="5 5" label={{ position: 'right', value: 'Hedef', fill: '#eab308', fontSize: 10 }} />}
                    <Line type="monotone" dataKey="kilo" stroke="#22c55e" strokeWidth={5} dot={{ fill: '#22c55e', r: 5 }} activeDot={{ r: 8 }} animationDuration={1000} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* KİLO KAYDI */}
                <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase mb-4 tracking-[0.2em] text-center md:text-left">Yeni Ölçüm Girişi</p>
                  <form onSubmit={addWeight} className="flex flex-col gap-3 bg-black/40 p-4 rounded-[1.5rem] border border-white/10 focus-within:border-green-500/50 transition-all shadow-inner">
                    <input type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} className="bg-transparent px-2 py-2 text-sm outline-none font-bold placeholder-gray-600 border-b border-white/5" placeholder="Kilo Gir (Örn: 85.5)" />
                    <button type="submit" className="bg-green-500 text-black font-black py-3 rounded-xl text-[10px] uppercase active:scale-95 transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)]">Ölçümü Ekle</button>
                  </form>
                </div>

                <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase mb-4 tracking-[0.2em] text-center md:text-left">Hoca Notları</p>
                  <textarea placeholder="Program detayları..." value={localNotes} onChange={(e) => setLocalNotes(e.target.value)} onBlur={() => saveField('notes', localNotes)} className="w-full h-32 bg-black/40 border border-white/10 rounded-[1.5rem] p-5 text-sm outline-none focus:border-green-500/50 resize-none transition-all shadow-inner leading-relaxed"></textarea>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}