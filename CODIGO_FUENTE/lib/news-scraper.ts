
import { JSDOM } from 'jsdom'

// Tipos para noticias
export interface ScrapedNews {
  id: string
  title: string
  content: string
  summary: string
  url: string
  source: string
  category: string
  publishDate: Date
  author?: string
  imageUrl?: string
  region?: string
}

// Configuración de fuentes noticiosas chilenas
const NEWS_SOURCES = {
  emol: {
    name: 'El Mercurio Online',
    baseUrl: 'https://www.emol.com',
    rssUrl: process.env.EMOL_RSS_URL || 'https://www.emol.com/rss/rss.asp',
    selectors: {
      title: 'h1.titulo, .noticia-titulo',
      content: '.cuerpo-noticia, .noticia-contenido',
      author: '.autor, .byline'
    }
  },
  latercera: {
    name: 'La Tercera',
    baseUrl: 'https://www.latercera.com',
    rssUrl: process.env.LATERCERA_RSS_URL || 'https://www.latercera.com/feed/',
    selectors: {
      title: 'h1.single-title, .article-title',
      content: '.single-content, .article-content',
      author: '.author-name'
    }
  },
  biobio: {
    name: 'BioBioChile',
    baseUrl: 'https://www.biobiochile.cl',
    rssUrl: process.env.BIOBIO_RSS_URL || 'https://www.biobiochile.cl/especial/rss/index.xml',
    selectors: {
      title: 'h1.title-post, .noticia-titulo',
      content: '.post-content, .noticia-texto',
      author: '.author'
    }
  }
}

