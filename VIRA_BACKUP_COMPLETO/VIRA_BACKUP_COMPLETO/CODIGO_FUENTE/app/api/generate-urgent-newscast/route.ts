
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createNewsReport, logTokenUsage } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { news, timeFrame, region, priority } = await request.json()

    // Validaciones
    if (!news || !Array.isArray(news) || news.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron noticias para el noticiero' },
        { status: 400 }
      )
    }

    console.log('Generating urgent newscast:', {
      newsCount: news.length,
      timeFrame,
      region,
      priority
    })

    // Ordenar noticias por urgencia (urgentes primero)
    const sortedNews = news.sort((a: any, b: any) => {
      const urgencyOrder: Record<string, number> = { 'high': 3, 'medium': 2, 'low': 1 }
      return (urgencyOrder[b.urgency] || 1) - (urgencyOrder[a.urgency] || 1)
    })

    // Generar timeline específico para noticias urgentes
    const timeline = []
    let totalDuration = 0

    // 1. Introducción urgente
    const introText = generateUrgentIntro(timeFrame, region, sortedNews.length)
    timeline.push({
      id: 'intro',
      type: 'intro',
      content: introText,
      duration: 15,
      timestamp: totalDuration
    })
    totalDuration += 15

    // 2. Cortina musical (más corta para urgencia)
    timeline.push({
      id: 'intro_music',
      type: 'music',
      content: 'Cortina de entrada - Noticiero urgente',
      audioFile: 'intro_urgent.mp3',
      duration: 5,
      timestamp: totalDuration
    })
    totalDuration += 5

    // 3. Procesar noticias urgentes (máximo 8 para mantener brevedad)
    const selectedNews = sortedNews.slice(0, 8)
    
    for (let i = 0; i < selectedNews.length; i++) {
      const newsItem = selectedNews[i]
      
      // Contenido de la noticia optimizado para urgencia
      const newsContent = generateUrgentNewsContent(newsItem, i + 1)
      const estimatedDuration = Math.min(Math.max(newsContent.length / 20, 30), 90) // 30-90 segundos

      timeline.push({
        id: `news_${i + 1}`,
        type: 'news',
        content: newsContent,
        duration: estimatedDuration,
        timestamp: totalDuration,
        metadata: {
          originalTitle: newsItem.title,
          source: newsItem.source,
          urgency: newsItem.urgency,
          category: newsItem.category,
          region: newsItem.region
        }
      })
      totalDuration += estimatedDuration

      // Separador entre noticias (más corto)
      if (i < selectedNews.length - 1) {
        timeline.push({
          id: `separator_${i + 1}`,
          type: 'separator',
          content: 'Pausa breve',
          duration: 2,
          timestamp: totalDuration
        })
        totalDuration += 2
      }
    }

    // 4. Resumen ejecutivo
    const summaryText = generateUrgentSummary(selectedNews, region)
    timeline.push({
      id: 'summary',
      type: 'summary',
      content: summaryText,
      duration: 20,
      timestamp: totalDuration
    })
    totalDuration += 20

    // 5. Cierre urgente
    const outroText = generateUrgentOutro(timeFrame)
    timeline.push({
      id: 'outro',
      type: 'outro',
      content: outroText,
      duration: 10,
      timestamp: totalDuration
    })
    totalDuration += 10

    // 6. Cortina de salida
    timeline.push({
      id: 'outro_music',
      type: 'music',
      content: 'Cortina de salida - Noticiero urgente',
      audioFile: 'outro_urgent.mp3',
      duration: 5,
      timestamp: totalDuration
    })
    totalDuration += 5

    // Crear el reporte en Supabase
    const reportTitle = `🔴 ÚLTIMO MINUTO - ${region} (${new Date().toLocaleDateString('es-CL')})`
    const reportContent = timeline.filter(item => item.type === 'news' || item.type === 'intro' || item.type === 'summary' || item.type === 'outro')
      .map(item => item.content).join('\n\n')

    const newsReport = await createNewsReport({
      title: reportTitle,
      content: reportContent,
      timeline_data: timeline,
      duration_seconds: totalDuration,
      status: 'generated',
      generation_cost: 0,
      token_count: 0,
      metadata: {
        type: 'urgent',
        priority,
        region,
        timeFrame,
        newsCount: selectedNews.length,
        totalUrgentNews: sortedNews.filter(n => n.urgency === 'high').length,
        processingMethod: 'urgent-breaking-news',
        generatedAt: new Date().toISOString()
      },
      user_id: session.user.id
    })

    const reportId = newsReport?.id || null

    // Log de uso para métricas
    await logTokenUsage({
      user_id: session.user.id,
      service: 'vira-urgent',
      operation: 'urgent_newscast_generation',
      tokens_used: selectedNews.length,
      cost: 0,
      currency: 'USD',
      metadata: {
        report_id: reportId,
        priority,
        region,
        timeFrame,
        news_count: selectedNews.length
      }
    })

    console.log('Urgent newscast generation completed:', {
      reportId,
      totalDuration,
      itemCount: timeline.length,
      newsProcessed: selectedNews.length
    })

    return NextResponse.json({
      success: true,
      timeline,
      report_id: reportId,
      metadata: {
        totalDuration,
        newsCount: selectedNews.length,
        urgentCount: sortedNews.filter(n => n.urgency === 'high').length,
        region,
        priority,
        timeFrame,
        generatedAt: new Date().toISOString(),
        type: 'urgent-breaking-news'
      }
    })

  } catch (error) {
    console.error('Error generating urgent newscast:', error)
    return NextResponse.json(
      { success: false, error: 'Error al generar noticiero urgente' },
      { status: 500 }
    )
  }
}

