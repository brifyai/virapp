
import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoService } from '@/lib/mercadopago-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Procesar el webhook
    const result = await MercadoPagoService.processWebhook(body)
    
    if (result.success) {
      // Aquí puedes agregar lógica adicional:
      // - Actualizar estado de suscripción en base de datos
      // - Enviar email de confirmación al usuario
      // - Registrar el pago en el historial
      // - Activar funcionalidades del plan
      
      console.log('Pago procesado exitosamente:', result.payment)
      
      return NextResponse.json({ received: true })
    } else {
      console.error('Error procesando webhook:', result.error)
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
  } catch (error) {
    console.error('Error en webhook MercadoPago:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
