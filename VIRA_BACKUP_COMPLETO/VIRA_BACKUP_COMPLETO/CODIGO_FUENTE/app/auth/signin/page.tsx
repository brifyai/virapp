
'use client'

// Removemos NextAuth para usar Supabase Auth directamente
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import Swal from 'sweetalert2'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // 1) Validar contra Supabase en la tabla "usuarios" por email y contraseña
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('contraseña', password)
        .maybeSingle()

      if (usuarioError) {
        console.error('Supabase usuarios error:', usuarioError)
        Swal.fire({ icon: 'error', title: 'Error de autenticación', text: 'Intenta nuevamente.' })
        return
      }
      
      if (!usuario) {
        Swal.fire({ icon: 'error', title: 'Credenciales incorrectas', text: 'Verifica tu email y contraseña.' })
        return
      }

      // 2) Intentar iniciar sesión en Supabase Auth si el usuario ya existe
      const signInRes = await supabase.auth.signInWithPassword({ email, password })
      if (signInRes?.data?.user) {
        await exportLoginVariables(signInRes.data.user, usuario, signInRes.data.session, email)
        router.push('/')
        router.refresh()
        return
      }

      // 3) Si no existe en Supabase Auth, crearlo y luego iniciar sesión
      const signUpRes = await supabase.auth.signUp({
        email,
        password
      })

      if (signUpRes.error) {
        console.error('Supabase signUp error:', signUpRes.error)
        Swal.fire({ icon: 'error', title: 'No se pudo crear la cuenta', text: 'Intenta nuevamente.' })
        return
      }

      // 4) Intentar nuevamente iniciar sesión
      const signInAfterSignUp = await supabase.auth.signInWithPassword({ email, password })
      if (signInAfterSignUp?.data?.user) {
        await exportLoginVariables(signInAfterSignUp.data.user, usuario, signInAfterSignUp.data.session, email)
        router.push('/')
        router.refresh()
      } else {
        // Si el proyecto requiere confirmación de email, avisar al usuario
        Swal.fire({ icon: 'info', title: 'Verifica tu correo', text: 'Debes confirmar tu email para iniciar sesión.' })
      }
    } catch (error) {
      console.error('Login error:', error)
      Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Intenta nuevamente.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Login automático para desarrollo/demo usando Supabase Auth
  const handleDemoLogin = async () => {
    setIsLoading(true)
    try {
      const result = await supabase.auth.signInWithPassword({
        email: 'demo@vira.cl',
        password: 'demo123',
      })

      if (result?.data?.user) {
        await exportLoginVariables(result.data.user, null, result.data.session, 'demo@vira.cl')
        router.push('/')
        router.refresh()
      } else if (result?.error) {
        Swal.fire({ icon: 'error', title: 'Demo no disponible', text: 'Revisa las credenciales demo.' })
      }
    } catch (error) {
      console.error('Demo login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Exportar solo el email en LocalStorage para uso posterior
  const exportLoginVariables = async (
    supaUser: any,
    usuario: any,
    _session: any,
    fallbackEmail: string
  ) => {
    const emailToStore = supaUser?.email ?? usuario?.email ?? fallbackEmail
    try {
      localStorage.setItem('vira_user_email', emailToStore ?? '')
      // Log de los datos exportados
      console.log('[VIRA] Datos exportados tras login:', {
        email: emailToStore ?? '',
        localStorageKey: 'vira_user_email',
        timestamp: new Date().toISOString(),
      })
      // Opcional: emitir evento por si otros componentes quieren reaccionar
      window.dispatchEvent(new CustomEvent('vira:email', { detail: { email: emailToStore ?? '' } }))
      console.log('[VIRA] Evento emitido: vira:email', { email: emailToStore ?? '' })
    } catch (err) {
      console.error('No se pudo guardar el email en LocalStorage:', err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 7.464L12 3.928 8.464 7.464M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VIRA</h1>
          <p className="text-gray-600 text-sm">Sistema de Noticieros Automáticos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Iniciar Sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Para desarrollo/demo</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={handleDemoLogin}
                disabled={isLoading}
              >
                🚀 Acceso Demo (Sin autenticación)
              </Button>
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              <p>Versión de desarrollo - Cualquier email/password funciona</p>
              <p>O usa el botón "Acceso Demo" para entrar directamente</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
