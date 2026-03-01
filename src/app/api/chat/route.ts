import { streamText, tool } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { generateImage, generateVideo, textToSpeech, webSearch, scrapeUrl } from '@/lib/tools'

export const maxDuration = 120

export async function POST(req: Request) {
  const user = await getSession()
  if (!user) return new Response('No autorizado', { status: 401 })

  const { messages, model = 'claude-sonnet-4-6' } = await req.json() as {
    messages: unknown[]
    model?: string
  }

  const allowedModels = ['claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-opus-4-6']
  const selectedModel = allowedModels.includes(model) ? model : 'claude-sonnet-4-6'

  const result = streamText({
    model: anthropic(selectedModel as 'claude-sonnet-4-6'),
    system: `Eres el asistente IA privado de Vitali Solutions. Tienes acceso a herramientas de generación de imágenes, video, audio, búsqueda web y scraping.

Usuario actual: ${user.displayName}
Fecha: ${new Date().toLocaleDateString('es-AR')}

Responde siempre en español. Sé directo y técnico. Cuando uses herramientas, explica brevemente qué estás haciendo.`,
    messages: messages as Parameters<typeof streamText>[0]['messages'],
    maxSteps: 5,
    tools: {
      generate_image: tool({
        description: 'Genera una imagen de alta calidad con IA (Flux Pro, SDXL). Usar cuando el usuario pida crear, generar o dibujar una imagen.',
        parameters: z.object({
          prompt: z.string().describe('Descripción detallada de la imagen en inglés para mejores resultados'),
          model: z.enum(['flux-schnell', 'flux-dev', 'flux-pro', 'flux-realism']).default('flux-schnell').describe('flux-schnell=rápido, flux-pro=mejor calidad'),
          width: z.number().int().min(256).max(1440).default(1024),
          height: z.number().int().min(256).max(1440).default(1024),
        }),
        execute: async (params) => {
          const result = await generateImage(params)
          if (result.error) return { error: result.error }
          return { url: result.url, prompt: params.prompt, model: params.model }
        },
      }),

      generate_video: tool({
        description: 'Genera un video con IA (RunwayML Gen-3 Alpha). Usar cuando el usuario pida crear un video.',
        parameters: z.object({
          prompt: z.string().describe('Descripción de la escena, movimiento y estilo del video'),
          duration: z.number().int().min(5).max(10).default(5).describe('Duración en segundos'),
        }),
        execute: async (params) => {
          const result = await generateVideo(params)
          if (result.error) return { error: result.error }
          return { url: result.url, prompt: params.prompt }
        },
      }),

      text_to_speech: tool({
        description: 'Convierte texto a voz realista (ElevenLabs). Usar cuando el usuario quiera escuchar texto.',
        parameters: z.object({
          text: z.string().max(5000).describe('Texto a convertir en voz'),
          voice: z.enum(['Rachel', 'Bella', 'Antoni', 'Charlotte', 'Liam']).default('Rachel'),
        }),
        execute: async (params) => {
          const result = await textToSpeech(params)
          if (result.error) return { error: result.error }
          return { audioBase64: result.audioBase64, voice: params.voice }
        },
      }),

      web_search: tool({
        description: 'Busca información actualizada en internet (Tavily). Usar para preguntas sobre eventos recientes, datos actuales o información que necesita verificación.',
        parameters: z.object({
          query: z.string().describe('Consulta de búsqueda clara y específica'),
          depth: z.enum(['basic', 'advanced']).default('basic').describe('advanced=más detallado pero lento'),
        }),
        execute: async (params) => {
          const result = await webSearch(params)
          if (result.error) return { error: result.error }
          return { results: result.results }
        },
      }),

      scrape_url: tool({
        description: 'Extrae y analiza el contenido completo de una URL (Firecrawl). Usar para analizar páginas web específicas.',
        parameters: z.object({
          url: z.string().url().describe('URL completa a analizar'),
        }),
        execute: async (params) => {
          const result = await scrapeUrl(params)
          if (result.error) return { error: result.error }
          return { content: result.content?.slice(0, 8000) }
        },
      }),
    },
  })

  return result.toDataStreamResponse()
}
