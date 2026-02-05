'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import dynamic from 'next/dynamic'

// Grafiği Next.js 16 ve Turbopack ile tam uyumlu hale getirmek için dinamik yüklüyoruz
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })

export default function Home() {
  const [members, setMembers] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<any | null>(null)
  const [fullName, setFullName] = useState('')
  const [type, setType] = useState('Birebir')
  const [newWeight, setNewWeight] = useState('')
  const [weightLogs, setWeightLogs] = useState<any[]>([])

  async function fetchMembers() {
    const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false })
    setMembers(data || [])
  }

  useEffect(() => { fetchMembers() }, [])

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName) return
    const { error } = await supabase.from('members').insert([
      { id: fullName, membership_type: type, remaining_sessions: 12, payment_status: 'Ödendi' }
    ])
    if (!error) { setFullName(''); fetchMembers(); }
  }

  async function showProfile(member: any) {
    setSelectedMember(member)
    const { data } = await supabase.from('weight_logs').select('*').eq('member_id', member.id).order('recorded_at', { ascending: true })
    setWeightLogs(data || [])
  }

  // AYNI GÜN SORUNUNU ÇÖZEN VERİ FORMATI
  const chartData = weightLogs.map(log => ({
    // XAxis'te benzersiz olması için tam zaman damgası kullanıyoruz
    zamanId: new Date(log.recorded_at).getTime(),
    // Tooltip'te görünecek şık tarih ve saat
    tarihLabel: new Date(log.recorded_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
    saatLabel: new Date(log.recorded_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    kilo: log.weight
  }))

  async function addWeight(e: React.FormEvent) {
    e.preventDefault()
    if (!newWeight || !selectedMember) return
    const { error } = await supabase.from('weight_logs').insert([{ member_id: selectedMember.id, weight: parseFloat(newWeight) }])
    if (!error) { setNewWeight(''); showProfile(selectedMember); }
  }

  async function updateSession(e: any, memberId: any, newCount: number) { e.stopPropagation(); if (newCount < 0) return; await supabase.from('members').update({ remaining_sessions: newCount }).eq('id', memberId); fetchMembers(); }
  async function togglePayment(e: any, memberId: any, currentStatus: string) { e.stopPropagation(); const newStatus = currentStatus === 'Ödendi' ? 'Borçlu' : 'Ödendi'; await supabase.from('members').update({ payment_status: newStatus }).eq('id', memberId); fetchMembers(); }
  async function deleteMember(e: any, memberId: any) { e.stopPropagation(); if (window.confirm(`${memberId} silinsin mi?`)) { await supabase.from('members').delete().eq('id', memberId); fetchMembers(); } }

  return (
    <main className="min-h-screen bg-black text-white p-6 font-sans selection:bg-green-500/30">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center border-b border-gray-800 pb-8">
          <h1 className="text-5xl font-black text-green-400 italic tracking-tighter drop-shadow-sm">ONE TO ONE</h1>
          <p className="text-gray-600 text-[10px] tracking-[0.5em] font-bold uppercase mt-2">Personal Training Panel</p>
        </header>

        {/* ÜYE EKLEME */}
        <section className="mb-12 bg-gray-900/50 p-6 rounded-[2rem] border border-gray-800 backdrop-blur-sm shadow-xl">
          <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-3">
            <input type="text" placeholder="Üye Adı Soyadı" value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1 bg-black border border-gray-700 rounded-2xl px-5 py-4 outline-none focus:border-green-500 transition-all text-sm" />
            <select value={type} onChange={(e) => setType(e.target.value)} className="bg-black border border-gray-700 rounded-2xl px-5 py-4 text-sm font-bold">
              <option value="Birebir">Birebir Seans</option>
              <option value="Grup">Grup Dersi</option>
            </select>
            <button type="submit" className="bg-green-500 text-black font-black px-10 py-4 rounded-2xl hover:bg-green-400 transition-all uppercase text-sm active:scale-95">Ekle</button>
          </form>
        </section>

        {/* ANA LİSTE */}
        <div className="grid gap-4">
          {members.map((member) => (
            <div key={member.id} onClick={() => showProfile(member)} className="group bg-gray-900/40 p-6 rounded-[2rem] border border-gray-800 flex justify-between items-center cursor-pointer hover:border-green-500/40 transition-all hover:bg-gray-900/60 shadow-md">
              <div className="flex items-center gap-5">
                <button onClick={(e) => deleteMember(e, member.id)} className="text-xl opacity-10 group-hover:opacity-100 hover:text-red-500 transition-all">🗑️</button>
                <div>
                  <h3 className="font-bold uppercase text-lg leading-none mb-2">{member.id}</h3>
                  <button onClick={(e) => togglePayment(e, member.id, member.payment_status)} className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${member.payment_status === 'Ödendi' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500 animate-pulse'}`}>
                    {member.payment_status}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <span className="text-4xl font-black text-green-400 leading-none">{member.remaining_sessions}</span>
                  <p className="text-[9px] text-gray-600 font-black uppercase mt-1">Seans Kaldı</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={(e) => updateSession(e, member.id, member.remaining_sessions + 1)} className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl font-black hover:bg-green-500 hover:text-black transition-all">+</button>
                  <button onClick={(e) => updateSession(e, member.id, member.remaining_sessions - 1)} className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl font-black hover:bg-red-500 hover:text-black transition-all">-</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PROFİL MODAL VE GELİŞMİŞ GRAFİK */}
        {selectedMember && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-800 p-10 rounded-[3rem] max-w-2xl w-full relative shadow-[0_0_80px_rgba(34,197,94,0.15)]">
              <button onClick={() => setSelectedMember(null)} className="absolute top-10 right-10 text-gray-500 text-2xl hover:text-white transition-colors">✕</button>
              
              <div className="mb-10">
                <h2 className="text-3xl font-black text-green-400 mb-1 uppercase tracking-tighter">{selectedMember.id}</h2>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.4em]">Performans ve Kilo Takibi</p>
              </div>

              {/* GRAFİK */}
              <div className="h-72 w-full mb-10 bg-black/40 p-6 rounded-[2rem] border border-gray-800/50 relative overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="zamanId" hide />
                    <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 3', 'dataMax + 3']} />
                    <Tooltip 
                      labelFormatter={(value) => {
                        const item = chartData.find(d => d.zamanId === value);
                        return item ? `${item.tarihLabel} - ${item.saatLabel}` : '';
                      }}
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #374151', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }} 
                      itemStyle={{ color: '#22c55e' }}
                    />
                    <Line type="monotone" dataKey="kilo" stroke="#22c55e" strokeWidth={5} dot={{ fill: '#22c55e', r: 5, strokeWidth: 0 }} activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }} animationDuration={1500} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* KİLO KAYDI */}
              <form onSubmit={addWeight} className="flex gap-3 mb-10 bg-black p-3 rounded-[1.5rem] border border-gray-800 focus-within:border-green-500 transition-all shadow-inner">
                <input type="number" step="0.1" placeholder="Yeni Kilo (Örn: 85.5)" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} className="flex-1 bg-transparent px-5 py-2 outline-none text-lg font-bold" />
                <button type="submit" className="bg-green-500 text-black font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-transform">Kaydet</button>
              </form>

              {/* SON ÖLÇÜMLER */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {weightLogs.slice().reverse().map((log) => (
                  <div key={log.id} className="bg-black/30 p-4 rounded-2xl border border-gray-800/50 flex flex-col items-center">
                    <span className="text-[9px] text-gray-600 font-black uppercase mb-1">{new Date(log.recorded_at).toLocaleDateString('tr-TR')}</span>
                    <span className="font-black text-white text-lg">{log.weight} <span className="text-xs text-gray-600">kg</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}