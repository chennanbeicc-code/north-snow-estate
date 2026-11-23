import { defineConfig, loadEnv } from 'vite'
import { createRoomMailer } from './server/room-mail.mjs'

export default defineConfig(({ mode }) => {
  const handler = createRoomMailer({ ...loadEnv(mode, process.cwd(), 'SMTP_'), ...process.env })
  const mount = server => {
    server.middlewares.use((req, res, next) => {
      if (req.url?.split('?')[0] === '/api/room-mail') return handler(req, res)
      next()
    })
  }
  return { plugins: [{
    name: 'study-contact', configureServer: mount, configurePreviewServer: mount,
    generateBundle() {
      if (mode === 'sites') {
        // Static hosting serves the same capability response as an unconfigured mailer.
        this.emitFile({ type: 'asset', fileName: 'api/room-mail', source: JSON.stringify({ direct: false }) })
      }
    },
  }] }
})
