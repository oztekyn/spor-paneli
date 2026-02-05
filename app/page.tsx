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
  
  // Yerel form takibi (Yazarken takılmayı engeller)
  const [localNotes, setLocalNotes] = useState('')
  const [localGoal, setLocalGoal] = useState('')

  async function fetchMembers() {
    const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false })
    setMembers(data || [])
  }

  useEffect(() => { fetchMembers() }, [])

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName) return
    const { error } = await supabase.from('members').insert([{ id: fullName, membership_type: type, remaining_sessions: 12, payment_status: 'Ödendi' }])
    if (!error) { setFullName(''); fetchMembers(); }
  }

  async function showProfile(member: any) {
    setSelectedMember(member)
    setLocalNotes(member.notes || '')
    setLocalGoal(member.goal_weight?.toString() || '')
    const { data } = await supabase.from('weight_logs').select('*').eq('member_id', member.id).order('recorded_at', { ascending: true })
    setWeightLogs(data || [])
  }

  const chartData = weightLogs.map(log => ({
    zamanId: new Date(log.recorded_at).getTime(),
    tarihLabel: new Date(log.recorded_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
    saatLabel: new Date(log.recorded_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    kilo: log.weight
  }))

  // Sadece Odak Kaybolduğunda (Blur) veya Kaydet Denince Güncelle
  async function saveField(field: string, value: any) {
    if (!selectedMember) return
    await supabase.from('members').update({ [field]: value }).eq('id', selectedMember.id)
    fetchMembers()
  }

  async function addWeight(e: React.FormEvent) {
    e.preventDefault()
    if (!newWeight || !selectedMember) return
    await supabase.from('weight_logs').insert([{ member_id: selectedMember.id, weight: parseFloat(newWeight) }])
    setNewWeight(''); showProfile(selectedMember);
  }

  async function updateSession(e: any, memberId: any, newCount: number) { 
    e.stopPropagation(); 
    if (newCount < 0) return; 
    await supabase.from('members').update({ remaining_sessions: newCount }).eq('id', memberId); 
    fetchMembers(); 
  }

  async function togglePayment(e: any, memberId: any, currentStatus: string) { 
    e.stopPropagation(); 
    const newStatus = currentStatus === 'Ödendi' ? 'Borçlu' : 'Ödendi'; 
    await supabase.from('members').update({ payment_status: newStatus }).eq('id', memberId); 
    fetchMembers(); 
  }

  async function deleteMember(e: any, memberId: any) {
    e.stopPropagation();
    if (window.confirm(`${memberId} silinsin mi?`)) {
      await supabase.from('members').delete().eq('id', memberId);
      fetchMembers();
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center border-b border-gray-800 pb-8">
          <h1 className="text-5xl font-black text-green-400 italic tracking-tighter">ONE TO ONE</h1>
          <p className="text-gray-600 text-[10px] tracking-[0.5em] font-bold uppercase mt-2">Personal Training Panel</p>
        </header>

        {/* ÜYE EKLEME FORMU - GERİ GELDİ */}
        <section className="mb-12 bg-gray-900 p-6 rounded-3xl border border-gray-800">
          <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-3">
            <input type="text" placeholder="Üye Adı Soyadı" value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1 bg-black border border-gray-700 rounded-2xl px-5 py-3 outline-none focus:border-green-500" />
            <select value={type} onChange={(e) => setType(e.target.value)} className="bg-black border border-gray-700 rounded-2xl px-5 py-3 font-bold">
              <option value="Birebir">Birebir</option>
              <option value="Grup">Grup</option>
            </select>
            <button type="submit" className="bg-green-500 text-black font-black px-8 py-3 rounded-2xl hover:bg-green-400 transition uppercase">Ekle</button>
          </form>
        </section>

        {/* ANA LİSTE */}
        <div className="grid gap-4">
          {members.map((member) => (
            <div key={member.id} onClick={() => showProfile(member)} className="group bg-gray-900/40 p-6 rounded-[2rem] border border-gray-800 flex justify-between items-center cursor-pointer hover:border-green-500/40 transition-all shadow-md">
              <div className="flex items-center gap-5">
                <button onClick={(e) => deleteMember(e, member.id)} className="text-xl opacity-20 group-hover:opacity-100 hover:text-red-500 transition-all">🗑️</button>
                <div>
                  <h3 className="font-bold uppercase text-lg mb-1">{member.id}</h3>
                  <button onClick={(e) => togglePayment(e, member.id, member.payment_status)} className={`text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-wider ${member.payment_status === 'Ödendi' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500 animate-pulse'}`}>
                    {member.payment_status}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-3xl font-black text-green-400 leading-none">{member.remaining_sessions}</span>
                  <p className="text-[9px] text-gray-600 font-bold uppercase">Seans</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={(e) => updateSession(e, member.id, member.remaining_sessions + 1)} className="w-8 h-8 bg-green-500/10 text-green-500 rounded-lg">+</button>
                  <button onClick={(e) => updateSession(e, member.id, member.remaining_sessions - 1)} className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg">-</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PROFİL MODAL */}
        {selectedMember && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-[3rem] max-w-2xl w-full relative overflow-y-auto max-h-[90vh]">
              <button onClick={() => setSelectedMember(null)} className="absolute top-8 right-8 text-gray-500 text-2xl hover:text-white">✕</button>
              
              <div className="mb-6">
                <h2 className="text-3xl font-black text-green-400 uppercase tracking-tighter leading-none">{selectedMember.id}</h2>
                <div className="flex gap-4 mt-4">
                  <div className="flex flex-col">
                    <input 
                      type="text" 
                      placeholder="0" 
                      value={localGoal} 
                      onChange={(e) => setLocalGoal(e.target.value)}
                      onBlur={() => saveField('goal_weight', parseFloat(localGoal) || 0)}
                      className="bg-black border border-gray-800 rounded-xl px-3 py-1 text-sm text-yellow-500 w-24 outline-none focus:border-yellow-500 font-bold"
                    />
                    <span className="text-[8px] text-gray-600 uppercase font-black mt-1">Hedef Kilo</span>
                  </div>
                </div>
              </div>

              {/* GRAFİK */}
              <div className="h-64 w-full mb-8 bg-black/40 p-4 rounded-[2rem] border border-gray-800/50">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="zamanId" hide />
                    <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 3', 'dataMax + 3']} />
                    <Tooltip labelFormatter={(v) => chartData.find(d => d.zamanId === v)?.tarihLabel} contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px' }} />
                    {selectedMember.goal_weight && <ReferenceLine y={selectedMember.goal_weight} stroke="#eab308" strokeDasharray="3 3" />}
                    <Line type="monotone" dataKey="kilo" stroke="#22c55e" strokeWidth={4} dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase mb-3 tracking-widest">Yeni Ölçüm Girişi</p>
                  <form onSubmit={addWeight} className="flex gap-2 mb-4 bg-black p-2 rounded-2xl border border-gray-800">
                    <input type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} className="flex-1 bg-transparent px-3 py-1 text-sm outline-none" placeholder="Kilo" />
                    <button type="submit" className="bg-green-500 text-black font-black px-4 py-2 rounded-xl text-[10px] uppercase">Ekle</button>
                  </form>
                </div>

                <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase mb-3 tracking-widest">Hoca Notları (Yazınca dışarı tıkla)</p>
                  <textarea 
                    placeholder="Program detayları..."
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    onBlur={() => saveField('notes', localNotes)}
                    className="w-full h-24 bg-black border border-gray-800 rounded-xl p-3 text-xs outline-none focus:border-green-500 resize-none transition-all"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}