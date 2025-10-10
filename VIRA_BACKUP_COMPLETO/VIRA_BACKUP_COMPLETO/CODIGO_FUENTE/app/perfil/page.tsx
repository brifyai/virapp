
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  User, 
  Settings, 
  CreditCard, 
  Shield, 
  Bell, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Calendar,
  Crown,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  FileText,
  Download
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Tipos de datos
interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  city?: string
  country?: string
  role: 'admin' | 'user' | 'operator'
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  avatar?: string
  createdAt: string
  lastLogin: string
  isActive: boolean
}

interface BillingInfo {
  legalName: string
  taxId: string
  address: string
  city: string
  state: string
  country: string
  postalCode: string
  phone: string
  email: string
}

interface PaymentHistory {
  id: string
  date: string
  amount: number
  currency: string
  method: 'mercadopago' | 'transfer' | 'credit_card'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  description: string
  invoiceUrl?: string
}

interface Plan {
  id: string
  name: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  limits: {
    noticieros: number
    integraciones: number
    usuarios: number
    almacenamiento: string
  }
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Plan Gratuito',
    price: 0,
    currency: 'CLP',
    interval: 'month',
    features: [
      '5 noticieros por mes',
      '1 integración',
      'Soporte por email',
      '1GB almacenamiento'
    ],
    limits: {
      noticieros: 5,
      integraciones: 1,
      usuarios: 1,
      almacenamiento: '1GB'
    }
  },
  {
    id: 'basic',
    name: 'Plan Básico',
    price: 29900,
    currency: 'CLP',
    interval: 'month',
    features: [
      '100 noticieros por mes',
      '5 integraciones',
      'Soporte prioritario',
      '10GB almacenamiento',
      'Síntesis de voz premium'
    ],
    limits: {
      noticieros: 100,
      integraciones: 5,
      usuarios: 3,
      almacenamiento: '10GB'
    }
  },
  {
    id: 'pro',
    name: 'Plan Profesional',
    price: 59900,
    currency: 'CLP',
    interval: 'month',
    features: [
      'Noticieros ilimitados',
      'Todas las integraciones',
      'Soporte 24/7',
      '100GB almacenamiento',
      'API personalizada',
      'Múltiples usuarios'
    ],
    limits: {
      noticieros: -1,
      integraciones: -1,
      usuarios: 10,
      almacenamiento: '100GB'
    }
  },
  {
    id: 'enterprise',
    name: 'Plan Empresarial',
    price: 149900,
    currency: 'CLP',
    interval: 'month',
    features: [
      'Todo el Plan Pro',
      'Usuarios ilimitados',
      'Almacenamiento ilimitado',
      'Soporte dedicado',
      'Implementación personalizada',
      'SLA garantizado'
    ],
    limits: {
      noticieros: -1,
      integraciones: -1,
      usuarios: -1,
      almacenamiento: 'Ilimitado'
    }
  }
]

