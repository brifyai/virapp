
import { prisma } from '../lib/db'

async function main() {
  console.log('🌱 Iniciando seed de la base de datos VIRA...')

  // Limpiar datos existentes
  await prisma.tokenUsage.deleteMany()
  await prisma.adCampaign.deleteMany()
  await prisma.newsReport.deleteMany()
  await prisma.radioStation.deleteMany()
  await prisma.dailyMetrics.deleteMany()
  await prisma.account.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  // Crear usuario administrador para testing
  await prisma.user.create({
    data: {
      email: 'john@doe.com',
      name: 'John Doe',
      role: 'admin'
    }
  })
  
  console.log('👤 Usuario administrador creado: john@doe.com / johndoe123')

  // Crear estaciones de radio
  const radioStations = await prisma.radioStation.createMany({
    data: [
      {
        name: 'Radio USACH',
        slug: 'radio-usach',
        description: 'Estación universitaria con enfoque informativo'
      },
      {
        name: 'Radio Festival',
        slug: 'radio-festival',
        description: 'Estación musical y de entretenimiento'
      },
      {
        name: 'Radio Sol',
        slug: 'radio-sol',
        description: 'Estación comunitaria con programación variada'
      },
      {
        name: 'Radio Nostálgica',
        slug: 'radio-nostalgia',
        description: 'Música clásica y contenido nostálgico'
      },
      {
        name: 'Radio Paloma',
        slug: 'radio-paloma',
        description: 'Estación familiar con programación diversa'
      }
    ]
  })

  // Obtener las estaciones creadas
  const stations = await prisma.radioStation.findMany()

  // Crear noticieros para cada estación
  const newsReports = []
  for (const station of stations) {
    let count = 0
    if (station.name === 'Radio USACH') count = 35
    else if (station.name === 'Radio Festival') count = 28
    else if (station.name === 'Radio Sol') count = 25
    else if (station.name === 'Radio Nostálgica') count = 24
    else if (station.name === 'Radio Paloma') count = 22

    for (let i = 0; i < count; i++) {
      newsReports.push({
        title: `Noticiero ${station.name} - Edición ${i + 1}`,
        content: `Contenido del noticiero generado automáticamente para ${station.name}. Incluye noticias locales, nacionales e internacionales.`,
        audioUrl: `https://example.com/audio/${station.slug}-${i + 1}.mp3`,
        duration: Math.floor(Math.random() * 1800) + 300, // 5-35 minutos
        generationCost: Math.random() * 50 + 10,
        tokenCount: Math.floor(Math.random() * 1000) + 500,
        radioStationId: station.id,
        status: 'published',
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
      })
    }
  }

  await prisma.newsReport.createMany({
    data: newsReports
  })

  // Crear uso de tokens
  const tokenUsageData = []
  for (const station of stations) {
    // Tokens de extracción
    tokenUsageData.push({
      radioStationId: station.id,
      tokenType: 'extraction',
      tokenCount: station.name === 'Radio USACH' ? 160000 : 
                  station.name === 'Radio Festival' ? 140000 :
                  station.name === 'Radio Sol' ? 200000 :
                  station.name === 'Radio Nostálgica' ? 208000 :
                  160000,
      cost: station.name === 'Radio USACH' ? 25 : 
            station.name === 'Radio Festival' ? 22 :
            station.name === 'Radio Sol' ? 31 :
            station.name === 'Radio Nostálgica' ? 32 :
            25,
      date: new Date()
    })

    // Tokens de curación
    tokenUsageData.push({
      radioStationId: station.id,
      tokenType: 'curation',
      tokenCount: station.name === 'Radio USACH' ? 700000 : 
                  station.name === 'Radio Festival' ? 560000 :
                  station.name === 'Radio Sol' ? 750000 :
                  station.name === 'Radio Nostálgica' ? 728000 :
                  560000,
      cost: station.name === 'Radio USACH' ? 109 : 
            station.name === 'Radio Festival' ? 87 :
            station.name === 'Radio Sol' ? 117 :
            station.name === 'Radio Nostálgica' ? 114 :
            87,
      date: new Date()
    })

    // Tokens de audio
    tokenUsageData.push({
      radioStationId: station.id,
      tokenType: 'audio',
      tokenCount: station.name === 'Radio USACH' ? 300000 : 
                  station.name === 'Radio Festival' ? 224000 :
                  station.name === 'Radio Sol' ? 300000 :
                  station.name === 'Radio Nostálgica' ? 312000 :
                  264000,
      cost: station.name === 'Radio USACH' ? 548 : 
            station.name === 'Radio Festival' ? 409 :
            station.name === 'Radio Sol' ? 548 :
            station.name === 'Radio Nostálgica' ? 570 :
            482,
      date: new Date()
    })
  }

  await prisma.tokenUsage.createMany({
    data: tokenUsageData
  })

  // Crear campañas publicitarias
  await prisma.adCampaign.createMany({
    data: [
      {
        name: 'Verano Refrescante',
        description: 'Campaña de bebidas refrescantes para el verano',
        reproductions: 98,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Hace 30 días
        radioStationId: stations[0].id
      },
      {
        name: 'Ofertas de la Semana',
        description: 'Promociones especiales del supermercado',
        reproductions: 126,
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Hace 14 días
        radioStationId: stations[1].id
      }
    ]
  })

  // Crear métricas diarias
  await prisma.dailyMetrics.create({
    data: {
      date: new Date(),
      totalNewsReports: 129,
      totalCost: 3410,
      totalTokens: 5800000,
      extractionTokens: 800000,
      curationTokens: 3500000,
      audioTokens: 1500000,
      extractionCost: 125,
      curationCost: 545,
      audioCost: 2740,
      mostActiveRadio: 'Radio USACH'
    }
  })

  console.log('✅ Seed completado exitosamente!')
  console.log(`📊 Creadas ${stations.length} estaciones de radio`)
  console.log(`📰 Creados ${newsReports.length} noticieros`)
  console.log(`🔄 Creados ${tokenUsageData.length} registros de uso de tokens`)
  console.log(`📢 Creadas 2 campañas publicitarias`)
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
