import nodemailer from 'nodemailer'
import providers from '../shared/mail-providers.json' with { type: 'json' }

const recipient = 'chennanbeicc@gmail.com'
const maxBytes = 20000

export function createRoomMailer(env) {
  const user = env.SMTP_USER?.trim()
  const domain = user?.split('@')[1]?.toLowerCase()
  const host = env.SMTP_HOST?.trim() || providers.find(provider => provider.domains.includes(domain))?.smtpHost
  const port = Number(env.SMTP_PORT || 465)
  const transport = host && user && env.SMTP_PASS
    ? nodemailer.createTransport({
        host, port, secure: port === 465, requireTLS: true,
        auth: { user, pass: env.SMTP_PASS },
        connectionTimeout: 10000, socketTimeout: 20000,
      })
    : null
  const lastAttempt = new Map()

  return async function roomMail(req, res) {
    res.setHeader('Cache-Control', 'no-store')
    const end = status => { res.writeHead(status); res.end() }

    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ direct: Boolean(transport) }))
      return
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return end(405)
    }
    if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') return end(415)
    try {
      if (new URL(req.headers.origin).host !== req.headers.host) return end(403)
    } catch { return end(403) }
    if (!transport) return end(503)
    if (Number(req.headers['content-length']) > maxBytes) return end(413)

    let payload
    try {
      // Hosting adapters can supply parsed JSON; Vite supplies the request stream.
      if (req.body !== undefined) {
        payload = req.body
      } else {
        let size = 0
        const chunks = []
        for await (const chunk of req) {
          size += chunk.length
          if (size > maxBytes) return end(413)
          chunks.push(chunk)
        }
        payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      }
    } catch { return end(400) }
    const { replyTo, message } = payload ?? {}
    if (typeof replyTo !== 'string' || replyTo.length > 254 ||
        !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(replyTo) ||
        typeof message !== 'string' || !message.trim() || message.length > 4000) return end(400)

    const now = Date.now()
    for (const [key, time] of lastAttempt) if (now - time >= 60000) lastAttempt.delete(key)
    const ip = (env.VERCEL === '1' && req.headers['x-real-ip']) || req.socket.remoteAddress
    if (lastAttempt.has(ip)) return end(429)
    lastAttempt.set(ip, now)
    try {
      const result = await transport.sendMail({
        from: env.SMTP_FROM || user, to: recipient,
        replyTo: { address: replyTo, name: '' }, subject: '来自雪落山庄的来信',
        text: message.trim(), disableFileAccess: true, disableUrlAccess: true,
      })
      return end(result.accepted?.length ? 204 : 502)
    } catch { return end(502) }
  }
}
