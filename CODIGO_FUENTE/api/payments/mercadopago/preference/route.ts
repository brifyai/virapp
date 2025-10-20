
import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoService } from '@/lib/mercadopago-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      planId, 
      planName, 
      planPrice, 
      planDescription,
      userEmail 
    } = body

    // Validar datos requeridos
    if (!planId || !planName || !planPrice) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      )
    }

    // Crear preferencia de pago en MercadoPago
    const preference = await MercadoPagoService.createPreference({
      title: planName,
      description: planDescription || `Suscripción ${planName}`,
      unit_price: planPrice,
      quantity: 1,
      currency_id: 'CLP',
      payer_email: userEmail || session.user?.email || '',
      external_reference: `plan_${planId}_user_${session.user?.email}`,
      metadata: {
        plan_id: planId,
        user_email: session.user?.email,
        type: 'subscription'
      }
    })

    if (!preference.success) {
      return NextResponse.json(
        { error: 'Error al crear preferencia de pago' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      preference_id: preference.data?.id,
      init_point: preference.data?.init_point,
      sandbox_init_point: preference.data?.sandbox_init_point
    })

  } catch (error) {
    console.error('Error en API de preferencia MercadoPago:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
