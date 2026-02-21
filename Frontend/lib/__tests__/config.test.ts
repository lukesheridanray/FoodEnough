import { describe, it, expect, vi } from 'vitest'

describe('API_URL', () => {
  it('returns the env var value when NEXT_PUBLIC_API_URL is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:8000')
    const { API_URL } = await import('../config')
    expect(API_URL).toBe('http://localhost:8000')
    vi.unstubAllEnvs()
  })

  it('falls back to the Render URL when env var is not set', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '')
    vi.resetModules()
    const { API_URL } = await import('../config')
    expect(API_URL).toBe('https://foodenough.onrender.com')
    vi.unstubAllEnvs()
  })
})
