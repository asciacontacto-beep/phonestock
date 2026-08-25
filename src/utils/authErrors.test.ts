import { describe, it, expect } from 'vitest'
import { isNetworkError, authErrorMessage } from './authErrors'

describe('isNetworkError', () => {
  it('reconoce el nombre que le da cada navegador a la misma falla', () => {
    expect(isNetworkError(new TypeError('Load failed'))).toBe(true)                   // Safari
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)               // Chrome
    expect(isNetworkError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(true) // Firefox
  })

  it('no confunde una respuesta del servidor con una falla de red', () => {
    expect(isNetworkError(new Error('Invalid login credentials'))).toBe(false)
    expect(isNetworkError(null)).toBe(false)
    expect(isNetworkError({})).toBe(false)
    expect(isNetworkError('Load failed')).toBe(false) // string suelto, sin .message
  })
})

describe('authErrorMessage', () => {
  it('explica la falla de red en vez de mostrar el texto del navegador', () => {
    const msg = authErrorMessage(new TypeError('Load failed'))
    expect(msg).not.toContain('Load failed')
    expect(msg).toContain('Relay privado')
    expect(msg).toContain('bloqueador')
  })

  it('traduce los errores conocidos de Supabase', () => {
    expect(authErrorMessage(new Error('Invalid login credentials'))).toBe('Email o contraseña incorrectos.')
    expect(authErrorMessage(new Error('Password should be at least 6 characters')))
      .toBe('La contraseña debe tener al menos 6 caracteres.')
    expect(authErrorMessage(new Error('For security purposes, you can only request this after 45 seconds')))
      .toContain('Demasiados intentos')
  })

  it('deja pasar un mensaje desconocido en lugar de tragárselo', () => {
    expect(authErrorMessage(new Error('Signups not allowed for this instance')))
      .toBe('Signups not allowed for this instance')
  })

  it('tiene una salida por defecto cuando no hay mensaje', () => {
    expect(authErrorMessage(null)).toBe('Error en la autenticación.')
    expect(authErrorMessage(new Error(''))).toBe('Error en la autenticación.')
  })
})