// Obtener noticias desde RSS
export async function fetchRSSNews(source: keyof typeof NEWS_SOURCES): Promise<any[]> {
  try {
    const sourceConfig = NEWS_SOURCES[source]
    const response = await fetch(sourceConfig.rssUrl, {
      headers: {
        'User-Agent': 'VIRA News Bot 1.0 (https://vira.cl)'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const xmlText = await response.text()
    const dom = new JSDOM(xmlText, { contentType: 'text/xml' })
    const items = Array.from(dom.window.document.querySelectorAll('item'))

    return items.map(item => ({
      title: item.querySelector('title')?.textContent || '',
      link: item.querySelector('link')?.textContent || '',
      description: item.querySelector('description')?.textContent || '',
      pubDate: item.querySelector('pubDate')?.textContent || '',
      category: item.querySelector('category')?.textContent || 'general',
      source: sourceConfig.name
    }))
  } catch (error) {
    console.error(`Error fetching RSS from ${source}:`, error)
    return []
  }
}

// Scrapeear contenido completo de una noticia
export async function scrapeFullArticle(url: string, source: keyof typeof NEWS_SOURCES): Promise<Partial<ScrapedNews> | null> {
  try {
    const sourceConfig = NEWS_SOURCES[source]
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VIRA News Bot 1.0 (https://vira.cl)'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const dom = new JSDOM(html)
    const document = dom.window.document

    // Extraer contenido usando selectores específicos
    const title = document.querySelector(sourceConfig.selectors.title)?.textContent?.trim()
    const author = document.querySelector(sourceConfig.selectors.author)?.textContent?.trim()
    
    // Obtener párrafos de contenido
    const contentElements = Array.from(document.querySelectorAll(sourceConfig.selectors.content + ' p'))
    const content = contentElements
      .map(p => p.textContent?.trim())
      .filter(text => text && text.length > 50) // Filtrar párrafos muy cortos
      .join('\n\n')

    if (!title || !content) {
      return null
    }

    return {
      title,
      content,
      author,
      url,
      source: sourceConfig.name,
      summary: content.substring(0, 300) + '...'
    }
  } catch (error) {
    console.error(`Error scraping article ${url}:`, error)
    return null
  }
}

// Obtener noticias por región
export async function getNewsByRegion(region: string, limit: number = 10): Promise<ScrapedNews[]> {
  try {
    const allNews: ScrapedNews[] = []
    
    // Obtener noticias de todas las fuentes
    for (const [sourceKey, sourceConfig] of Object.entries(NEWS_SOURCES)) {
      try {
        const rssItems = await fetchRSSNews(sourceKey as keyof typeof NEWS_SOURCES)
        
        // Tomar las primeras noticias y obtener contenido completo
        const limitedItems = rssItems.slice(0, Math.ceil(limit / Object.keys(NEWS_SOURCES).length))
        
        for (const item of limitedItems) {
          if (item.link) {
            const fullArticle = await scrapeFullArticle(item.link, sourceKey as keyof typeof NEWS_SOURCES)
            
            if (fullArticle) {
              allNews.push({
                id: `${sourceKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: fullArticle.title!,
                content: fullArticle.content!,
                summary: fullArticle.summary!,
                url: fullArticle.url!,
                source: fullArticle.source!,
                category: item.category || 'general',
                publishDate: item.pubDate ? new Date(item.pubDate) : new Date(),
                author: fullArticle.author,
                region: region
              })
            }
          }
          
          // Pequeña pausa para no sobrecargar los servidores
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Error processing source ${sourceKey}:`, error)
        continue
      }
    }

    // Ordenar por fecha y retornar las más recientes
    return allNews
      .sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime())
      .slice(0, limit)

  } catch (error) {
    console.error('Error getting news by region:', error)
    return []
  }
}

// Buscar noticias urgentes (trending, breaking news)
export async function getUrgentNews(region?: string): Promise<ScrapedNews[]> {
  try {
    const urgentKeywords = [
      'urgente', 'último momento', 'breaking', 'ahora', 
      'emergencia', 'alerta', 'importante', 'exclusivo'
    ]

    const allNews = await getNewsByRegion(region || 'nacional', 20)
    
    // Filtrar noticias que contengan palabras clave urgentes
    const urgentNews = allNews.filter(news => {
      const titleLower = news.title.toLowerCase()
      const contentLower = news.content.toLowerCase()
      
      return urgentKeywords.some(keyword => 
        titleLower.includes(keyword) || contentLower.includes(keyword)
      )
    })

    return urgentNews.slice(0, 5) // Máximo 5 noticias urgentes
  } catch (error) {
    console.error('Error getting urgent news:', error)
    return []
  }
}

// Obtener información del clima para una región
export async function getWeatherInfo(region: string): Promise<{ temp: number; condition: string; description: string }> {
  try {
    // Mapear regiones chilenas a ciudades principales
    const regionCityMap: { [key: string]: string } = {
      'Arica y Parinacota': 'Arica',
      'Tarapacá': 'Iquique',
      'Antofagasta': 'Antofagasta',
      'Atacama': 'Copiapó',
      'Coquimbo': 'La Serena',
      'Valparaíso': 'Valparaíso',
      'Metropolitana de Santiago': 'Santiago',
      "O'Higgins": 'Rancagua',
      'Maule': 'Talca',
      'Ñuble': 'Chillán',
      'Biobío': 'Concepción',
      'La Araucanía': 'Temuco',
      'Los Ríos': 'Valdivia',
      'Los Lagos': 'Puerto Montt',
      'Aysén': 'Coyhaique',
      'Magallanes y Antártica Chilena': 'Punta Arenas'
    }

    const city = regionCityMap[region] || 'Santiago'
    
    if (!process.env.OPENWEATHER_API_KEY) {
      // Retornar datos simulados si no hay API key
      const mockData = {
        'Arica': { temp: 23, condition: 'soleado', description: 'cielos despejados' },
        'Iquique': { temp: 20, condition: 'parcialmente nublado', description: 'algunas nubes' },
        'Santiago': { temp: 15, condition: 'smog', description: 'condiciones de smog' },
        'Punta Arenas': { temp: 3, condition: 'ventoso', description: 'vientos fuertes' }
      }
      return mockData[city as keyof typeof mockData] || mockData['Santiago']
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city},CL&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=es`
    )

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      temp: Math.round(data.main.temp),
      condition: data.weather[0].description,
      description: `${data.weather[0].description}, sensación térmica ${Math.round(data.main.feels_like)}°C`
    }
  } catch (error) {
    console.error('Error getting weather info:', error)
    // Retornar datos por defecto en caso de error
    return {
      temp: 18,
      condition: 'variable',
      description: 'condiciones variables'
    }
  }
}
