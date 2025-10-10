
'use client'

import { signIn } from 'next-auth/react'
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
      // Validar contra Supabase en la tabla "usuarios" por email y contraseña
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('contraseña', password)
        .maybeSingle()

      // Dentro de handleSubmit
      if (error) {
        console.error('Supabase auth error:', error)
        Swal.fire({ icon: 'error', title: 'Error de autenticación', text: 'Intenta nuevamente.' })
        return
      }
      
      if (!data) {
        Swal.fire({ icon: 'error', title: 'Credenciales incorrectas', text: 'Verifica tu email y contraseña.' })
        return
      }

      // Si la validación en Supabase fue exitosa, continuar con NextAuth
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/')
        router.refresh()
      } else {
        Swal.fire({ icon: 'error', title: 'Error al iniciar sesión', text: 'Verifica tus credenciales.' })
      }
    } catch (error) {
      console.error('Login error:', error)
      Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Intenta nuevamente.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Login automático para desarrollo/demo
  const handleDemoLogin = async () => {
    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        email: 'demo@vira.cl',
        password: 'demo123',
        redirect: false,
      })

      if (result?.ok) {
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      console.error('Demo login error:', error)
    } finally {
      setIsLoading(false)
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
