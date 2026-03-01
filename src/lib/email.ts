// OTP via Telegram Bot — más confiable que email, sin spam, instantáneo

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''

function getChatId(userId: string): string {
  if (userId === 'alessandro') return process.env.TELEGRAM_CHAT_ALESSANDRO ?? ''
  if (userId === 'martin') return process.env.TELEGRAM_CHAT_MARTIN ?? ''
  return ''
}

export async function sendOtpEmail(to: string, name: string, code: string, userId?: string): Promise<boolean> {
  // Siempre loguear como respaldo
  console.log(`\n🔐 VITALI OTP | Usuario: ${name} | Código: ${code}\n`)

  if (!BOT_TOKEN) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN no configurado')
    return true
  }

  const chatId = getChatId(userId ?? name.toLowerCase())

  if (!chatId) {
    console.warn(`⚠️  TELEGRAM_CHAT_${name.toUpperCase()} no configurado en Railway Variables`)
    return true
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        parse_mode: 'HTML',
        text: [
          `🔐 <b>Vitali Studio</b>`,
          ``,
          `Hola ${name}, tu código de acceso es:`,
          ``,
          `<code>${code}</code>`,
          ``,
          `⏱ Expira en <b>5 minutos</b>.`,
          `Si no fuiste vos, ignorá este mensaje.`,
        ].join('\n'),
      }),
    })

    const data = await res.json() as { ok: boolean; description?: string }

    if (!data.ok) {
      console.error('❌ Telegram error:', data.description)
      return false
    }

    console.log(`✅ OTP enviado por Telegram a ${name} (chat_id: ${chatId})`)
    return true
  } catch (err) {
    console.error('❌ Error Telegram:', err)
    return false
  }
}
