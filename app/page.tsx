'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase' 
import { Dumbbell, User, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'admin' | 'member'>('member')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'admin') {
        const { data } = await supabase.from('site_admins').select('*')
          .eq('username', username.toLowerCase().trim()).eq('password', password).maybeSingle()

        if (data) {
          // ADMİN VİZESİ
          localStorage.setItem('user_role', 'admin')
          router.push('/admin')
        } else { setError('Hatalı Antrenör girişi!') }
      } else {
        const { data } = await supabase.from('members').select('slug, password')
          .eq('slug', username.toLowerCase().trim()).eq('password', password).maybeSingle()

        if (data) {
          // ÜYE VİZESİ
          localStorage.setItem('user_role', 'member')
          localStorage.setItem('user_slug', data.slug)
          router.push(`/${data.slug}`)
        } else { setError('Kullanıcı adı veya şifre hatalı!') }
      }
    } catch (err) { setError('Sistem hatası!') } finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/20 blur-[120px] rounded-full"></div>
      </div>
      <div className="w-full max-w-md z-10 space-y-10">
        <header className="text-center space-y-4 text-center">
          <div className="inline-flex p-5 rounded-[2rem] bg-gradient-to-br from-green-400 to-green-600 shadow-[0_0_40px_rgba(34,197,94,0.3)] mb-2">
            <Dumbbell size={40} className="text-black" />
          </div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">ONE TO ONE</h1>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-fit mx-auto">
            <button onClick={() => setMode('member')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${mode === 'member' ? 'bg-green-500 text-black' : 'text-gray-500'}`}>ÜYE</button>
            <button onClick={() => setMode('admin')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${mode === 'admin' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}>ANTRENÖR</button>
          </div>
        </header>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <div className="relative group"><User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-green-500 transition-colors" size={20} /><input type="text" placeholder={mode === 'admin' ? "Antrenör adı..." : "Kullanıcı adınız (slug)..."} value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 pl-16 pr-8 outline-none focus:border-green-500/50 transition-all font-bold text-left" /></div>
            <div className="relative group text-left"><Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-green-500 transition-colors" size={20} /><input type={showPass ? "text" : "password"} placeholder="Şifreniz..." value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 pl-16 pr-16 outline-none focus:border-green-500/50 transition-all font-bold text-left" /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showPass ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div>
          </div>
          <button disabled={loading} type="submit" className={`w-full py-6 rounded-3xl font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${mode === 'admin' ? 'bg-blue-500 text-white shadow-blue-500/20' : 'bg-green-500 text-black shadow-green-500/20'}`}>{loading ? 'SORGULANIYOR...' : 'SİSTEME GİRİŞ YAP'}</button>
        </form>
        {error && <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-[10px] font-black uppercase text-center animate-bounce">{error}</div>}
      </div>
    </main>
  )
}