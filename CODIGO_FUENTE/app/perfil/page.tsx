
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
  role: 'administrador' | 'super-administrador'
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
  const [storedEmail, setStoredEmail] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false)
 
  // Inicializa storedEmail desde localStorage y escucha eventos 'vira:email'
  useEffect(() => {
    try {
      const email = localStorage.getItem('vira_user_email')
      if (email) setStoredEmail(email)
    } catch (err) {
      console.error('[Perfil] No se pudo leer vira_user_email de LocalStorage:', err)
    }

    const handler = (e: any) => {
      const email = e?.detail?.email
      if (typeof email === 'string') setStoredEmail(email)
    }
    window.addEventListener('vira:email', handler)
    return () => window.removeEventListener('vira:email', handler)
  }, [])

  // Consulta a Supabase usando storedEmail y actualiza el perfil
  useEffect(() => {
    if (!storedEmail) return
    setIsLoading(true)

    const email = storedEmail
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
          name: (data.nombre_completo ?? prev.name ?? 'Sin datos') as string,
          email: (data.email ?? prev.email ?? email ?? 'Sin datos') as string,
          phone: ((data.telefono ?? prev.phone) ?? 'Sin datos') as string,
          company: ((data.empresa ?? prev.company) ?? 'Sin datos') as string,
          address: ((data.direccion ?? prev.address) ?? 'Sin datos') as string,
          city: ((data.ciudad ?? prev.city) ?? 'Sin datos') as string,
          country: ((data.pais ?? prev.country) ?? 'Sin datos') as string,
          role: (data.rol ?? data.role ?? prev.role) as 'administrador' | 'super-administrador',
          plan: (data.plan ?? prev.plan) as 'free' | 'basic' | 'pro' | 'enterprise',
          avatar: (data.avatar ?? prev.avatar ?? 'Sin datos') as string,
          createdAt: (data.created_at ?? data.createdAt ?? prev.createdAt ?? 'Sin datos') as string,
          lastLogin: (data.last_login ?? data.lastLogin ?? prev.lastLogin ?? 'Sin datos') as string,
          isActive: (typeof data.estado === 'boolean' ? data.estado : (typeof data.isActive === 'boolean' ? data.isActive : prev.isActive)) as boolean
        }))
      }
      setIsLoading(false)
    })()
  }, [storedEmail])

  // Registros de facturación donde integrantes incluye el correo almacenado
  const [facturacionRegistros, setFacturacionRegistros] = useState<any[]>([])
  const [hasAutoAppliedBilling, setHasAutoAppliedBilling] = useState(false)
  
  // Todos los registros de facturación para mostrar en la lista
  const [todosFacturacionRegistros, setTodosFacturacionRegistros] = useState<any[]>([])

  // Consultar facturación al iniciar/actualizar storedEmail: buscar registros donde integrantes JSONB contenga el correo almacenado
  useEffect(() => {
    const fetchFacturacion = async () => {
      try {
        if (!storedEmail) return


        console.log(storedEmail)
        const filtroJSON = JSON.stringify([
          {"Correo": storedEmail}
        ])
        const { data, error } = await supabase
          .from('facturacion')
          .select('*')
          .contains('integrantes', filtroJSON)
          console.log(data)

        if (error) {
          console.warn('[Perfil] Error consultando tabla "facturación":', error)
        } else {
          setFacturacionRegistros(Array.isArray(data) ? data : [])
          console.log('[Perfil] Registros de facturación (tabla "facturación"):', data)
        }
      } catch (err) {
        console.error('[Perfil] Error inesperado al consultar facturación:', err)
      }
    }

    fetchFacturacion()
  }, [storedEmail])

  // Consultar todos los registros de facturación para mostrar en la lista
  useEffect(() => {
    const fetchTodosFacturacion = async () => {
      try {
        const { data, error } = await supabase
          .from('facturacion')
          .select('*')


        if (error) {
          console.warn('[Perfil] Error consultando todos los registros de facturación:', error)
        } else {
          setTodosFacturacionRegistros(Array.isArray(data) ? data : [])
          console.log('[Perfil] Todos los registros de facturación:', data)
        }
      } catch (err) {
        console.error('[Perfil] Error inesperado al consultar todos los registros de facturación:', err)
      }
    }

    fetchTodosFacturacion()
  }, [])

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
    role: 'administrador',
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

  // Auto: colocar información de facturación en el formulario cuando se obtienen registros
  useEffect(() => {
    if (!hasAutoAppliedBilling && Array.isArray(facturacionRegistros) && facturacionRegistros.length > 0) {
      const info = mapRecordToBillingInfo(facturacionRegistros[0])
      setBillingInfo(info)
      setHasAutoAppliedBilling(true)
    }
  }, [facturacionRegistros, hasAutoAppliedBilling])

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
      role: 'administrador',
      lastLogin: '2024-09-04',
      isActive: true
    },
    {
      id: '3',
      name: 'Carlos Rodríguez',
      email: 'carlos@radioexample.cl',
      role: 'administrador',
      lastLogin: '2024-09-03',
      isActive: true
    }
  ])

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'administrador' as 'administrador' | 'super-administrador',
    sendInvite: true
  })

  const [addUserEmail, setAddUserEmail] = useState('')
  const [addUserPassword, setAddUserPassword] = useState('')
  const [addUserRole, setAddUserRole] = useState('administrador')

  const [newCompany, setNewCompany] = useState({
    razon_social: '',
    rut: '',
    direccion: '',
    ciudad: '',
    pais: 'Chile',
    codigo_postal: '',
    telefono: '',
    email: '',
    integrantes: [] as { Correo: string }[]
  })

  const [integrantesInput, setIntegrantesInput] = useState('')

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
      'administrador': 'Administrador',
      'super-administrador': 'Super Administrador'
    }
    return roles[role as keyof typeof roles] || role
  }

  const getRoleColor = (role: string) => {
    const colors = {
      'administrador': 'bg-red-100 text-red-800',
      'super-administrador': 'bg-purple-100 text-purple-800'
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

  // Mapeo seguro del registro de facturación a BillingInfo para mostrar en el h3
  const mapRecordToBillingInfo = (rec: any): BillingInfo => {
    return {
      legalName: rec?.razon_social ?? rec?.empresa ?? rec?.legalName ?? '',
      taxId: rec?.rut ?? rec?.taxId ?? rec?.rut_empresa ?? '',
      address: rec?.direccion_fiscal ?? rec?.address ?? '',
      city: rec?.ciudad ?? rec?.city ?? '',
      state: rec?.region ?? rec?.state ?? rec?.estado ?? '',
      country: rec?.pais ?? '',
      postalCode: rec?.codigo_postal ?? rec?.postalCode ?? '',
      phone: rec?.telefono_facturacion ?? rec?.phone ?? '',
      email: rec?.email_facturacion ?? rec?.correo ?? ''
    }
  }

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      if (!storedEmail) {
        alert('No se pudo identificar tu usuario (storedEmail no disponible).')
        return
      }

      // Construir objeto de actualización para la tabla 'usuarios'
      const updates = {
        nombre_completo: userProfile.name || null,
        email: userProfile.email || null,
        telefono: userProfile.phone || null,
        empresa: userProfile.company || null,
        direccion: userProfile.address || null,
        ciudad: userProfile.city || null,
        pais: userProfile.country || null
      }

      // Actualizar datos del perfil en la tabla 'usuarios'
      const { data, error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('email', storedEmail)
        .select()
        .maybeSingle()

      if (error) {
        console.error('[Perfil] Error al actualizar perfil en tabla usuarios:', error)
        alert('Error al actualizar el perfil en la base de datos')
        return
      }

      // Actualizar nombre para mostrar y teléfono en Supabase Auth (user_metadata)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: userProfile.name || undefined,
          name: userProfile.name || undefined,
          Phone: userProfile.phone || undefined,
        }
      })

      if (authError) {
        console.warn('[Perfil] No se pudo actualizar datos en Supabase Auth:', authError)
      }

      // Sincronizar storedEmail si el email cambió
      if (userProfile.email && userProfile.email !== storedEmail) {
        try {
          localStorage.setItem('vira_user_email', userProfile.email)
          setStoredEmail(userProfile.email)
          window.dispatchEvent(new CustomEvent('vira:email', { detail: { email: userProfile.email } }))
        } catch (err) {
          console.warn('[Perfil] No se pudo sincronizar storedEmail con el nuevo email:', err)
        }
      }

      setIsEditingProfile(false)
      alert('Perfil actualizado exitosamente')
    } catch (error) {
      console.error('[Perfil] Error inesperado al guardar el perfil:', error)
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
      setNewUser({ name: '', email: '', role: 'administrador', sendInvite: true })
      alert('Usuario creado exitosamente. Se ha enviado una invitación por email.')
    } catch (error) {
      alert('Error al crear el usuario')
    } finally {
      setIsLoading(false)
    }
  }

  // Nuevo: agregar usuario desde el formulario inferior (email + contraseña)
  const handleAddUser = async () => {
    if (!addUserEmail || !addUserPassword || !addUserRole) {
      alert('Por favor completa el email, la contraseña y el rol')
      return
    }
    
    setIsLoading(true)
    try {
      // Insertar nuevo usuario en la tabla 'usuarios' con campos vacíos para los no gestionados por el super-administrador
      const { data, error } = await supabase
        .from('usuarios')
        .insert([
          {
            email: addUserEmail,
            contraseña: addUserPassword,
            rol: addUserRole,
            telefono: '',
            empresa: '',
            nombre_completo: '',
            direccion: '',
            ciudad: '',
            pais: '',
            estado: null,
          },
        ])
        .select()
        .maybeSingle()
  
      if (error) {
        console.error('[Perfil] Error al insertar usuario en Supabase:', error)
        alert('Error al agregar usuario')
        return
      }
  
      // Limpiar formulario
      setAddUserEmail('')
      setAddUserPassword('')
      setAddUserRole('administrador')
  
      alert('Usuario agregado exitosamente.')
    } catch (error) {
      console.error('[Perfil] Error al agregar usuario:', error)
      alert('Error al agregar usuario')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCompany = async () => {
    if (!newCompany.razon_social || !newCompany.rut || !newCompany.email) {
      alert('Por favor completa la razón social, RUT y email')
      return
    }
    
    // Parse integrantes from JSON string
    let integrantesArray = []
    if (integrantesInput.trim()) {
      try {
        integrantesArray = JSON.parse(integrantesInput)
      } catch (error) {
        alert('El formato de integrantes no es válido. Debe ser un JSON válido.')
        return
      }
    }
    
    setIsLoading(true)
    try {
      // Insertar nueva empresa en la tabla 'facturacion'
      const { data, error } = await supabase
        .from('facturacion')
        .insert([
          {
            razon_social: newCompany.razon_social,
            rut: newCompany.rut,
            direccion: newCompany.direccion,
            ciudad: newCompany.ciudad,
            pais: newCompany.pais,
            codigo_postal: newCompany.codigo_postal,
            telefono: newCompany.telefono,
            email: newCompany.email,
            integrantes: integrantesArray
          },
        ])
        .select()
        .maybeSingle()
  
      if (error) {
        console.error('[Perfil] Error al insertar empresa en Supabase:', error)
        alert('Error al agregar empresa')
        return
      }
  
      // Limpiar formulario
      setNewCompany({
        razon_social: '',
        rut: '',
        direccion: '',
        ciudad: '',
        pais: '',
        codigo_postal: '',
        telefono: '',
        email: '',
        integrantes: []
      })
      setIntegrantesInput('')
      
      // Cerrar modal
      setIsAddCompanyOpen(false)
      
      // Actualizar lista de empresas
      const { data: updatedData, error: fetchError } = await supabase
        .from('facturacion')
        .select('*')
      
      if (!fetchError) {
        setTodosFacturacionRegistros(Array.isArray(updatedData) ? updatedData : [])
      }
  
      alert('Empresa agregada exitosamente.')
    } catch (error) {
      console.error('[Perfil] Error al agregar empresa:', error)
      alert('Error al agregar empresa')
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
                      onChange={(e) => {
                        const newName = e.target.value
                        setUserProfile(prev => ({ ...prev, name: newName }))
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
                      onChange={(e) => {
                        const newEmail = e.target.value
                        setUserProfile(prev => ({ ...prev, email: newEmail }))
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
                      onChange={(e) => {
                        const newPhone = e.target.value
                        setUserProfile(prev => ({ ...prev, phone: newPhone }))
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
                      onChange={(e) => {
                        const newCompany = e.target.value
                        setUserProfile(prev => ({ ...prev, company: newCompany }))
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
                      onChange={(e) => {
                        const newAddress = e.target.value
                        setUserProfile(prev => ({ ...prev, address: newAddress }))
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
                      onChange={(e) => {
                        const newCity = e.target.value
                        setUserProfile(prev => ({ ...prev, city: newCity }))
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
                      onChange={(e) => {
                        const newCountry = e.target.value
                        setUserProfile(prev => ({ ...prev, country: newCountry }))
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
                <CardTitle>Datos de Facturación
                {facturacionRegistros.length > 0 && (() => {
                  const info = mapRecordToBillingInfo(facturacionRegistros[0])
                  return (
                    <span className="ml-2 text-base text-gray-700">
                      • {info.legalName || 'Sin razón social'}
                      {info.taxId ? ` — RUT: ${info.taxId}` : ''}
                    </span>
                  )
                })()}
                </CardTitle>
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
                        <SelectValue  />
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

            {/* Lista de todos los registros de facturación - Solo para super-administradores */}
            {userProfile.role === 'super-administrador' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Empresas que Facturan</CardTitle>
                  <p className="text-sm text-gray-600">
                    Lista de todas las empresas registradas en el sistema de facturación
                  </p>
                </div>
                <Button onClick={() => setIsAddCompanyOpen(true)} className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Añadir Empresa</span>
                </Button>
              </CardHeader>
              <CardContent>
                {todosFacturacionRegistros.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No hay empresas registradas en el sistema</p>
                ) : (
                  <div className="space-y-4">
                    {todosFacturacionRegistros.map((registro, index) => (
                      <div
                        key={registro.id || index}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID</Label>
                            <p className="text-sm font-medium text-gray-900">{registro.id || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Razón Social</Label>
                            <p className="text-sm text-gray-900">{registro.razon_social || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">RUT</Label>
                            <p className="text-sm text-gray-900">{registro.rut || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dirección</Label>
                            <p className="text-sm text-gray-900">{registro.direccion || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ciudad</Label>
                            <p className="text-sm text-gray-900">{registro.ciudad || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">País</Label>
                            <p className="text-sm text-gray-900">{registro.pais || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</Label>
                            <p className="text-sm text-gray-900">{registro.telefono || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</Label>
                            <p className="text-sm text-gray-900">{registro.email || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha de Creación</Label>
                            <p className="text-sm text-gray-900">
                              {registro.created_at ? new Date(registro.created_at).toLocaleDateString('es-CL') : 'N/A'}
                            </p>
                          </div>
                          {registro.integrantes && (
                            <div className="md:col-span-2 lg:col-span-3">
                              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Integrantes</Label>
                              <div className="text-sm text-gray-900 mt-1">
                                {Array.isArray(registro.integrantes) ? (
                                  <div className="flex flex-wrap gap-2">
                                    {registro.integrantes.map((integrante: { Correo?: string }, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {integrante.Correo || JSON.stringify(integrante)}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-600">
                                    {typeof registro.integrantes === 'string' 
                                      ? registro.integrantes 
                                      : JSON.stringify(registro.integrantes)
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Modal para agregar nueva empresa */}
            <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Agregar Nueva Empresa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Razón Social *</Label>
                      <Input
                        value={newCompany.razon_social}
                        onChange={(e) => setNewCompany({...newCompany, razon_social: e.target.value})}
                        placeholder="Empresa S.A."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">RUT *</Label>
                      <Input
                        value={newCompany.rut}
                        onChange={(e) => setNewCompany({...newCompany, rut: e.target.value})}
                        placeholder="12.345.678-9"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Dirección</Label>
                    <Input
                      value={newCompany.direccion}
                      onChange={(e) => setNewCompany({...newCompany, direccion: e.target.value})}
                      placeholder="Av. Principal 123"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Ciudad</Label>
                      <Input
                        value={newCompany.ciudad}
                        onChange={(e) => setNewCompany({...newCompany, ciudad: e.target.value})}
                        placeholder="Santiago"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">País</Label>
                      <Input
                        value={newCompany.pais}
                        onChange={(e) => setNewCompany({...newCompany, pais: e.target.value})}
                        placeholder="Chile"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Código Postal</Label>
                      <Input
                        value={newCompany.codigo_postal}
                        onChange={(e) => setNewCompany({...newCompany, codigo_postal: e.target.value})}
                        placeholder="8320000"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Teléfono</Label>
                      <Input
                        value={newCompany.telefono}
                        onChange={(e) => setNewCompany({...newCompany, telefono: e.target.value})}
                        placeholder="+56 9 1234 5678"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Email *</Label>
                      <Input
                        type="email"
                        value={newCompany.email}
                        onChange={(e) => setNewCompany({...newCompany, email: e.target.value})}
                        placeholder="contacto@empresa.com"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Integrantes</Label>
                    <Textarea
                      value={integrantesInput}
                      onChange={(e) => setIntegrantesInput(e.target.value)}
                      placeholder='[{"Correo": "usuario1@empresa.com"}, {"Correo": "usuario2@empresa.com"}]'
                      className="mt-1"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Formato JSON con los correos de los integrantes de la empresa
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <Button 
                      variant="outline"
                      onClick={() => setIsAddCompanyOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddCompany}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Agregando...' : 'Agregar Empresa'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                            <SelectItem value="administrador">Administrador</SelectItem>
                            <SelectItem value="super-administrador">Super Administrador</SelectItem>
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
        {userProfile.role === 'super-administrador' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Agregar Usuario</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Crea un nuevo usuario proporcionando su email y una contraseña.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Email</Label>
                <Input
                  type="email"
                  value={addUserEmail}
                  onChange={(e) => setAddUserEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Contraseña</Label>
                <Input
                  type="password"
                  value={addUserPassword}
                  onChange={(e) => setAddUserPassword(e.target.value)}
                  className="mt-1"
                  placeholder="Ingresa una contraseña"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Rol</Label>
                <Select value={addUserRole} onValueChange={(value) => setAddUserRole(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrador">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddUser} disabled={isLoading || !addUserEmail || !addUserPassword || !addUserRole}>
                  {isLoading ? 'Agregando...' : 'Agregar Usuario'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
