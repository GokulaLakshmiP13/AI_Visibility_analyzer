import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  preset: 'vercel',
  // Keep compatibility flags conservative for Vercel's Node runtime
  compatibility: 'auto',
})
