import nodemailer from 'nodemailer'

function getTransport() {
  // Puerto 465 SSL — más confiable en servidores cloud que el service:'gmail'
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: (process.env.GMAIL_APP_PASSWORD ?? '').replace(/\s/g, ''), // elimina espacios si los hay
    },
    connectionTimeout: 10000,
    socketTimeout: 15000,
  })
}

export async function sendOtpEmail(to: string, name: string, code: string): Promise<boolean> {
  // Siempre loguear en Railway como respaldo
  console.log(`\n🔐 VITALI OTP | Usuario: ${name} | Código: ${code} | Destino: ${to}\n`)

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('⚠️  GMAIL_USER o GMAIL_APP_PASSWORD no configurados en Railway Variables')
    return true
  }

  console.log(`📤 Intentando enviar desde ${process.env.GMAIL_USER} → ${to}`)

  try {
    await getTransport().sendMail({
      from: `"Vitali Studio" <${process.env.GMAIL_USER}>`,
      to,
      subject: `${code} — Tu código de acceso a Vitali Studio`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#050508;font-family:Inter,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#050508;padding:40px 20px;">
            <tr><td align="center">
              <table width="480" cellpadding="0" cellspacing="0"
                style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:32px 40px;text-align:center;">
                    <div style="width:48px;height:48px;background:linear-gradient(135deg,#7c3aed,#4f46e5);
                      border-radius:12px;margin:0 auto 16px;display:inline-flex;
                      align-items:center;justify-content:center;">
                      <span style="color:white;font-size:24px;font-weight:bold;">V</span>
                    </div>
                    <h1 style="color:white;font-size:22px;font-weight:700;margin:0 0 8px;">Vitali Studio</h1>
                    <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 32px;">
                      Hola ${name}, aquí está tu código de verificación:
                    </p>
                    <div style="background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);
                      border-radius:12px;padding:24px;margin:0 0 24px;">
                      <span style="color:white;font-size:40px;font-weight:800;letter-spacing:12px;">${code}</span>
                    </div>
                    <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0;">
                      Este código expira en <strong style="color:rgba(255,255,255,0.6);">5 minutos</strong>.<br>
                      Si no solicitaste este código, ignorá este email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
                    <p style="color:rgba(255,255,255,0.25);font-size:12px;margin:0;">
                      Vitali Solutions — Acceso privado
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    })

    console.log(`✅ Email enviado a ${to}`)
    return true
  } catch (err) {
    console.error('❌ Error enviando email:', err)
    return false
  }
}