export default function PerfilPage() {
  const { data: session } = useSession() || {}
  const [activeTab, setActiveTab] = useState('perfil')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!session?.user?.email) return
    setIsLoading(true)

    const email = session.user.email
    ;(async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      console.log('[Perfil] Resultado de consulta a "usuarios" por email:', { email, data, error })

      if (error) {
        console.error('[Perfil] Error al consultar usuario en Supabase:', error)
      } else if (data) {
        setUserProfile(prev => ({
          ...prev,
          id: data.id ?? prev.id,
          name: (data.nombre_completo) as string,
          email: (data.email ) as string,
          phone: (data.telefono ) as string | undefined,
          company: (data.empresa ) as string | undefined,
          address: (data.direccion ) as string | undefined,
          city: (data.ciudad ) as string | undefined,
          country: (data.pais ) as string | undefined,
          role: (data.rol ?? data.role ?? prev.role) as 'admin' | 'user' | 'operator',
          plan: (data.plan ?? prev.plan) as 'free' | 'basic' | 'pro' | 'enterprise',
          avatar: (data.avatar ?? prev.avatar) as string | undefined,
          createdAt: (data.created_at ?? data.createdAt ?? prev.createdAt) as string,
          lastLogin: (data.last_login ?? data.lastLogin ?? prev.lastLogin) as string,
          isActive: (typeof data.estado === 'boolean' ? data.estado : (typeof data.isActive === 'boolean' ? data.isActive : prev.isActive)) as boolean
        }))
      }
      setIsLoading(false)
    })()
  }, [session?.user?.email])

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)

  // Estados del perfil
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: session?.user?.id || '',
    name: '',
    email: session?.user?.email || '',
    phone: '',
    company: '',
    address: '',
    city: '',
    country: '',
    role: 'user',
    plan: 'free',
    createdAt: '',
    lastLogin: '',
    isActive: false
  })

  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    legalName: 'Radio Ejemplo FM SpA',
    taxId: '76.123.456-7',
    address: 'Av. Providencia 123, Oficina 456',
    city: 'Santiago',
    state: 'Región Metropolitana',
    country: 'Chile',
    postalCode: '7500000',
    phone: '+56 2 2234 5678',
    email: 'facturacion@radioexample.cl'
  })

  const [paymentHistory] = useState<PaymentHistory[]>([
    {
      id: 'pay_001',
      date: '2024-09-01',
      amount: 59900,
      currency: 'CLP',
      method: 'mercadopago',
      status: 'completed',
      description: 'Plan Profesional - Septiembre 2024',
      invoiceUrl: '/invoices/001.pdf'
    },
    {
      id: 'pay_002',
      date: '2024-08-01',
      amount: 59900,
      currency: 'CLP',
      method: 'transfer',
      status: 'completed',
      description: 'Plan Profesional - Agosto 2024',
      invoiceUrl: '/invoices/002.pdf'
    },
    {
      id: 'pay_003',
      date: '2024-07-01',
      amount: 59900,
      currency: 'CLP',
      method: 'mercadopago',
      status: 'pending',
      description: 'Plan Profesional - Julio 2024'
    }
  ])

  const [teamUsers] = useState([
    {
      id: '2',
      name: 'María González',
      email: 'maria@radioexample.cl',
      role: 'operator',
      lastLogin: '2024-09-04',
      isActive: true
    },
    {
      id: '3',
      name: 'Carlos Rodríguez',
      email: 'carlos@radioexample.cl',
      role: 'user',
      lastLogin: '2024-09-03',
      isActive: true
    }
  ])

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'user' | 'operator',
    sendInvite: true
  })

  const formatCurrency = (amount: number, currency: string = 'CLP') => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getRoleName = (role: string) => {
    const roles = {
      'admin': 'Administrador',
      'user': 'Usuario',
      'operator': 'Operador'
    }
    return roles[role as keyof typeof roles] || role
  }

  const getRoleColor = (role: string) => {
    const colors = {
      'admin': 'bg-red-100 text-red-800',
      'user': 'bg-blue-100 text-blue-800',
      'operator': 'bg-green-100 text-green-800'
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getPlanName = (planId: string) => {
    const plan = plans.find(p => p.id === planId)
    return plan?.name || 'Plan Desconocido'
  }

  const getCurrentPlan = () => {
    return plans.find(p => p.id === userProfile.plan)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'failed': 'bg-red-100 text-red-800',
      'refunded': 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusName = (status: string) => {
    const names = {
      'completed': 'Completado',
      'pending': 'Pendiente',
      'failed': 'Fallido',
      'refunded': 'Reembolsado'
    }
    return names[status as keyof typeof names] || status
  }

  const getMethodName = (method: string) => {
    const methods = {
      'mercadopago': 'MercadoPago',
      'transfer': 'Transferencia',
      'credit_card': 'Tarjeta de Crédito'
    }
    return methods[method as keyof typeof methods] || method
  }

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIsEditingProfile(false)
      alert('Perfil actualizado exitosamente')
    } catch (error) {
      alert('Error al actualizar el perfil')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email) {
      alert('Por favor completa todos los campos')
      return
    }

    setIsLoading(true)
    try {
      // Simular creación de usuario
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIsCreateUserOpen(false)
      setNewUser({ name: '', email: '', role: 'user', sendInvite: true })
      alert('Usuario creado exitosamente. Se ha enviado una invitación por email.')
    } catch (error) {
      alert('Error al crear el usuario')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePlan = (planId: string) => {
    // Redirigir a página de pago con el plan seleccionado
    window.location.href = `/pagos?plan=${planId}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-600 mt-2">
            Gestiona tu cuenta, equipo y configuración de facturación
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="perfil" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="facturacion" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Facturación</span>
            </TabsTrigger>
            <TabsTrigger value="pagos" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Pagos</span>
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex items-center space-x-2">
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Plan</span>
            </TabsTrigger>
            <TabsTrigger value="equipo" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Equipo</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Perfil Personal */}
          <TabsContent value="perfil" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Información Personal</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Actualiza tu información personal y de contacto
                  </p>
                </div>
                <Button 
                  variant={isEditingProfile ? "outline" : "default"}
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditingProfile ? 'Cancelar' : 'Editar'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{userProfile.name || 'sin datos'}</h3>
                    <p className="text-gray-600">{userProfile.email || 'sin datos'}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getRoleColor(userProfile.role)}>
                        {getRoleName(userProfile.role)}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800">
                        {getPlanName(userProfile.plan)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Nombre Completo</Label>
                    <Input
                      value={userProfile.name}
                      placeholder={userProfile.name ? undefined : 'sin datos'}
                      onChange={async (e) => {
                        const newName = e.target.value
                        setUserProfile(prev => ({ ...prev, name: newName }))
                        if (session?.user?.email) {
                          const { data, error } = await supabase
                            .from('usuarios')
                            .update({ nombre_completo: newName })
                            .eq('email', session.user.email)
                            .select()
                            .maybeSingle()
                          console.log('[Perfil] Actualización nombre_completo:', { newName, data, error })
                          if (error) {
                            console.error('[Perfil] Error al actualizar nombre_completo en Supabase:', error)
                          }
                        } else {
                          console.warn('[Perfil] No hay email de sesión disponible para actualizar nombre_completo')
                        }
                      }}
                      disabled={!isEditingProfile}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Email</Label>
                    <Input
                      type="email"
                      value={userProfile.email}
                      placeholder={userProfile.email ? undefined : 'sin datos'}
                      onChange={async (e) => {
                        const newEmail = e.target.value
                        setUserProfile(prev => ({ ...prev, email: newEmail }))
                        if (session?.user?.email) {
                          const { data, error } = await supabase
                            .from('usuarios')
                            .update({ email: newEmail })
                            .eq('email', session.user.email)
                            .select()
                            .maybeSingle()
                          console.log('[Perfil] Actualización email:', { newEmail, data, error })
                          if (error) {
                            console.error('[Perfil] Error al actualizar email en Supabase:', error)
                          }
                        } else {
                          console.warn('[Perfil] No hay email de sesión disponible para actualizar email')
                        }
                      }}
                      disabled={!isEditingProfile}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Teléfono</Label>
                    <Input
                      value={userProfile.phone || ''}
                      placeholder={userProfile.phone ? undefined : 'sin datos'}
                      onChange={async (e) => {
                        const newPhone = e.target.value
                        setUserProfile(prev => ({ ...prev, phone: newPhone }))
                        if (session?.user?.email) {
                          const { data, error } = await supabase
                            .from('usuarios')
                            .update({ telefono: newPhone })
                            .eq('email', session.user.email)
                            .select()
                            .maybeSingle()
                          console.log('[Perfil] Actualización telefono:', { newPhone, data, error })
                          if (error) {
                            console.error('[Perfil] Error al actualizar telefono en Supabase:', error)
                          }
                        } else {
                          console.warn('[Perfil] No hay email de sesión disponible para actualizar telefono')
                        }
                      }}
                      disabled={!isEditingProfile}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Empresa</Label>
                    <Input
                      value={userProfile.company || ''}
                      placeholder={userProfile.company ? undefined : 'sin datos'}
                      onChange={async (e) => {
                        const newCompany = e.target.value
                        setUserProfile(prev => ({ ...prev, company: newCompany }))
                        if (session?.user?.email) {
                          const { data, error } = await supabase
                            .from('usuarios')
                            .update({ empresa: newCompany })
                            .eq('email', session.user.email)
                            .select()
                            .maybeSingle()
                          console.log('[Perfil] Actualización empresa:', { newCompany, data, error })
                          if (error) {
                            console.error('[Perfil] Error al actualizar empresa en Supabase:', error)
                          }
                        } else {
                          console.warn('[Perfil] No hay email de sesión disponible para actualizar empresa')
                        }
                      }}
                      disabled={!isEditingProfile}
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-700">Dirección</Label>
                    <Input
                      value={userProfile.address || ''}
                      placeholder={userProfile.address ? undefined : 'sin datos'}
                      onChange={async (e) => {
                        const newAddress = e.target.value
                        setUserProfile(prev => ({ ...prev, address: newAddress }))
                        if (session?.user?.email) {
                          const { data, error } = await supabase
                            .from('usuarios')
                            .update({ direccion: newAddress })
                            .eq('email', session.user.email)
                            .select()
                            .maybeSingle()
                          console.log('[Perfil] Actualización direccion:', { newAddress, data, error })
                          if (error) {
                            console.error('[Perfil] Error al actualizar direccion en Supabase:', error)
                          }
                        } else {
                          console.warn('[Perfil] No hay email de sesión disponible para actualizar direccion')
                        }
                      }}
                      disabled={!isEditingProfile}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Ciudad</Label>
                    <Input
                      value={userProfile.city || ''}
                      placeholder={userProfile.city ? undefined : 'sin datos'}
                      onChange={async (e) => {
                        const newCity = e.target.value
                        setUserProfile(prev => ({ ...prev, city: newCity }))
                        if (session?.user?.email) {
                          const { data, error } = await supabase
                            .from('usuarios')
                            .update({ ciudad: newCity })
                            .eq('email', session.user.email)
                            .select()
                            .maybeSingle()
                          console.log('[Perfil] Actualización ciudad:', { newCity, data, error })
                          if (error) {
                            console.error('[Perfil] Error al actualizar ciudad en Supabase:', error)
                          }
                        } else {
                          console.warn('[Perfil] No hay email de sesión disponible para actualizar ciudad')
                        }
                      }}
                      disabled={!isEditingProfile}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">País</Label>
                    <Input
                      value={userProfile.country || ''}
                      placeholder={userProfile.country ? undefined : 'sin datos'}
                      onChange={async (e) => {
                        const newCountry = e.target.value
                        setUserProfile(prev => ({ ...prev, country: newCountry }))
                        if (session?.user?.email) {
                          const { data, error } = await supabase
                            .from('usuarios')
                            .update({ pais: newCountry })
                            .eq('email', session.user.email)
                            .select()
                            .maybeSingle()
                          console.log('[Perfil] Actualización pais:', { newCountry, data, error })
                          if (error) {
                            console.error('[Perfil] Error al actualizar pais en Supabase:', error)
                          }
                        } else {
                          console.warn('[Perfil] No hay email de sesión disponible para actualizar pais')
                        }
                      }}
                      disabled={!isEditingProfile}
                      className="mt-1"
                    />
                  </div>
                </div>

                {isEditingProfile && (
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingProfile(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información de la Cuenta */}
            <Card>
              <CardHeader>
                <CardTitle>Información de la Cuenta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <Label className="font-medium text-gray-700">Fecha de Registro</Label>
                    <p className="text-gray-600 mt-1">{userProfile.createdAt ? formatDate(userProfile.createdAt) : 'sin datos'}</p>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Último Acceso</Label>
                    <p className="text-gray-600 mt-1">{userProfile.lastLogin ? formatDate(userProfile.lastLogin) : 'sin datos'}</p>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Estado</Label>
                    <div className="mt-1">
                      <Badge className={userProfile.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {userProfile.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Facturación */}
          <TabsContent value="facturacion" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos de Facturación</CardTitle>
                <p className="text-sm text-gray-600">
                  Información utilizada para generar tus facturas
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Razón Social</Label>
                    <Input
                      value={billingInfo.legalName}
                      onChange={(e) => setBillingInfo({...billingInfo, legalName: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">RUT</Label>
                    <Input
                      value={billingInfo.taxId}
                      onChange={(e) => setBillingInfo({...billingInfo, taxId: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-700">Dirección Fiscal</Label>
                    <Textarea
                      value={billingInfo.address}
                      onChange={(e) => setBillingInfo({...billingInfo, address: e.target.value})}
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Ciudad</Label>
                    <Input
                      value={billingInfo.city}
                      onChange={(e) => setBillingInfo({...billingInfo, city: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Región/Estado</Label>
                    <Input
                      value={billingInfo.state}
                      onChange={(e) => setBillingInfo({...billingInfo, state: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">País</Label>
                    <Select value={billingInfo.country} onValueChange={(value) => setBillingInfo({...billingInfo, country: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Chile">Chile</SelectItem>
                        <SelectItem value="Argentina">Argentina</SelectItem>
                        <SelectItem value="Perú">Perú</SelectItem>
                        <SelectItem value="Colombia">Colombia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Código Postal</Label>
                    <Input
                      value={billingInfo.postalCode}
                      onChange={(e) => setBillingInfo({...billingInfo, postalCode: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Teléfono de Facturación</Label>
                    <Input
                      value={billingInfo.phone}
                      onChange={(e) => setBillingInfo({...billingInfo, phone: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Email de Facturación</Label>
                    <Input
                      type="email"
                      value={billingInfo.email}
                      onChange={(e) => setBillingInfo({...billingInfo, email: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button>
                    Guardar Datos de Facturación
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Historial de Pagos */}
          <TabsContent value="pagos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Pagos</CardTitle>
                <p className="text-sm text-gray-600">
                  Revisa todos tus pagos y descarga las facturas
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {payment.description}
                          </h4>
                          <Badge className={getStatusColor(payment.status)}>
                            {getStatusName(payment.status)}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-x-4">
                          <span>{formatDate(payment.date)}</span>
                          <span>•</span>
                          <span>{getMethodName(payment.method)}</span>
                          <span>•</span>
                          <span className="font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {payment.invoiceUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(payment.invoiceUrl, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Factura
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {paymentHistory.length === 0 && (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No hay pagos registrados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Plan Actual */}
          <TabsContent value="plan" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Plan Actual</CardTitle>
                <p className="text-sm text-gray-600">
                  Gestiona tu suscripción y actualiza tu plan
                </p>
              </CardHeader>
              <CardContent>
                {(() => {
                  const currentPlan = getCurrentPlan()
                  if (!currentPlan) return null

                  return (
                    <div className="space-y-6">
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-blue-900">
                              {currentPlan.name}
                            </h3>
                            <p className="text-blue-700">
                              {currentPlan.price === 0 ? 'Gratis' : `${formatCurrency(currentPlan.price)} / ${currentPlan.interval === 'month' ? 'mes' : 'año'}`}
                            </p>
                          </div>
                          <Crown className="h-8 w-8 text-blue-600" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-900">
                              {currentPlan.limits.noticieros === -1 ? '∞' : currentPlan.limits.noticieros}
                            </div>
                            <div className="text-sm text-blue-700">Noticieros</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-900">
                              {currentPlan.limits.integraciones === -1 ? '∞' : currentPlan.limits.integraciones}
                            </div>
                            <div className="text-sm text-blue-700">Integraciones</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-900">
                              {currentPlan.limits.usuarios === -1 ? '∞' : currentPlan.limits.usuarios}
                            </div>
                            <div className="text-sm text-blue-700">Usuarios</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-900">
                              {currentPlan.limits.almacenamiento}
                            </div>
                            <div className="text-sm text-blue-700">Almacenamiento</div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-blue-900 mb-2">Características incluidas:</h4>
                          <ul className="space-y-1">
                            {currentPlan.features.map((feature, index) => (
                              <li key={index} className="flex items-center text-sm text-blue-800">
                                <Check className="h-4 w-4 text-blue-600 mr-2" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {currentPlan.id !== 'enterprise' && (
                        <>
                          <div className="border-t pt-6">
                            <h4 className="font-medium text-gray-900 mb-4">Actualizar Plan</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {plans
                                .filter(plan => plan.id !== currentPlan.id)
                                .map((plan) => (
                                <Card key={plan.id} className="relative">
                                  <CardContent className="p-4">
                                    <h5 className="font-semibold text-lg mb-2">{plan.name}</h5>
                                    <p className="text-2xl font-bold text-gray-900 mb-4">
                                      {plan.price === 0 ? 'Gratis' : formatCurrency(plan.price)}
                                      {plan.price > 0 && (
                                        <span className="text-sm font-normal text-gray-500">
                                          /{plan.interval === 'month' ? 'mes' : 'año'}
                                        </span>
                                      )}
                                    </p>
                                    <ul className="space-y-1 mb-4">
                                      {plan.features.slice(0, 3).map((feature, index) => (
                                        <li key={index} className="flex items-center text-sm text-gray-700">
                                          <Check className="h-4 w-4 text-green-500 mr-2" />
                                          {feature}
                                        </li>
                                      ))}
                                    </ul>
                                    <Button 
                                      className="w-full"
                                      onClick={() => handleChangePlan(plan.id)}
                                    >
                                      {plan.price > currentPlan.price ? 'Actualizar' : 'Cambiar'}
                                    </Button>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Gestión de Equipo */}
          <TabsContent value="equipo" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Gestión de Equipo</CardTitle>
                  <p className="text-sm text-gray-600">
                    Administra los usuarios de tu organización
                  </p>
                </div>
                <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Usuario
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Nombre Completo</Label>
                        <Input
                          value={newUser.name}
                          onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                          placeholder="Juan Pérez"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Email</Label>
                        <Input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                          placeholder="juan@example.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Rol</Label>
                        <Select value={newUser.role} onValueChange={(value: any) => setNewUser({...newUser, role: value})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuario</SelectItem>
                            <SelectItem value="operator">Operador</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          Los usuarios pueden ver contenido, los operadores pueden crear, los admins pueden todo.
                        </p>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button 
                          variant="outline"
                          onClick={() => setIsCreateUserOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCreateUser}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Creando...' : 'Crear Usuario'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Usuario actual (admin) */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{userProfile.name || 'sin datos'}</h4>
                        <p className="text-sm text-gray-600">{userProfile.email || 'sin datos'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getRoleColor(userProfile.role)}>
                        {getRoleName(userProfile.role)}
                      </Badge>
                      <span className="text-xs text-gray-500">Tú</span>
                    </div>
                  </div>

                  {/* Otros usuarios del equipo */}
                  {teamUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-gray-400 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{user.name}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-xs text-gray-500">
                            Último acceso: {formatDate(user.lastLogin)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getRoleColor(user.role)}>
                          {getRoleName(user.role)}
                        </Badge>
                        <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {teamUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No hay otros usuarios en tu equipo</p>
                    <Button 
                      className="mt-4"
                      onClick={() => setIsCreateUserOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primer Usuario
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información sobre límites del plan */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      <strong>Usuarios actuales:</strong> {teamUsers.length + 1} de {getCurrentPlan()?.limits.usuarios === -1 ? '∞' : getCurrentPlan()?.limits.usuarios}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getCurrentPlan()?.limits.usuarios === -1 
                        ? 'Usuarios ilimitados en tu plan actual' 
                        : `Puedes crear ${(getCurrentPlan()?.limits.usuarios || 0) - (teamUsers.length + 1)} usuarios más`
                      }
                    </p>
                  </div>
                  {getCurrentPlan()?.limits.usuarios !== -1 && getCurrentPlan()?.limits.usuarios === teamUsers.length + 1 && (
                    <Button 
                      variant="outline"
                      onClick={() => setActiveTab('plan')}
                    >
                      Actualizar Plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
