'use client'
import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifyPage() {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [countdown, setCountdown] = useState(300)
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  useEffect(() => {
    const id = sessionStorage.getItem('otp_userId') ?? ''
    const em = sessionStorage.getItem('otp_email') ?? ''
    if (!id) { router.push('/login'); return }
    setUserId(id)
    setEmail(em)
    refs.current[0]?.focus()
  }, [router])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60

  function handleChange(index: number, value: string) {
    const char = value.replace(/[^0-9]/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = char
    setDigits(newDigits)
    if (char && index < 5) refs.current[index + 1]?.focus()
    if (newDigits.every(d => d !== '')) {
      submitCode(newDigits.join(''))
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6)
    const newDigits = [...digits]
    pasted.split('').forEach((char, i) => { if (i < 6) newDigits[i] = char })
    setDigits(newDigits)
    if (pasted.length === 6) submitCode(pasted)
    else refs.current[Math.min(pasted.length, 5)]?.focus()
  }

  async function submitCode(code: string) {
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code }),
    })

    const data = await res.json() as { error?: string }

    if (!res.ok) {
      setError(data.error ?? 'Código incorrecto')
      setDigits(['', '', '', '', '', ''])
      setLoading(false)
      refs.current[0]?.focus()
      return
    }

    sessionStorage.removeItem('otp_userId')
    sessionStorage.removeItem('otp_email')
    router.push('/chat')
  }

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/30">
            <span className="text-white text-2xl">✈️</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Verificación</h1>
          <p className="text-white/40 text-sm mt-1">
            Código enviado por <span className="text-white/70 font-medium">Telegram</span>
          </p>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={el => { refs.current[i] = el }}
                className="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm text-center mb-4">
              {error}
            </div>
          )}

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-white/40 text-sm">
                Expira en{' '}
                <span className={`font-mono font-bold ${countdown < 60 ? 'text-red-400' : 'text-white/60'}`}>
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </span>
              </p>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="text-violet-400 text-sm hover:text-violet-300 transition-colors"
              >
                Código expirado — Volver al inicio
              </button>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center mt-4 gap-2 text-white/40 text-sm">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Verificando...
            </div>
          )}
        </div>

        <button
          onClick={() => router.push('/login')}
          className="w-full text-center text-white/30 text-sm mt-6 hover:text-white/50 transition-colors"
        >
          ← Volver al login
        </button>
      </div>
    </div>
  )
}
