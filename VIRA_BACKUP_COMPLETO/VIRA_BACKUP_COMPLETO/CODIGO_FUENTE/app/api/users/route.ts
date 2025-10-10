
import { NextRequest, NextResponse } from 'next/server'

// Simulación de base de datos de usuarios
const users = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@radioexample.cl',
    role: 'admin',
    company: 'Radio Ejemplo FM',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    lastLogin: '2024-09-05T10:30:00Z'
  },
  {
    id: '2',
    name: 'María González',
    email: 'maria@radioexample.cl',
    role: 'operator',
    company: 'Radio Ejemplo FM',
    isActive: true,
    createdAt: '2024-02-01T14:20:00Z',
    lastLogin: '2024-09-04T09:15:00Z'
  },
  {
    id: '3',
    name: 'Carlos Rodríguez',
    email: 'carlos@radioexample.cl',
    role: 'user',
    company: 'Radio Ejemplo FM',
    isActive: true,
    createdAt: '2024-03-10T16:45:00Z',
    lastLogin: '2024-09-03T11:22:00Z'
  }
]

export async function GET(request: NextRequest) {
  try {
    // En desarrollo, simular usuario admin autenticado
    const mockSession = { user: { email: 'admin@vira.cl', role: 'admin' } }
    
    if (!mockSession) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo los admins pueden ver todos los usuarios
    const currentUser = users.find(u => u.email === mockSession.user?.email)
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    return NextResponse.json({ users })

  } catch (error) {
    console.error('Error obteniendo usuarios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // En desarrollo, simular usuario admin autenticado
    const mockSession = { user: { email: 'admin@vira.cl', role: 'admin' } }
    
    if (!mockSession) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo los admins pueden crear usuarios
    const currentUser = users.find(u => u.email === mockSession.user?.email) || { role: 'admin', company: 'VIRA' }
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const { name, email, role, sendInvite } = await request.json()

    // Validaciones básicas
    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    if (!['admin', 'operator', 'user'].includes(role)) {
      return NextResponse.json(
        { error: 'Rol inválido' },
        { status: 400 }
      )
    }

    // Verificar si el email ya existe
    if (users.find(u => u.email === email)) {
      return NextResponse.json(
        { error: 'El email ya está en uso' },
        { status: 400 }
      )
    }

    // Crear nuevo usuario
    const newUser = {
      id: (users.length + 1).toString(),
      name,
      email,
      role,
      company: currentUser?.company || 'VIRA',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    }

    users.push(newUser)

    // En producción, aquí enviarías un email de invitación
    if (sendInvite) {
      console.log(`Enviando invitación a: ${email}`)
      // await sendInvitationEmail(newUser)
    }

    return NextResponse.json({ 
      user: newUser,
      message: 'Usuario creado exitosamente' 
    })

  } catch (error) {
    console.error('Error creando usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
