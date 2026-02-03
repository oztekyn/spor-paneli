'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [type, setType] = useState('Birebir')

  async function fetchMembers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Veri çekme hatası:', error.message)
    } else {
      setMembers(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName) return

    // Burada 'full_name' yerine senin yeni sütun adın olan 'id'yi kullanıyoruz
    const { error } = await supabase.from('members').insert([
      { 
        id: fullName, // İsmi artık 'id' sütununa yazıyoruz
        membership_type: type, 
        remaining_sessions: 12, 
        payment_status: 'Ödendi' 
      }
    ])

    if (!error) {
      setFullName('')
      fetchMembers()
    } else {
      alert("Hata: Bu isimde bir üye zaten var veya bir sorun oluştu!")
    }
  }

  async function updateSession(memberId: any, newCount: number) {
    if (newCount < 0) return

    const { error } = await supabase
      .from('members')
      .update({ remaining_sessions: newCount })
      .eq('id', memberId) 

    if (!error) {
      fetchMembers()
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 border-b border-gray-800 pb-6">
          <h1 className="text-2xl font-bold text-green-400">One to One Personal Training</h1>
          <p className="text-xs text-gray-500 italic">Ankara / Susuz Paneli</p>
        </header>

        <section className="mb-12 bg-gray-900 p-6 rounded-2xl border border-gray-800">
          <form onSubmit={addMember} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Üye Adı Soyadı"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-3 text-white"
            />
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="bg-black border border-gray-700 rounded-xl px-4 py-3"
            >
              <option value="Birebir">Birebir</option>
              <option value="Grup">Grup</option>
            </select>
            <button type="submit" className="bg-green-500 text-black font-bold px-8 py-3 rounded-xl">
              KAYDET
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-6 text-gray-400">Aktif Üyeler ({members.length})</h2>
          <div className="grid gap-4">
            {members.map((member) => (
              <div key={member.id} className="bg-gray-900 p-5 rounded-2xl border border-gray-800 flex justify-between items-center">
                <div>
                  {/* BURASI DEĞİŞTİ: Artık ismi 'id' sütunundan çekiyoruz */}
                  <h3 className="text-lg font-bold uppercase">{member.id}</h3> 
                  <p className="text-xs text-gray-500 uppercase">{member.membership_type}</p>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-green-400 font-mono text-3xl font-black">{member.remaining_sessions}</span>
                    <p className="text-[9px] text-gray-600 font-bold uppercase">Seans</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateSession(member.id, member.remaining_sessions - 1)}
                      className="w-10 h-10 rounded-xl border border-red-500 text-red-500 font-bold"
                    >
                      -
                    </button>
                    <button 
                      onClick={() => updateSession(member.id, member.remaining_sessions + 1)}
                      className="w-10 h-10 rounded-xl border border-green-500 text-green-500 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}