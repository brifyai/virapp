
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // Validaciones básicas
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // En desarrollo/demo, simplemente simular que el usuario se creó exitosamente
    // En producción aquí crearías el usuario en tu base de datos real
    
    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name: name || email.split('@')[0],
      role: 'user',
      createdAt: new Date().toISOString()
    }

    // Simular tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'Usuario creado exitosamente'
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
