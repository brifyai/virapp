import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url, api_key, render_js, premium_proxy, country_code } = await request.json()
    
    if (!url || !api_key) {
      return NextResponse.json(
        { error: 'URL y API key son requeridos' },
        { status: 400 }
      )
    }

    // Construir la URL de ScrapingBee
    const scrapingBeeUrl = new URL('https://app.scrapingbee.com/api/v1/')
    scrapingBeeUrl.searchParams.append('api_key', api_key)
    scrapingBeeUrl.searchParams.append('url', url)
    scrapingBeeUrl.searchParams.append('render_js', render_js ? 'true' : 'false')
    scrapingBeeUrl.searchParams.append('premium_proxy', premium_proxy ? 'true' : 'false')
    if (country_code) {
      scrapingBeeUrl.searchParams.append('country_code', country_code)
    }

    console.log(`🔍 Haciendo scraping de: ${url}`)
    
    const response = await fetch(scrapingBeeUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      console.error(`❌ Error de ScrapingBee: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: `Error de ScrapingBee: ${response.status}` },
        { status: response.status }
      )
    }

    const html = await response.text()
    console.log(`✅ HTML obtenido, longitud: ${html.length}`)
    
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    })
    
  } catch (error) {
    console.error('❌ Error en API de scraping:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'API de scraping funcionando. Usa POST para hacer scraping.' },
    { status: 200 }
  )
}