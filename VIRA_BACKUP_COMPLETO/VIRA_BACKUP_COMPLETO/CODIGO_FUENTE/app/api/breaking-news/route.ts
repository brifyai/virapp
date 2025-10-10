
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase, createScrapedNews } from '@/lib/supabase'
import { getBreakingNews } from '@/lib/breaking-news-scraper'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { timeFrame, region, category, urgentOnly } = await request.json()

    // Validar parámetros
    if (!timeFrame || timeFrame < 1 || timeFrame > 168) { // máximo 1 semana
      return NextResponse.json(
        { success: false, error: 'Período de tiempo inválido' },
        { status: 400 }
      )
    }

    // Calcular fecha de inicio basada en el timeFrame
    const startDate = new Date()
    startDate.setHours(startDate.getHours() - timeFrame)

    console.log('Buscando noticias de último minuto:', {
      timeFrame: `${timeFrame} horas`,
      region,
      category,
      urgentOnly
    })

    // Usar el nuevo scraper avanzado
    const breakingNewsItems = await getBreakingNews({
      timeFrameHours: timeFrame,
      region: region === 'all' ? undefined : region,
      category: category === 'all' ? undefined : category,
      urgentOnly,
      maxResults: 50
    })

    console.log(`Found ${breakingNewsItems.length} breaking news items`)

    // Guardar noticias en base de datos y formatear respuesta
    const allNews = []
    
    for (const newsItem of breakingNewsItems) {
      try {
        // Verificar si ya existe esta noticia (evitar duplicados)
        const { data: existingNews } = await supabase
          .from('scraped_news')
          .select('id')
          .eq('url', newsItem.url)
          .single()

        if (existingNews) {
          // Si ya existe, usar la existente
          allNews.push({
            id: existingNews.id,
            title: newsItem.title,
            summary: newsItem.summary,
            content: newsItem.content,
            source: newsItem.source,
            url: newsItem.url,
            publishedAt: newsItem.published_date,
            region: newsItem.region,
            category: newsItem.category,
            urgency: newsItem.urgency,
            sentiment: newsItem.sentiment
          })
        } else {
          // Crear nueva entrada en base de datos
          const newsData = {
            title: newsItem.title,
            content: newsItem.content,
            summary: newsItem.summary,
            url: newsItem.url,
            source_id: 'breaking-news-source', // Fuente genérica para noticias de último minuto
            category: newsItem.category,
            sentiment: newsItem.sentiment,
            priority: newsItem.urgency,
            region: newsItem.region,
            author: newsItem.author || 'Redacción',
            published_date: newsItem.published_date,
            is_processed: false
          }

          const savedNews = await createScrapedNews(newsData)
          
          if (savedNews) {
            allNews.push({
              id: savedNews.id,
              title: savedNews.title,
              summary: savedNews.summary,
              content: savedNews.content,
              source: newsItem.source,
              url: savedNews.url || newsItem.url,
              publishedAt: savedNews.published_date,
              region: savedNews.region,
              category: savedNews.category,
              urgency: savedNews.priority,
              sentiment: savedNews.sentiment
            })
          }
        }
      } catch (error) {
        console.error(`Error saving news item:`, error)
        // Continuar con otros items
        continue
      }
    }

    return NextResponse.json({
      success: true,
      news: allNews,
      metadata: {
        timeFrame,
        region,
        category,
        sourcesScanned: 7, // Fuentes chilenas configuradas
        totalFound: allNews.length,
        scannedAt: new Date().toISOString(),
        urgentCount: allNews.filter(n => n.urgency === 'high').length,
        categories: [...new Set(allNews.map(n => n.category))],
        regions: [...new Set(allNews.map(n => n.region))]
      }
    })

  } catch (error) {
    console.error('Error fetching breaking news:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
