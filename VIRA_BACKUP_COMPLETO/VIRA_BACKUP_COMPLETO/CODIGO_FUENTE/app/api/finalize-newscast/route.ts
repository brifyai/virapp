

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

interface TimelineItem {
  id: string
  title: string
  content: string
  processedContent?: string
  type?: string
  category?: string
  duration: number
  hasAudio: boolean
  audioUrl?: string
  actualDuration?: number
  transitionType: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Para desarrollo: usar usuario demo si no hay sesión
    const userId = session?.user?.id || 'demo-user-vira-dev'
    
    const { timelineId, timeline, backgroundMusic, autoSound, outputFormat, bitrate } = await request.json()
    
    // Validaciones
    if (!timeline || !Array.isArray(timeline) || timeline.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Timeline vacío o inválido' },
        { status: 400 }
      )
    }
    
    // Verificar que todos los elementos tengan audio
    const missingAudio = timeline.filter((item: TimelineItem) => 
      !item.hasAudio && item.type !== 'transition'
    )
    
    if (missingAudio.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Faltan elementos con audio generado',
          missingItems: missingAudio.map((item: TimelineItem) => item.title)
        },
        { status: 400 }
      )
    }
    
    console.log(`Finalizing newscast ${timelineId} for user ${userId}`)
    
    // Simular proceso de masterización
    const totalDuration = timeline.reduce((sum: number, item: TimelineItem) => 
      sum + (item.actualDuration || item.duration), 0
    )
    
    // Generar nombre de archivo único
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `noticiero_${timelineId}_${timestamp}.${outputFormat || 'mp3'}`
    
    // Simular procesamiento (en producción aquí iría la lógica real de masterización)
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simular 2 segundos de procesamiento
    
    // Simular datos del archivo final
    const estimatedSize = totalDuration * 32000 // ~32KB por segundo para MP3 192kbps
    const downloadUrl = `/api/download/newscast_${timelineId}` // URL simulada
    
    // Metadata del proceso
    const masteringMetadata = {
      timelineId,
      userId,
      totalItems: timeline.length,
      totalDuration,
      backgroundMusic: backgroundMusic || 'Ninguna',
      autoSound,
      outputFormat: outputFormat || 'mp3',
      bitrate: bitrate || '192',
      processing: {
        audioNormalization: true,
        noiseReduction: autoSound,
        fadeInOut: true,
        backgroundMusicDucking: backgroundMusic !== 'Ninguna'
      },
      createdAt: new Date().toISOString()
    }
    
    console.log('Newscast finalized:', masteringMetadata)
    
    // En producción, aquí guardarías el archivo procesado y subirías a S3 o CDN
    
    return NextResponse.json({
      success: true,
      filename,
      duration: totalDuration,
      size: estimatedSize,
      downloadUrl,
      bitrate: bitrate || '192',
      format: outputFormat || 'mp3',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      metadata: masteringMetadata,
      processing: {
        itemsProcessed: timeline.length,
        audioFilesUsed: timeline.filter((item: TimelineItem) => item.hasAudio).length,
        backgroundMusicApplied: backgroundMusic !== 'Ninguna',
        autoSoundEnabled: autoSound,
        totalProcessingTime: '2.3 segundos',
        compressionRatio: '4:1',
        finalBitrate: `${bitrate || '192'} kbps`
      }
    })
    
  } catch (error) {
    console.error('Error finalizing newscast:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno al finalizar el noticiero',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Endpoint para descargar el archivo finalizado (simulado)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const fileId = url.pathname.split('/').pop()
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'ID de archivo requerido' },
        { status: 400 }
      )
    }
    
    // En producción, aquí descargarías el archivo real desde S3 o CDN
    // Por ahora, simularemos una descarga exitosa
    
    return NextResponse.json({
      success: true,
      message: 'Archivo listo para descarga',
      fileId,
      downloadUrl: `https://storage.vira.cl/newscasts/${fileId}.mp3`,
      status: 'ready'
    })
    
  } catch (error) {
    console.error('Error in download endpoint:', error)
    return NextResponse.json(
      { error: 'Error al procesar descarga' },
      { status: 500 }
    )
  }
}
