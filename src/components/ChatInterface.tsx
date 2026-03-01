'use client'
import { useChat } from 'ai/react'
import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useRouter } from 'next/navigation'

interface Props {
  user: { id: string; username: string; displayName: string; avatar: string }
}

type ToolResultData = {
  url?: string
  audioBase64?: string
  results?: string
  content?: string
  error?: string
  prompt?: string
  voice?: string
}

const MODEL_OPTIONS = [
  { id: 'claude-haiku-4-5', label: 'Haiku · Rápido', desc: 'Tareas simples, respuestas rápidas' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet · Balanceado', desc: 'Uso general, recomendado' },
  { id: 'claude-opus-4-6', label: 'Opus · Máximo', desc: 'Análisis complejos, máxima calidad' },
]

const SUGGESTIONS = [
  '🖼️ Genera una imagen de una ciudad futurista al atardecer',
  '🔍 Busca las últimas noticias de IA en 2026',
  '🎬 Crea un video de olas del mar en la playa',
  '💡 Explica cómo funciona el machine learning',
  '🌐 Analiza el sitio web de https://vitali.solutions',
]

export default function ChatInterface({ user }: Props) {
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6')
  const [showModelMenu, setShowModelMenu] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, setMessages } = useChat({
    api: '/api/chat',
    body: { model: selectedModel },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
      }
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function renderToolResult(toolResult: unknown) {
    const data = toolResult as ToolResultData
    if (!data) return null

    if (data.error) return (
      <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
        ⚠️ {data.error}
      </div>
    )

    // Imagen
    if (data.url && (data.url.includes('fal') || data.url.includes('cdn') || data.prompt)) {
      return (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.url}
            alt={data.prompt ?? 'Imagen generada'}
            className="rounded-xl max-w-full max-h-96 object-contain border border-white/10"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <p className="text-white/30 text-xs mt-1">✦ Generada con IA</p>
        </div>
      )
    }

    // Video
    if (data.url && data.prompt && !data.url.includes('fal')) {
      return (
        <div className="mt-3">
          <video
            src={data.url}
            controls
            className="rounded-xl max-w-full max-h-80 border border-white/10"
          />
          <p className="text-white/30 text-xs mt-1">✦ Video generado con IA</p>
        </div>
      )
    }

    // Audio
    if (data.audioBase64) {
      return (
        <div className="mt-3 bg-white/[0.04] border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-xs mb-2">🎙 Voz generada · {data.voice}</p>
          <audio
            controls
            src={`data:audio/mpeg;base64,${data.audioBase64}`}
            className="w-full h-10"
          />
        </div>
      )
    }

    // Resultados de búsqueda / scraping
    if (data.results || data.content) {
      return (
        <div className="mt-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-white/70 text-sm">
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {(data.results ?? data.content ?? '').slice(0, 3000)}
            </ReactMarkdown>
          </div>
        </div>
      )
    }

    return null
  }

  const currentModel = MODEL_OPTIONS.find(m => m.id === selectedModel) ?? MODEL_OPTIONS[1]

  return (
    <div className="h-screen flex flex-col bg-[#050508]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
            <span className="text-white text-sm font-black">V</span>
          </div>
          <div>
            <h1 className="text-white text-sm font-semibold leading-none">Vitali Studio</h1>
            <p className="text-white/30 text-xs">IA privada</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white/70 hover:text-white transition-all"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
              {currentModel.label}
              <span className="text-white/30">▾</span>
            </button>

            {showModelMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#0d0d14] border border-white/[0.08] rounded-2xl shadow-2xl z-50 overflow-hidden">
                {MODEL_OPTIONS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModel(m.id); setShowModelMenu(false) }}
                    className={`w-full flex flex-col items-start px-4 py-3 hover:bg-white/[0.04] transition-colors text-left ${m.id === selectedModel ? 'bg-violet-500/10' : ''}`}
                  >
                    <span className="text-white text-sm font-medium">{m.label}</span>
                    <span className="text-white/40 text-xs">{m.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
              {user.avatar}
            </div>
            <button
              onClick={handleLogout}
              className="text-white/30 hover:text-white/60 transition-colors text-xs"
              title="Cerrar sesión"
            >
              ⎋
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center pt-16">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-500/30">
                <span className="text-white text-3xl">✦</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Hola, {user.displayName}</h2>
              <p className="text-white/40 text-sm mb-8">¿En qué trabajamos hoy?</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setInput(s.replace(/^[^\s]+\s/, ''))}
                    className="text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-violet-500/30 rounded-xl p-3 text-white/60 hover:text-white text-sm transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-violet-500/20">
                  <span className="text-white text-xs font-bold">V</span>
                </div>
              )}

              <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                {msg.role === 'user' ? (
                  <div className="bg-violet-600/20 border border-violet-500/20 rounded-2xl rounded-tr-sm px-4 py-3 text-white text-sm">
                    {msg.content as string}
                  </div>
                ) : (
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm px-5 py-4">
                    {/* Texto principal */}
                    {typeof msg.content === 'string' && msg.content && (
                      <div className="prose-chat text-white/85 text-sm leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    )}

                    {/* Tool invocations */}
                    {Array.isArray(msg.toolInvocations) && msg.toolInvocations.map((inv) => {
                      const invAny = inv as { toolCallId: string; toolName: string; state: string; result?: unknown }
                      if (invAny.state !== 'result') {
                        return (
                          <div key={invAny.toolCallId} className="mt-2 flex items-center gap-2 text-violet-400 text-xs">
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            {invAny.toolName === 'generate_image' && 'Generando imagen...'}
                            {invAny.toolName === 'generate_video' && 'Generando video (puede tardar 1-2 min)...'}
                            {invAny.toolName === 'text_to_speech' && 'Sintetizando voz...'}
                            {invAny.toolName === 'web_search' && 'Buscando en internet...'}
                            {invAny.toolName === 'scrape_url' && 'Analizando página web...'}
                          </div>
                        )
                      }
                      return (
                        <div key={invAny.toolCallId}>
                          {renderToolResult(invAny.result)}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0 mt-0.5 text-white text-xs font-bold">
                  {user.avatar}
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20">
                <span className="text-white text-xs font-bold">V</span>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm px-5 py-4">
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 150, 300].map(delay => (
                    <div
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.06] bg-white/[0.02] p-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden focus-within:border-violet-500/50 focus-within:bg-violet-500/[0.03] transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
                rows={1}
                disabled={isLoading}
                className="w-full bg-transparent px-4 py-3 text-white text-sm placeholder-white/20 resize-none focus:outline-none max-h-32 min-h-[48px]"
                style={{ height: 'auto' }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 128) + 'px'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg shadow-violet-500/20 shrink-0"
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
              )}
            </button>
          </form>

          <p className="text-center text-white/15 text-xs mt-2">
            Vitali Studio puede cometer errores. Verifica información importante.
          </p>
        </div>
      </div>
    </div>
  )
}
