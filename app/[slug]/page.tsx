'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase' 
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Clock, Dumbbell, Activity, Apple, CheckCircle2, Award, Instagram, MessageCircle, Ruler, LogOut } from 'lucide-react'

// Grafikler - Client-side Only
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ReferenceLine = dynamic(() => import('recharts').then(mod => mod.ReferenceLine), { ssr: false })

export default function MemberView() {
  const params = useParams()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [member, setMember] = useState<any>(null)
  const [weightLogs, setWeightLogs] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [dietPlan, setDietPlan] = useState<any>(null)
  const [measurements, setMeasurements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 1. GÜVENLİK KONTROLÜ
  useEffect(() => {
    const role = localStorage.getItem('user_role')
    const userSlug = localStorage.getItem('user_slug')

    // Kural: Admin değilse VE kendi slug'ı dışında bir yere girmeye çalışıyorsa ana sayfaya şutla
    if (!role || (role !== 'admin' && userSlug !== params.slug)) {
      router.push('/')
    } else {
      setIsAuthorized(true)
    }
  }, [params.slug, router])

  // 2. VERİ ÇEKME
  useEffect(() => {
    if (!isAuthorized) return

    async function loadData() {
      const { data: mData } = await supabase.from('members').select('*').eq('slug', params.slug).single()
      if (mData) {
        setMember(mData)
        const { data: wData } = await supabase.from('weight_logs').select('*').eq('member_id', mData.id).order('recorded_at', { ascending: true })
        setWeightLogs(wData || [])
        const { data: aData } = await supabase.from('appointments').select('*').eq('member_id', mData.id).order('training_date', { ascending: false })
        setAppointments(aData || [])
        const { data: dData } = await supabase.from('diet_plans').select('*').eq('member_id', mData.id).maybeSingle()
        setDietPlan(dData)
        const { data: msData } = await supabase.from('body_measurements').select('*').eq('member_id', mData.id).order('recorded_at', { ascending: false })
        setMeasurements(msData || [])
      }
      setLoading(false)
    }
    loadData()
  }, [params.slug, isAuthorized])

  const handleLogout = () => {
    localStorage.clear()
    router.push('/')
  }

  if (!isAuthorized || loading) return <div className="min-h-screen bg-black flex items-center justify-center text-green-500 font-black italic animate-pulse tracking-widest uppercase">Giriş Yapılıyor...</div>
  if (!member) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-black italic">ÜYE KAYDI BULUNAMADI</div>

  const firstW = weightLogs.length > 0 ? weightLogs[0].weight : 0
  const lastW = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : 0
  const targetW = member.goal_weight || 0
  const progress = (targetW && firstW !== targetW) ? Math.abs(((firstW - lastW) / (firstW - targetW)) * 100) : 0
  const bmi = (lastW > 0 && member.height > 0) ? (lastW / (member.height ** 2)).toFixed(1) : '--'

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans selection:bg-green-500/30 overflow-x-hidden text-left">
      <div className="max-w-4xl mx-auto space-y-12 text-left">
        
        {/* ÜST BİLGİ VE ÇIKIŞ */}
        <div className="flex justify-between items-start">
            <a href="https://instagram.com/onetoone.training" target="_blank" rel="noopener noreferrer" className="bg-white/5 p-4 rounded-full hover:bg-pink-500/10 transition-all border border-white/5 shadow-2xl">
                <Instagram className="text-pink-500" size={24}/>
            </a>
            <button onClick={handleLogout} className="bg-white/5 p-4 rounded-full hover:bg-red-500/10 transition-all border border-white/5 group">
                <LogOut className="text-gray-500 group-hover:text-red-500" size={24}/>
            </button>
        </div>

        <header className="text-center space-y-4">
          <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none drop-shadow-[0_0_30px_rgba(34,197,94,0.15)]">{member.id}</h1>
          <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.5em] italic">Athlete Performance Portal</p>
        </header>

        {/* HEDEF İLERLEME */}
        {targetW > 0 && (
          <section className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl text-left">
            <div className="flex justify-between items-end mb-4"><span className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic flex items-center gap-2"><Award className="text-yellow-500" size={16}/> Hedefe Yolculuk</span><span className="text-4xl font-black text-green-400">%{Math.min(100, progress).toFixed(0)}</span></div>
            <div className="w-full h-4 bg-black/50 rounded-full border border-white/5 overflow-hidden shadow-inner"><div className="h-full bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all duration-1000" style={{ width: `${Math.min(100, progress)}%` }}></div></div>
            <div className="flex justify-between mt-4 text-[9px] font-black uppercase tracking-widest text-gray-600 italic"><span>BAŞLANGIÇ: {firstW} KG</span><span>HEDEF: {targetW} KG</span></div>
          </section>
        )}

        {/* ÖLÇÜLER */}
        {measurements.length > 0 && (
          <section className="bg-white/5 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl text-left">
            <h3 className="text-xl font-black uppercase italic flex items-center gap-3 tracking-tight mb-8"><Ruler className="text-blue-400" size={24}/> Son Ölçümlerin (cm)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 text-center shadow-inner"><span className="text-2xl font-black text-blue-400">{measurements[0].shoulder}</span><p className="text-[8px] text-gray-500 font-black uppercase mt-1">Omuz</p></div>
              <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 text-center shadow-inner"><span className="text-2xl font-black text-blue-400">{measurements[0].chest}</span><p className="text-[8px] text-gray-500 font-black uppercase mt-1">Göğüs</p></div>
              <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 text-center shadow-inner"><span className="text-2xl font-black text-blue-400">{measurements[0].arm}</span><p className="text-[8px] text-gray-500 font-black uppercase mt-1">Kol</p></div>
              <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 text-center shadow-inner"><span className="text-2xl font-black text-blue-400">{measurements[0].waist}</span><p className="text-[8px] text-gray-500 font-black uppercase mt-1">Bel</p></div>
            </div>
          </section>
        )}

        {/* ÖZET KARTLAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 text-center shadow-xl"><span className="text-5xl font-black text-green-400">{member.remaining_sessions}</span><p className="text-[10px] text-gray-500 font-black uppercase mt-3 italic tracking-widest">Kalan Seans</p></div>
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 text-center shadow-xl"><span className="text-5xl font-black text-blue-400">{bmi}</span><p className="text-[10px] text-gray-500 font-black uppercase mt-3 italic text-center">VKİ</p></div>
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 text-center shadow-xl"><span className="text-5xl font-black text-yellow-500">{member.goal_weight || '--'}</span><p className="text-[10px] text-gray-500 font-black uppercase mt-3 italic">Hedef</p></div>
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 text-center shadow-xl"><span className="text-5xl font-black text-purple-400">{member.height || '--'}</span><p className="text-[10px] text-gray-500 font-black uppercase mt-3 italic text-center">Boy (m)</p></div>
        </div>

        {/* BESLENME */}
        <section className="bg-white/5 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl space-y-10 text-left">
            <h3 className="text-2xl font-black uppercase italic flex items-center gap-3 tracking-tight text-left text-left"><Apple className="text-green-500" size={28}/> Beslenme Programın</h3>
            <div className="grid md:grid-cols-2 gap-8 text-left text-left">
                <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 text-left shadow-inner"><span className="text-green-500 text-[10px] font-black uppercase tracking-[0.3em] italic">🌅 Kahvaltı</span><p className="text-sm text-gray-300 mt-4 leading-relaxed italic text-left">{dietPlan?.breakfast || 'Liste hazırlanıyor...'}</p></div>
                <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 text-left shadow-inner"><span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] italic">☀️ Öğle</span><p className="text-sm text-gray-300 mt-4 leading-relaxed italic text-left">{dietPlan?.lunch || 'Liste hazırlanıyor...'}</p></div>
                <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 text-left shadow-inner"><span className="text-orange-400 text-[10px] font-black uppercase tracking-[0.3em] italic">🌙 Akşam</span><p className="text-sm text-gray-300 mt-4 leading-relaxed italic text-left">{dietPlan?.dinner || 'Liste hazırlanıyor...'}</p></div>
                <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 text-left shadow-inner"><span className="text-purple-400 text-[10px] font-black uppercase tracking-[0.3em] italic">🥜 Atıştırmalık</span><p className="text-sm text-gray-300 mt-4 leading-relaxed italic text-left">{dietPlan?.snacks || 'Liste hazırlanıyor...'}</p></div>
            </div>
        </section>

        {/* GRAFİK */}
        <section className="bg-white/5 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl text-left">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500 mb-10 flex items-center gap-2 px-2 text-left text-left"><Activity className="text-green-500" size={18}/> Kilo Değişim Analizi</h3>
          <div className="h-72 w-full text-left">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightLogs.map(l => ({ z: new Date(l.recorded_at).getTime(), t: format(new Date(l.recorded_at), 'd MMM', { locale: tr }), k: l.weight }))}>
                <XAxis dataKey="z" hide /><YAxis stroke="#404040" fontSize={11} domain={['dataMin - 3', 'dataMax + 3']} axisLine={false} tickLine={false} /><Tooltip labelFormatter={(val) => format(new Date(val), 'd MMMM yyyy', { locale: tr })} contentStyle={{ backgroundColor: '#000', borderRadius: '20px', border: '1px solid #22c55e', fontSize: '12px' }} />
                {member.goal_weight && <ReferenceLine y={member.goal_weight} stroke="#eab308" strokeDasharray="5 5" />}
                <Line type="monotone" dataKey="k" name="Kilo" stroke="#22c55e" strokeWidth={6} dot={{ fill: '#22c55e', r: 6 }} animationDuration={1500} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ANTRENMAN GEÇMİŞİ */}
        <section className="space-y-8 text-left text-left">
          <h3 className="text-2xl font-black uppercase italic flex items-center gap-3 tracking-tight text-left px-4 text-left"><Dumbbell className="text-green-500" size={28}/> Antrenman Geçmişin</h3>
          <div className="grid gap-6 text-left">
            {appointments.length > 0 ? appointments.slice(0, 10).map((app, i) => (
              <div key={i} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row justify-between gap-8 hover:bg-white/[0.07] transition-all shadow-2xl text-left">
                <div className="text-left flex-1 text-left">
                  <div className="flex items-center gap-3 mb-4 text-left text-left"><CheckCircle2 className="text-green-500" size={20}/><span className="text-xl font-black uppercase italic tracking-tight">{format(new Date(app.training_date), 'd MMMM EEEE', { locale: tr })}</span></div>
                  <p className="text-sm text-gray-400 italic leading-relaxed text-left pl-8">{app.workout_program || 'Program detayları hazırlanıyor.'}</p>
                </div>
                <div className="bg-black/50 px-8 py-4 rounded-[2rem] border border-white/5 flex items-center gap-4 self-start md:self-center shadow-inner"><Clock size={20} className="text-green-500"/><span className="text-2xl font-black text-green-400 tracking-tighter">{app.training_time}</span></div>
              </div>
            )) : <p className="text-center py-20 text-gray-600 font-black uppercase text-[10px] tracking-widest">Kayıtlı antrenman bulunmuyor.</p>}
          </div>
        </section>

        {/* WHATSAPP BUTONU (ANTRENÖR TERİMLİ) */}
        <a href={`https://wa.me/905015700270?text=${encodeURIComponent('Merhaba antrenörüm, performans panelim üzerinden size ulaşıyorum...')}`} target="_blank" rel="noopener noreferrer" className="fixed bottom-8 right-8 bg-[#25D366] text-white p-5 rounded-full shadow-[0_0_30px_rgba(37,211,102,0.4)] hover:scale-110 transition-all z-[100] group flex items-center gap-3 shadow-green-500/20"><span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">Antrenöre Soru Sor</span><MessageCircle size={28} fill="currentColor" /></a>

        <footer className="text-center py-10 opacity-20 text-[9px] font-black uppercase tracking-[0.6em] italic text-center">ONE TO ONE • Athlete Portal</footer>
      </div>
    </main>
  )
}