// Generar introducción urgente
function generateUrgentIntro(timeFrame: string, region: string, newsCount: number): string {
  const now = new Date()
  const timeString = now.toLocaleTimeString('es-CL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  return `🔴 ATENCIÓN: Noticiero de último minuto. Son las ${timeString} horas y le traemos ${newsCount} noticias urgentes de las últimas ${timeFrame} horas en ${region}. Manténgase informado con los acontecimientos más importantes que están ocurriendo en estos momentos.`
}

// Generar contenido optimizado para noticias urgentes
function generateUrgentNewsContent(newsItem: any, index: number): string {
  const urgencyPrefix = newsItem.urgency === 'high' ? '🚨 URGENTE: ' : 
                       newsItem.urgency === 'medium' ? '⚡ IMPORTANTE: ' : '📢 '

  let content = `${urgencyPrefix}${newsItem.title}. `

  // Agregar resumen conciso
  if (newsItem.summary) {
    content += `${newsItem.summary} `
  }

  // Agregar información de ubicación si es relevante
  if (newsItem.region && newsItem.region !== 'nacional') {
    content += `Esto ocurre en la región de ${newsItem.region}. `
  }

  // Agregar llamada a acción si es urgente
  if (newsItem.urgency === 'high') {
    content += 'Las autoridades recomiendan mantenerse atentos a nuevas actualizaciones. '
  }

  return content
}

// Generar resumen ejecutivo para cierre
function generateUrgentSummary(news: any[], region: string): string {
  const urgentCount = news.filter(n => n.urgency === 'high').length
  const categories = [...new Set(news.map(n => n.category))].slice(0, 3).join(', ')

  return `En resumen, en las últimas horas hemos cubierto ${news.length} noticias importantes para ${region}, ${urgentCount > 0 ? `incluyendo ${urgentCount} de carácter urgente` : 'manteniendo la información actualizada'}. Las principales áreas de atención han sido: ${categories}. Continuaremos monitoreando la situación.`
}

// Generar cierre urgente
function generateUrgentOutro(timeFrame: string): string {
  const now = new Date()
  const timeString = now.toLocaleTimeString('es-CL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  return `Este ha sido su noticiero de último minuto a las ${timeString} horas. Continuamos monitoreando las noticias de las últimas ${timeFrame} horas. Manténgase conectado para más actualizaciones.`
}
