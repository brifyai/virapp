
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  BarChart3, 
  FileText, 
  Layout, 
  Zap, 
  FolderOpen, 
  BookOpen, 
  Settings,
  Radio,
  AlertCircle,
  User,
  CreditCard,
  LogOut,
  Menu,
  Clock
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { supabase } from '@/lib/supabase'

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: BarChart3,
  },
  {
    name: 'Crear Noticiero',
    href: '/crear-noticiero',
    icon: FileText,
  },
  {
    name: 'Último Minuto',
    href: '/ultimo-minuto',
    icon: AlertCircle,
  },
  {
    name: 'Timeline Noticiero',
    href: '/timeline-noticiero',
    icon: Clock,
  },
  {
    name: 'Plantillas',
    href: '/plantillas',
    icon: Layout,
  },
  {
    name: 'Automatización',
    href: '/automatizacion',
    icon: Zap,
  },
  {
    name: 'Activos',
    href: '/activos',
    icon: FolderOpen,
  },
  {
    name: 'Bibliotecas',
    href: '/bibliotecas',
    icon: BookOpen,
  },
  {
    name: 'Integraciones',
    href: '/integraciones',
    icon: Settings,
  },
]

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession() || {}
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [storedEmail, setStoredEmail] = useState<string | null>(null)
  const [usuarioData, setUsuarioData] = useState<any | null>(null)

  useEffect(() => {
    try {
      const email = localStorage.getItem('vira_user_email')
      if (email) setStoredEmail(email)
    } catch (err) {
      console.error('No se pudo leer vira_user_email de LocalStorage:', err)
    }

    const handler = (e: any) => {
      const email = e?.detail?.email
      if (typeof email === 'string') setStoredEmail(email)
    }
    window.addEventListener('vira:email', handler)
    return () => window.removeEventListener('vira:email', handler)
  }, [])

  // Consultar al backend de Supabase la tabla 'usuarios' con el storedEmail y loguear el resultado
  useEffect(() => {
    if (!storedEmail) return
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', storedEmail)
          .maybeSingle()

        if (error) {
          console.error('[VIRA] Error consultando usuarios por email:', error)
        } else if (!cancelled) {
          console.log('[VIRA] Usuario desde Supabase (usuarios):', data)
          setUsuarioData(data || null)
        }
      } catch (err) {
        console.error('[VIRA] Error inesperado consultando usuarios:', err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [storedEmail])

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
              <Radio className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">VIRA</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-900">
                  {usuarioData?.nombre_completo ?? usuarioData?.full_name ?? 'Usuario'}
                </div>
                <div className="text-xs text-gray-500">
                  {storedEmail || 'usuario@vira.cl'}
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {usuarioData?.nombre_completo ?? usuarioData?.full_name ?? 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {storedEmail ?? 'usuario@vira.cl'}
                    </p>
                  </div>
                  
                  <Link
                    href="/perfil"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <User className="h-4 w-4 mr-3" />
                    Mi Perfil
                  </Link>
                  
                  <Link
                    href="/pagos"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <CreditCard className="h-4 w-4 mr-3" />
                    Facturación
                  </Link>
                  
                  <div className="border-t border-gray-100">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        handleSignOut()
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
