'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase' 
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Clock, Dumbbell, Activity, Apple, CheckCircle2, Award, Instagram, MessageCircle } from 'lucide-react'

const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ReferenceLine = dynamic(() => import('recharts').then(mod => mod.ReferenceLine), { ssr: false })

export default function MemberView() {
  const params = useParams()
  const [member, setMember] = useState<any>(null)
  const [weightLogs, setWeightLogs] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [dietPlan, setDietPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: mData } = await supabase.from('members').select('*').eq('slug', params.slug).single()
      if (mData) {
        setMember(mData)
        const { data: wData } = await supabase.from('weight_logs').select('*').eq('member_id', mData.id).order('recorded_at', { ascending: true })
        setWeightLogs(wData || [])
        const { data: aData } = await supabase.from('appointments').select('*').eq('member_id', mData.id).order('training_date', { ascending: false })
        setAppointments(aData || [])
        const { data: dData } = await supabase.from('diet_plans').select('*').eq('member_id', mData.id).maybeSingle();
        setDietPlan(dData)
      }
      setLoading(false)
    }
    loadData()
  }, [params.slug])

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-green-500 font-black italic animate-pulse tracking-widest uppercase text-center">Yükleniyor...</div>
  if (!member) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-black italic">ÜYE BULUNAMADI</div>

  const firstW = weightLogs.length > 0 ? weightLogs[0].weight : 0
  const lastW = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : 0
  const targetW = member.goal_weight || 0
  const progress = (targetW && firstW !== targetW) ? Math.abs(((firstW - lastW) / (firstW - targetW)) * 100) : 0
  const bmi = (lastW > 0 && member.height > 0) ? (lastW / (member.height * member.height)).toFixed(1) : '--'

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans selection:bg-green-500/30">
      <div className="max-w-4xl mx-auto space-y-12 text-left">
        
        {/* HEADER & INSTAGRAM */}
        <header className="text-center space-y-6">
          <div className="flex justify-center gap-4">
            <a href="https://instagram.com/onetoone.training" target="_blank" rel="noopener noreferrer" className="bg-white/5 p-3 rounded-full hover:bg-green-500/10 transition-all border border-white/5">
                <Instagram className="text-pink-500" size={24}/>
            </a>
          </div>
          <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none drop-shadow-[0_0_30px_rgba(34,197,94,0.1)]">{member.id}</h1>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.5em] italic">Athlete Performance Portal</p>
        </header>

        {/* HEDEF ÇUBUĞU */}
        {targetW > 0 && (
          <section className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl text-left">
            <div className="flex justify-between items-end mb-4"><span className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic flex items-center gap-2"><Award className="text-yellow-500" size={16}/> Hedefe İlerleme</span><span className="text-4xl font-black text-green-400">%{Math.min(100, progress).toFixed(0)}</span></div>
            <div className="w-full h-4 bg-black/50 rounded-full border border-white/5 overflow-hidden"><div className="h-full bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all duration-1000" style={{ width: `${Math.min(100, progress)}%` }}></div></div>
            <div className="flex justify-between mt-4 text-[9px] font-black uppercase tracking-widest text-gray-600 italic text-left"><span>BAŞLANGIÇ: {firstW} KG</span><span>HEDEF: {targetW} KG</span></div>
          </section>
        )}

        {/* ÖZET KARTLAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 text-center shadow-xl"><span className="text-5xl font-black text-green-400">{member.remaining_sessions}</span><p className="text-[10px] text-gray-500 font-black uppercase mt-3 italic">Kalan Seans</p></div>
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 text-center shadow-xl"><span className="text-5xl font-black text-blue-400">{bmi}</span><p className="text-[10px] text-gray-500 font-black uppercase mt-3 italic">Güncel VKİ</p></div>
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 text-center shadow-xl"><span className="text-5xl font-black text-yellow-500">{member.goal_weight || '--'}</span><p className="text-[10px] text-gray-500 font-black uppercase mt-3 italic text-center">Hedef</p></div>
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 text-center shadow-xl"><span className="text-5xl font-black text-purple-400">{member.height || '--'}</span><p className="text-[10px] text-gray-500 font-black uppercase mt-3 italic text-center">Boy (m)</p></div>
        </div>

        {/* BESLENME PROGRAMI */}
        <section className="bg-white/5 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl space-y-10 text-left">
            <h3 className="text-2xl font-black uppercase italic flex items-center gap-3 tracking-tight text-left"><Apple className="text-green-500" size={28}/> Beslenme Programın</h3>
            <div className="grid md:grid-cols-2 gap-8 text-left">
                <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 text-left shadow-inner"><span className="text-green-500 text-[10px] font-black uppercase tracking-[0.3em] italic">🌅 Kahvaltı</span><p className="text-sm text-gray-300 mt-4 leading-relaxed italic text-left">{dietPlan?.breakfast || 'Liste hazırlanıyor...'}</p></div>
                <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 text-left shadow-inner"><span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] italic">☀️ Öğle</span><p className="text-sm text-gray-300 mt-4 leading-relaxed italic text-left">{dietPlan?.lunch || 'Liste hazırlanıyor...'}</p></div>
                <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 text-left shadow-inner"><span className="text-orange-400 text-[10px] font-black uppercase tracking-[0.3em] italic">🌙 Akşam</span><p className="text-sm text-gray-300 mt-4 leading-relaxed italic text-left">{dietPlan?.dinner || 'Liste hazırlanıyor...'}</p></div>
                <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 text-left shadow-inner"><span className="text-purple-400 text-[10px] font-black uppercase tracking-[0.3em] italic">🥜 Snack</span><p className="text-sm text-gray-300 mt-4 leading-relaxed italic text-left">{dietPlan?.snacks || 'Liste hazırlanıyor...'}</p></div>
            </div>
        </section>

        {/* GRAFİK */}
        <section className="bg-white/5 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl text-left">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500 mb-8 flex items-center gap-2 text-left px-2"><Activity className="text-green-500" size={18}/> Kilo Değişim Analizi</h3>
          <div className="h-72 w-full text-left">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightLogs.map(l => ({ z: new Date(l.recorded_at).getTime(), t: format(new Date(l.recorded_at), 'd MMM', { locale: tr }), k: l.weight }))}>
                <XAxis dataKey="z" hide /> 
                <Tooltip labelFormatter={(val) => format(new Date(val), 'd MMMM yyyy', { locale: tr })} contentStyle={{ backgroundColor: '#000', borderRadius: '20px', border: '1px solid #22c55e', fontSize: '12px' }} />
                {member.goal_weight && <ReferenceLine y={member.goal_weight} stroke="#eab308" strokeDasharray="5 5" />}
                <Line type="monotone" dataKey="k" name="Kilo" stroke="#22c55e" strokeWidth={6} dot={{ fill: '#22c55e', r: 6 }} animationDuration={1000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* WHATSAPP FLOATING BUTTON */}
        <a 
          href={`https://wa.me/905015700270?text=${encodeURIComponent('Merhaba hocam, gelişim panelim üzerinden size ulaşıyorum...')}`}
          target="_blank" rel="noopener noreferrer"
          className="fixed bottom-8 right-8 bg-[#25D366] text-white p-5 rounded-full shadow-[0_0_30px_rgba(37,211,102,0.4)] hover:scale-110 transition-all z-[100] group flex items-center gap-3"
        >
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">Hocaya Soru Sor</span>
          <MessageCircle size={28} fill="currentColor" />
        </a>

        <footer className="text-center py-10 opacity-20 text-[9px] font-black uppercase tracking-[0.6em] italic text-center">ONE TO ONE • Professional Athlete Hub</footer>
      </div>
    </main>
  )
}