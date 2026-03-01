// Implementaciones de herramientas MCP para la interfaz web
// Llaman directamente a las APIs externas (mismo que media-mcp-server)

const FAL_KEY = process.env.FAL_API_KEY ?? ''
const RUNWAY_KEY = process.env.RUNWAYML_API_KEY ?? ''
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY ?? ''
const TAVILY_KEY = process.env.TAVILY_API_KEY ?? ''
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY ?? ''

// ─── FAL.AI Helper ─────────────────────────────────────────────────────────
async function falRun(endpoint: string, payload: object): Promise<Record<string, unknown>> {
  const submitRes = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const job = await submitRes.json() as { request_id?: string; images?: unknown[] }
  if (!job.request_id) return job

  // Poll for result
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const statusRes = await fetch(`https://queue.fal.run/${endpoint}/requests/${job.request_id}/status`, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    })
    const status = await statusRes.json() as { status?: string }
    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(`https://queue.fal.run/${endpoint}/requests/${job.request_id}`, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      })
      return resultRes.json()
    }
    if (status.status === 'FAILED') return { error: 'Job falló en FAL' }
  }
  return { error: 'Timeout en FAL' }
}

// ─── IMAGEN ────────────────────────────────────────────────────────────────
export async function generateImage(params: {
  prompt: string
  model?: string
  width?: number
  height?: number
}): Promise<{ url?: string; error?: string }> {
  const { prompt, model = 'flux-schnell', width = 1024, height = 1024 } = params
  const endpoints: Record<string, string> = {
    'flux-schnell': 'fal-ai/flux/schnell',
    'flux-dev': 'fal-ai/flux/dev',
    'flux-pro': 'fal-ai/flux-pro',
    'flux-realism': 'fal-ai/flux-realism',
  }

  const result = await falRun(endpoints[model] ?? 'fal-ai/flux/schnell', {
    prompt,
    image_size: { width, height },
    num_inference_steps: model === 'flux-schnell' ? 4 : 28,
    num_images: 1,
  }) as { images?: Array<{ url: string }>; error?: string }

  if (result.error) return { error: result.error }
  if (result.images?.[0]?.url) return { url: result.images[0].url }
  return { error: 'Sin resultado de imagen' }
}

// ─── VIDEO ─────────────────────────────────────────────────────────────────
export async function generateVideo(params: {
  prompt: string
  duration?: number
}): Promise<{ url?: string; error?: string }> {
  const { prompt, duration = 5 } = params
  if (!RUNWAY_KEY) return { error: 'RUNWAYML_API_KEY no configurada' }

  const res = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RUNWAY_KEY}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify({
      model: 'gen3a_turbo',
      promptText: prompt,
      duration: Math.min(duration, 10),
      ratio: '1280:768',
      watermark: false,
    }),
  })

  if (!res.ok) return { error: `Error RunwayML: ${res.status}` }
  const job = await res.json() as { id?: string }
  if (!job.id) return { error: 'Sin ID de tarea' }

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const poll = await fetch(`https://api.dev.runwayml.com/v1/tasks/${job.id}`, {
      headers: { Authorization: `Bearer ${RUNWAY_KEY}`, 'X-Runway-Version': '2024-11-06' },
    })
    const data = await poll.json() as { status?: string; output?: string[] }
    if (data.status === 'SUCCEEDED' && data.output?.[0]) return { url: data.output[0] }
    if (data.status === 'FAILED') return { error: 'Video falló en RunwayML' }
  }
  return { error: 'Timeout generando video' }
}

// ─── TTS ──────────────────────────────────────────────────────────────────
export async function textToSpeech(params: {
  text: string
  voice?: string
}): Promise<{ audioBase64?: string; error?: string }> {
  const voiceIds: Record<string, string> = {
    Rachel: '21m00Tcm4TlvDq8ikWAM',
    Bella: 'EXAVITQu4vr4xnSDxMaL',
    Antoni: 'ErXwobaYiN019PkySvjV',
    Charlotte: 'XB0fDUnXU5powFXDhCwa',
    Liam: 'TX3LPaxmHKxFdv7VOQHJ',
  }
  const voiceId = voiceIds[params.voice ?? 'Rachel'] ?? voiceIds.Rachel

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: params.text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    }),
  })

  if (!res.ok) return { error: `Error ElevenLabs: ${res.status}` }
  const buffer = await res.arrayBuffer()
  const audioBase64 = Buffer.from(buffer).toString('base64')
  return { audioBase64 }
}

// ─── BÚSQUEDA ─────────────────────────────────────────────────────────────
export async function webSearch(params: {
  query: string
  depth?: 'basic' | 'advanced'
}): Promise<{ results?: string; error?: string }> {
  if (!TAVILY_KEY) return { error: 'TAVILY_API_KEY no configurada' }

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_KEY,
      query: params.query,
      search_depth: params.depth ?? 'basic',
      max_results: 5,
      include_answer: true,
    }),
  })

  if (!res.ok) return { error: `Error Tavily: ${res.status}` }
  const data = await res.json() as {
    answer?: string
    results?: Array<{ title: string; url: string; content: string }>
  }

  let output = ''
  if (data.answer) output += `**Respuesta:** ${data.answer}\n\n`
  if (data.results) {
    output += '**Fuentes:**\n'
    data.results.forEach((r, i) => {
      output += `${i + 1}. [${r.title}](${r.url})\n   ${r.content.slice(0, 200)}...\n\n`
    })
  }

  return { results: output || 'Sin resultados' }
}

// ─── SCRAPING ─────────────────────────────────────────────────────────────
export async function scrapeUrl(params: { url: string }): Promise<{ content?: string; error?: string }> {
  if (!FIRECRAWL_KEY) return { error: 'FIRECRAWL_API_KEY no configurada' }

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FIRECRAWL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: params.url, formats: ['markdown'] }),
  })

  if (!res.ok) return { error: `Error Firecrawl: ${res.status}` }
  const data = await res.json() as { data?: { markdown?: string } }
  return { content: data.data?.markdown ?? 'Sin contenido extraído' }
}
