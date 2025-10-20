
import { NextRequest, NextResponse } from 'next/server'
import { TTSProviderFactory } from '@/lib/tts-providers'
import { getDownloadUrl } from '@/lib/s3'

// Real síntesis de voz usando múltiples proveedores
interface TTSRequest {
  text: string
  provider?: 'openai' | 'elevenlabs' | 'azure' | 'polly' | 'edge' | 'auto'
  voice?: string
  speed?: number
  format?: 'mp3' | 'wav' | 'ogg'
  // Opciones específicas por proveedor
  stability?: number
  similarityBoost?: number
  rate?: string
  pitch?: string
}

// Función auxiliar para mapear opciones por proveedor
function getProviderOptions(provider: string, request: TTSRequest) {
  switch (provider) {
    case 'elevenlabs':
      return {
        voice: request.voice || 'Adam',
        stability: request.stability || 0.5,
        similarityBoost: request.similarityBoost || 0.8,
        style: 0.0
      }
    case 'azure':
      return {
        voice: request.voice || 'es-CL-CatalinaNeural',
        rate: request.rate || '+0%',
        pitch: request.pitch || '+0Hz'
      }
    case 'openai':
      return {
        voice: request.voice || 'nova',
        model: 'tts-1',
        speed: request.speed || 1.0
      }
    case 'polly':
      return {
        voice: request.voice || 'Conchita',
        engine: 'neural',
        outputFormat: request.format || 'mp3'
      }
    case 'edge':
      return {
        voice: request.voice || 'es-CL-CatalinaNeural',
        rate: request.rate || '+0%',
        pitch: request.pitch || '+0Hz'
      }
    default:
      return {}
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestData: TTSRequest = await request.json()
    const { text, provider = 'auto', format = 'mp3' } = requestData
    
    // Validaciones básicas
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Texto requerido para síntesis' },
        { status: 400 }
      )
    }
    
    if (text.length > 4000) {
      return NextResponse.json(
        { success: false, error: 'Texto demasiado largo (máximo 4000 caracteres)' },
        { status: 400 }
      )
    }

    // MODO DESARROLLADOR - Simular síntesis de voz exitosa
    console.log(`🎙️ [MODO DESARROLLADOR] Simulando síntesis de voz: ${text.length} caracteres`)
    
    // Simular procesamiento
    const startTime = Date.now()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simular 1 segundo de procesamiento
    const processingTime = Date.now() - startTime
    
    // Estimar duración basada en el texto (aproximadamente 150 palabras por minuto)
    const words = text.trim().split(/\s+/).length
    const estimatedDuration = Math.max(5, Math.round((words / 150) * 60)) // mínimo 5 segundos
    
    // Generar URL simulada
    const mockAudioUrl = `https://cdn.example.com/mock-audio/${Date.now()}.mp3`
    
    console.log(`✅ [MODO DESARROLLADOR] Audio simulado generado: ${estimatedDuration}s`)
    
    const response = {
      success: true,
      provider: 'mock-provider',
      voice: requestData.voice || 'mock-voice',
      duration: estimatedDuration,
      audioUrl: mockAudioUrl,
      s3Key: `mock/audio-${Date.now()}.mp3`,
      format: format,
      metadata: {
        textLength: text.length,
        processingTime,
        estimatedCost: 0,
        provider: 'Mock Provider (Desarrollo)',
        configuredProviders: ['Mock Provider'],
        synthesizedAt: new Date().toISOString(),
        developmentMode: true,
        note: 'Audio simulado para modo desarrollador'
      }
    }

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('TTS API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido en síntesis de voz',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

// Endpoint para obtener proveedores disponibles
export async function GET() {
  try {
    const allProviders = TTSProviderFactory.getAllProviders()
    const configuredProviders = TTSProviderFactory.getAvailableProviders()
    const bestProvider = TTSProviderFactory.getBestProvider()

    const providersInfo = allProviders.map(provider => ({
      name: provider.name,
      id: provider.name.toLowerCase().replace(' ', ''),
      configured: provider.isConfigured(),
      estimatedCost: provider.estimateCost(1000), // Costo por 1000 caracteres
      recommended: provider.name === bestProvider.name
    }))

    return NextResponse.json({
      success: true,
      providers: providersInfo,
      totalProviders: allProviders.length,
      configuredProviders: configuredProviders.length,
      bestProvider: bestProvider.name,
      notes: {
        auto: 'Usa "auto" como provider para selección automática del mejor proveedor disponible',
        fallback: 'Edge TTS se usa como fallback gratuito si otros proveedores no están configurados'
      }
    })
  } catch (error) {
    console.error('Error getting TTS providers info:', error)
    return NextResponse.json(
      { success: false, error: 'Error obteniendo información de proveedores' },
      { status: 500 }
    )
  }
}
