
import { NextRequest, NextResponse } from 'next/server'
import { getNewsByRegion, getUrgentNews, getWeatherInfo } from '@/lib/news-scraper'

interface ScrapeRequest {
  region: string
  limit?: number
  includeUrgent?: boolean
  includeWeather?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { region, limit = 10, includeUrgent = false, includeWeather = true }: ScrapeRequest = await request.json()
    
    if (!region) {
      return NextResponse.json(
        { success: false, error: 'Región requerida para scraping' },
        { status: 400 }
      )
    }

    console.log(`Iniciando scraping real para región: ${region}`)
    console.log(`Límite de noticias: ${limit}`)
    
    // Obtener noticias por región
    const [regularNews, urgentNews, weatherInfo] = await Promise.all([
      getNewsByRegion(region, limit),
      includeUrgent ? getUrgentNews(region) : Promise.resolve([]),
      includeWeather ? getWeatherInfo(region) : Promise.resolve(null)
    ])

    console.log(`Noticias encontradas: ${regularNews.length} regulares, ${urgentNews.length} urgentes`)

    // Combinar noticias (urgentes primero)
    const allNews = [...urgentNews, ...regularNews]
    
    // Eliminar duplicados por título
    const uniqueNews = allNews.filter((news, index, self) => 
      index === self.findIndex(n => n.title === news.title)
    )

    // Limitar al número solicitado
    const finalNews = uniqueNews.slice(0, limit)

    // Generar estadísticas
    const stats = {
      totalScraped: finalNews.length,
      urgentCount: urgentNews.length,
      sources: [...new Set(finalNews.map(n => n.source))],
      categories: [...new Set(finalNews.map(n => n.category))],
      avgContentLength: finalNews.reduce((sum, n) => sum + n.content.length, 0) / finalNews.length,
      scrapingTime: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      news: finalNews,
      weather: weatherInfo,
      stats,
      metadata: {
        region,
        requestedLimit: limit,
        actualCount: finalNews.length,
        hasWeather: !!weatherInfo,
        scrapedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Real scraping error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido en scraping',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

// Endpoint para obtener fuentes disponibles
export async function GET() {
  try {
    const sources = [
      {
        id: 'emol',
        name: 'El Mercurio Online',
        url: 'https://www.emol.com',
        status: 'active',
        coverage: 'nacional'
      },
      {
        id: 'latercera',
        name: 'La Tercera',
        url: 'https://www.latercera.com',
        status: 'active',
        coverage: 'nacional'
      },
      {
        id: 'biobio',
        name: 'BioBioChile',
        url: 'https://www.biobiochile.cl',
        status: 'active',
        coverage: 'nacional'
      }
    ]

    return NextResponse.json({
      success: true,
      sources,
      totalSources: sources.length,
      activeSources: sources.filter(s => s.status === 'active').length
    })

  } catch (error) {
    console.error('Error getting sources:', error)
    return NextResponse.json(
      { success: false, error: 'Error obteniendo fuentes' },
      { status: 500 }
    )
  }
}
