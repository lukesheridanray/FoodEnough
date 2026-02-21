import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getToken, setToken, removeToken, authHeaders } from '../auth'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('getToken', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('returns null when no token is stored', () => {
    expect(getToken()).toBeNull()
  })

  it('returns the stored token', () => {
    localStorageMock.setItem('token', 'abc123')
    expect(getToken()).toBe('abc123')
  })
})

describe('setToken', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('stores the token in localStorage', () => {
    setToken('my-token')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'my-token')
    expect(localStorageMock.getItem('token')).toBe('my-token')
  })
})

describe('removeToken', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('removes the token from localStorage', () => {
    localStorageMock.setItem('token', 'my-token')
    removeToken()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
    expect(localStorageMock.getItem('token')).toBeNull()
  })
})

describe('authHeaders', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('returns empty object when no token', () => {
    expect(authHeaders()).toEqual({})
  })

  it('returns Authorization header when token exists', () => {
    localStorageMock.setItem('token', 'abc123')
    expect(authHeaders()).toEqual({ Authorization: 'Bearer abc123' })
  })
})
