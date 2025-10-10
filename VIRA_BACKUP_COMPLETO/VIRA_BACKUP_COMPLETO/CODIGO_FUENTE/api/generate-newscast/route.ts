
import { NextRequest, NextResponse } from 'next/server'
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
      region, 
      radio, 
      targetDuration, 
      selectedSources, 
      includeCategories,
      style,
      tone,
      length 
    } = body

    // Validar datos requeridos
    if (!region || !radio || !targetDuration) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      )
    }

    // Simular el proceso de generación de noticiero
    // En producción, aquí se haría el scraping real, procesamiento de IA, etc.
    
    console.log('Generando noticiero:', {
      region,
      radio,
      targetDuration,
      selectedSources,
      includeCategories,
      style,
      tone,
      length
    })

    // Simular tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Calcular costo del noticiero (usando proveedores por defecto si no se especifica)
    const costs = calculateNewscastCost({
      targetDuration,
      selectedSources,
      includeCategories,
      includeWeather: includeCategories?.includes('clima'),
      includeTime: includeCategories?.includes('hora'),
      audioGeneration: true,
      providers: body.providers || {
        scraping: 'advanced',
        rewriting: 'llama3-70b-8192', 
        humanization: 'llama3-70b-8192',
        audioGeneration: 'openai-tts'
      }
    })

    // Generar ID único para el noticiero
    const newscastId = `newscast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // En producción, aquí se guardaría en la base de datos
    const newscast = {
      id: newscastId,
      title: `Noticiero ${radio} - ${new Date().toLocaleDateString('es-CL')}`,
      region,
      radio,
      duration: targetDuration,
      categories: includeCategories,
      style,
      tone,
      length,
      status: 'completed',
      createdAt: new Date().toISOString(),
      cost: costs,
      // URLs simuladas - en producción serían URLs reales
      audioUrl: `/audio/${newscastId}.mp3`,
      transcriptUrl: `/transcripts/${newscastId}.txt`,
      metadata: {
        sources: selectedSources?.length || 0,
        newsCount: Math.floor(Math.random() * 10) + 5,
        processingTime: '3.2s'
      }
    }

    return NextResponse.json({
      success: true,
      newscast,
      message: 'Noticiero generado exitosamente'
    })

  } catch (error) {
    console.error('Error generando noticiero:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

function calculateNewscastCost(options: {
  targetDuration: number
  selectedSources?: string[]
  includeCategories?: string[]
  includeWeather: boolean
  includeTime: boolean
  audioGeneration: boolean
  providers?: {
    scraping: string
    rewriting: string
    humanization: string
    audioGeneration: string
  }
}) {
  const {
    targetDuration,
    selectedSources = [],
    includeCategories = [],
    includeWeather,
    includeTime,
    audioGeneration,
    providers
  } = options

  // Definición de proveedores y costos REALES (precios Septiembre 2025)
  const serviceProviders = {
    scraping: {
      basic: { costPerSource: 5 },
      advanced: { costPerSource: 15 },
      premium: { costPerSource: 30 }
    },
    
    rewriting: {
      'llama3-8b-8192': { costPerNews: 0.1 },
      'llama3-70b-8192': { costPerNews: 0.8 },
      'mixtral-8x7b-32768': { costPerNews: 0.5 },
      'gpt-3.5-turbo': { costPerNews: 2 },
      'gpt-4.1-mini': { costPerNews: 1 },
      'gpt-4-turbo': { costPerNews: 25 },
      'claude-3-haiku': { costPerNews: 3 },
      'claude-3-sonnet': { costPerNews: 12 },
      'claude-3-opus': { costPerNews: 60 }
    },

    humanization: {
      'llama3-8b-8192': { costPerNews: 0.08 },
      'llama3-70b-8192': { costPerNews: 0.6 },
      'mixtral-8x7b-32768': { costPerNews: 0.4 },
      'gpt-3.5-turbo': { costPerNews: 1.5 },
      'gpt-4.1-mini': { costPerNews: 0.8 },
      'gpt-4-turbo': { costPerNews: 20 },
      'claude-3-haiku': { costPerNews: 2 },
      'claude-3-sonnet': { costPerNews: 8 },
      'claude-3-opus': { costPerNews: 40 }
    },

    audioGeneration: {
      'edge-tts': { costPerMinute: 0 },
      'polly': { costPerMinute: 8 },
      'azure-speech': { costPerMinute: 8 },
      'openai-tts': { costPerMinute: 35 },
      'elevenlabs': { costPerMinute: 180 },
      'abacus-elevenlabs': { costPerMinute: 150 }
    }
  }

  const baseProcessingCost = 25

  // Estimar número de noticias basado en duración (aprox 1 noticia por 30 segundos)
  const estimatedNewsCount = Math.ceil(targetDuration / 30)
  const audioMinutes = Math.ceil(targetDuration / 60)

  // Calcular costos usando los proveedores seleccionados
  const scrapingProvider = providers?.scraping || 'advanced'
  const rewritingProvider = providers?.rewriting || 'llama3-70b-8192'
  const humanizationProvider = providers?.humanization || 'llama3-70b-8192'
  const audioProvider = providers?.audioGeneration || 'openai-tts'

  const scrapingCost = selectedSources.length * (serviceProviders.scraping[scrapingProvider as keyof typeof serviceProviders.scraping]?.costPerSource || 15)
  const rewritingCost = estimatedNewsCount * (serviceProviders.rewriting[rewritingProvider as keyof typeof serviceProviders.rewriting]?.costPerNews || 0.8)
  const humanizationCost = estimatedNewsCount * (serviceProviders.humanization[humanizationProvider as keyof typeof serviceProviders.humanization]?.costPerNews || 0.6)
  const audioCost = audioGeneration ? audioMinutes * (serviceProviders.audioGeneration[audioProvider as keyof typeof serviceProviders.audioGeneration]?.costPerMinute || 35) : 0

  // Costos adicionales fijos
  const weatherCost = includeWeather ? 15 : 0
  const timeCost = includeTime ? 5 : 0

  const totalCost = baseProcessingCost + scrapingCost + rewritingCost + humanizationCost + weatherCost + timeCost + audioCost

  return {
    breakdown: {
      baseProcessing: baseProcessingCost,
      scraping: scrapingCost,
      rewriting: rewritingCost,
      humanization: humanizationCost,
      weather: weatherCost,
      time: timeCost,
      audioGeneration: audioCost
    },
    providers: {
      scraping: scrapingProvider,
      rewriting: rewritingProvider,  
      humanization: humanizationProvider,
      audioGeneration: audioProvider
    },
    total: totalCost,
    estimatedNewsCount,
    audioMinutes,
    sourcesCount: selectedSources.length
  }
}
