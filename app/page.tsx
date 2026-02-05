'use client'

import Link from 'next/link'
import { Dumbbell, Users, TrendingUp, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans selection:bg-green-500/30">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
          <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter uppercase mb-6 leading-none drop-shadow-2xl">
            ONE TO <span className="text-green-400">ONE</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-xl font-medium uppercase tracking-[0.4em] mb-12 max-w-2xl mx-auto">
            Ankara Susuz'un En Gelişmiş Kişisel Antrenman Deneyimi
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Link href="/admin" className="group bg-green-500 text-black font-black px-10 py-5 rounded-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all uppercase italic shadow-[0_0_30px_rgba(34,197,94,0.4)]">
              Admin Paneli <ArrowRight className="group-hover:translate-x-2 transition-transform"/>
            </Link>
            <button className="bg-white/5 border border-white/10 px-10 py-5 rounded-2xl font-black uppercase italic hover:bg-white/10 transition-all">
              Üye Takibi (Yakında)
            </button>
          </div>
        </div>
      </section>

      {/* ÖZELLİKLER */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="grid md:grid-cols-3 gap-12">
          <div className="space-y-4 p-8 bg-white/5 rounded-[2.5rem] border border-white/5">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
              <TrendingUp size={28}/>
            </div>
            <h3 className="text-xl font-black uppercase italic">Gelişim Takibi</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Kilonuzu, ölçümlerinizi ve VKİ değerlerinizi anlık grafiklerle takip edin.</p>
          </div>
          
          <div className="space-y-4 p-8 bg-white/5 rounded-[2.5rem] border border-white/5">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
              <Users size={28}/>
            </div>
            <h3 className="text-xl font-black uppercase italic">Kişiye Özel</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Size özel hazırlanan antrenman programlarına tek tıkla ulaşın.</p>
          </div>

          <div className="space-y-4 p-8 bg-white/5 rounded-[2.5rem] border border-white/5">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
              <Dumbbell size={28}/>
            </div>
            <h3 className="text-xl font-black uppercase italic">Profesyonel PT</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Egzersizlerin doğru yapılışlarını video kütüphanemizden izleyin.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center py-20 opacity-30 text-[10px] font-bold uppercase tracking-[0.5em]">
        © 2026 ONE TO ONE | Powered by Mustafa Öztekin
      </footer>
    </main>
  )
}