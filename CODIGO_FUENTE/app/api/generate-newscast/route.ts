
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getNewsByRegion, getWeatherInfo } from '@/lib/news-scraper'
import { createNewsReport, logTokenUsage } from '@/lib/supabase'

// Función para generar mención de hora y clima usando datos reales
async function generateClimateSegment(region: string) {
  const now = new Date()
  const timeString = now.toLocaleTimeString('es-CL', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })

  try {
    // Obtener datos reales del clima
    const weatherInfo = await getWeatherInfo(region)
    
    return {
      id: 'climate-segment',
      title: 'Mención de Hora y Clima',
      content: `Son las ${timeString}. Para hoy en ${region} se espera ${weatherInfo.description} con una temperatura de ${weatherInfo.temp} grados.`,
      type: 'climate',
      category: 'weather',
      duration: 25,
      priority: 'required',
      hasAudio: false,
      isHumanized: true,
      audioProgress: 0,
      transitionType: 'ninguna',
      weatherData: weatherInfo
    }
  } catch (error) {
    console.error('Error getting weather info:', error)
    // Fallback a datos simulados
    return {
      id: 'climate-segment',
      title: 'Mención de Hora y Clima',
      content: `Son las ${timeString}. Para hoy en ${region} se espera un día variable con temperaturas moderadas.`,
      type: 'climate',
      category: 'weather',
      duration: 25,
      priority: 'required',
      hasAudio: false,
      isHumanized: true,
      audioProgress: 0,
      transitionType: 'ninguna'
    }
  }
}

// Función para procesar noticias con IA (usando la API existente)
async function processNewsWithAI(news: any[], config: any) {
  const processedNews = []
  
  for (const item of news) {
    try {
      // Llamar a la API de procesamiento existente
      const response = await fetch(
        process.env.NEXTAUTH_URL + '/api/process-news',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: item.content,
            style: config.style || 'profesional',
            tone: config.tone || 'neutral',
            length: config.length || 'medium'
          })
        }
      )
      
      if (response.ok) {
        const processed = await response.json()
        processedNews.push({
          ...item,
          processedContent: processed.processedText || item.content,
          isProcessed: true
        })
      } else {
        processedNews.push({
          ...item,
          processedContent: item.content,
          isProcessed: false
        })
      }
    } catch (error) {
      console.error('Error processing news:', error)
      processedNews.push({
        ...item,
        processedContent: item.content,
        isProcessed: false
      })
    }
  }
  
  return processedNews
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Para desarrollo: crear usuario automático si no hay sesión
    const userId = session?.user?.id || 'demo-user-vira-dev'
    
    console.log('Current session:', session)
    console.log('Using userId:', userId)

    const config = await request.json()
    
    console.log('Generating newscast with real data:', config, 'for user:', userId)
    
    // Validaciones
    if (!config.region) {
      return NextResponse.json(
        { success: false, error: 'Región requerida para generar noticiero' },
        { status: 400 }
      )
    }

    const targetDuration = config.targetDuration || 900 // 15 minutos por defecto
    const newsLimit = Math.max(3, Math.floor(targetDuration / 90)) // ~90 segundos por noticia en promedio

    // Generar segmento de clima con datos reales
    const climateSegment = await generateClimateSegment(config.region)
    
    // MODO DESARROLLADOR: Generar noticias simuladas completas para demostración
    console.log(`🚀 MODO DESARROLLADOR: Generando noticiero completo de ${Math.floor(targetDuration/60)} minutos`)
    
    const selectedCategories = config.includeCategories || ['regionales', 'nacionales']
    const newsPerCategory = Math.ceil(newsLimit / selectedCategories.length)
    
    // Banco de noticias simuladas por categoría
    const simulatedNewsBank = {
      regionales: [
        {
          title: 'Nuevo hospital regional será inaugurado en marzo con tecnología de vanguardia',
          content: `El próximo mes de marzo se inaugura el nuevo Hospital Regional ${config.region}, una obra que representa una inversión de 45 mil millones de pesos y que beneficiará a más de 300 mil habitantes de la región. El recinto cuenta con 200 camas, 8 quirófanos equipados con tecnología robótica, una unidad de cuidados intensivos con 24 camas y el primer tomógrafo de alta resolución de la zona norte. El Ministro de Salud destacó que este hospital permitirá reducir los tiempos de espera y las listas de espera en un 40%. Además, se crearon 180 nuevos empleos directos entre médicos especialistas, enfermeras y personal técnico. La obra incluye también helipuerto para emergencias y conexión directa con la ruta principal.`,
          category: 'regionales',
          sentiment: 'positive'
        },
        {
          title: 'Pescadores artesanales protestan por nuevas regulaciones ambientales',
          content: `Más de 200 pescadores artesanales de ${config.region} realizaron una protesta pacífica en la plaza principal para manifestar su desacuerdo con las nuevas regulaciones ambientales que limitarán la pesca de especies tradicionales. Los dirigentes del sindicato explicaron que estas medidas afectarían directamente a 500 familias que dependen de la pesca artesanal. El Sernapesca informó que las restricciones buscan proteger especies en peligro de extinción, pero los pescadores solicitan un período de transición y programas de reconversión laboral. La autoridad regional se comprometió a estudiar alternativas que permitan conciliar la protección ambiental con la subsistencia de las familias pescadoras.`,
          category: 'regionales',
          sentiment: 'neutral'
        },
        {
          title: 'Temporada de turismo supera expectativas con 30% más de visitantes',
          content: `La temporada turística en ${config.region} cerró con cifras récord, registrando un aumento del 30% en el número de visitantes comparado con el año anterior. Los hoteles de la región alcanzaron una ocupación promedio del 85%, mientras que los restaurantes reportaron un incremento del 25% en sus ventas. El director regional de turismo atribuyó estos resultados a la nueva campaña promocional y a las mejoras en infraestructura vial. Los principales atractivos visitados fueron las reservas naturales, los pueblos típicos y las rutas gastronómicas. Se estima que el impacto económico de la temporada superó los 12 mil millones de pesos, beneficiando directamente a más de 1.200 empresas locales.`,
          category: 'regionales',
          sentiment: 'positive'
        }
      ],
      nacionales: [
        {
          title: 'Gobierno anuncia nuevo plan de infraestructura por 8 mil millones de dólares',
          content: `El Presidente de la República anunció oficialmente el "Plan Nacional de Infraestructura 2025-2030", una iniciativa que contempla inversiones por 8 mil millones de dólares en los próximos cinco años. El plan incluye la construcción de 500 kilómetros de nuevas autopistas, la modernización de 12 aeropuertos regionales, y la implementación de internet de alta velocidad en todas las comunas del país. El Ministro de Obras Públicas detalló que se crearán aproximadamente 80 mil empleos directos y 150 mil indirectos. Las regiones del norte y sur serán priorizadas con proyectos específicos de conectividad. La primera fase comenzará en abril con la licitación de tres autopistas estratégicas.`,
          category: 'nacionales',
          sentiment: 'positive'
        },
        {
          title: 'Inflación mensual alcanza 0.8% impulsada por alimentos y combustibles',
          content: `El Instituto Nacional de Estadísticas informó que la inflación mensual de febrero alcanzó 0.8%, cifra superior a la esperada por los analistas económicos. Los alimentos fueron los principales responsables del alza, con incrementos del 1.2% en frutas y verduras, y 0.9% en carnes. Los combustibles también contribuyeron con un aumento del 1.5% en las bencinas. El Banco Central señaló que esta cifra se mantiene dentro del rango meta, pero requiere monitoreo constante. Los economistas proyectan que la inflación anual podría cerrar el año entre 3.5% y 4.2%. El gobierno anunció medidas para estabilizar los precios de productos de primera necesidad.`,
          category: 'nacionales',
          sentiment: 'neutral'
        },
        {
          title: 'Chile firma acuerdo comercial histórico con países del sudeste asiático',
          content: `El Ministro de Relaciones Exteriores firmó en Singapur un acuerdo comercial histórico entre Chile y cinco países del sudeste asiático que eliminará aranceles para el 95% de los productos chilenos. El tratado beneficiará especialmente las exportaciones de cobre, litio, frutas y vinos chilenos, abriendo un mercado de 300 millones de consumidores. Se estima que este acuerdo incrementará las exportaciones nacionales en un 15% durante los próximos tres años. Los sectores minero y agrícola celebraron el anuncio, mientras que el gobierno proyecta la creación de 25 mil nuevos empleos. El acuerdo entrará en vigencia en junio tras la ratificación de los congresos respectivos.`,
          category: 'nacionales',
          sentiment: 'positive'
        }
      ],
      deportes: [
        {
          title: 'La Roja clasifica al Mundial tras dramático triunfo en el último minuto',
          content: `En un partido histórico disputado en el Estadio Nacional, la Selección Chilena logró clasificar al Mundial de fútbol tras vencer 2-1 a su rival con un gol en los últimos segundos del encuentro. Más de 40 mil hinchas vivieron una noche mágica que quedará grabada en la memoria del fútbol chileno. El técnico destacó el carácter y la garra del equipo, mientras que el goleador del partido se emocionó hasta las lágrimas en la conferencia de prensa. Esta clasificación llega después de 8 años de ausencia en mundiales. Las celebraciones se extendieron por toda la ciudad, con caravanas y fuegos artificiales. El presidente de la ANFP confirmó que ya se iniciaron las gestiones para conseguir la mejor preparación posible para la cita mundialista.`,
          category: 'deportes',
          sentiment: 'positive'
        },
        {
          title: 'Tenista nacional alcanza semifinales en torneo ATP 500 por primera vez',
          content: `El tenista chileno Cristián Valdés hizo historia al convertirse en el primer jugador nacional en alcanzar las semifinales de un torneo ATP 500 en los últimos 15 años. Valdés venció en cuartos de final al cabeza de serie número 3 del torneo en un emocionante partido que se extendió por más de tres horas. Con esta victoria, el deportista de 24 años escalará al puesto 45 del ranking mundial ATP, su mejor ubicación histórica. El Comité Olímpico de Chile felicitó al tenista y confirmó su apoyo total para su preparación hacia los próximos torneos importantes. Su próximo rival en semifinales será el número 12 del mundo, en lo que promete ser un duelo épico.`,
          category: 'deportes',
          sentiment: 'positive'
        },
        {
          title: 'Maratón de Santiago bate récord de participación con 25 mil corredores',
          content: `La vigésima edición del Maratón de Santiago estableció un nuevo récord de participación con 25 mil corredores inscritos, convirtiéndose en la carrera más masiva de Sudamérica. Atletas de 45 países diferentes participaron en las diferentes modalidades: maratón completo, medio maratón y carrera familiar de 5K. El evento generó un impacto económico de 8 millones de dólares en la ciudad, con hoteles con ocupación del 100% durante el fin de semana. El ganador de la categoría masculina estableció un nuevo récord nacional con un tiempo de 2:12:15. La organización destacó el apoyo de más de 3 mil voluntarios y la participación de 200 personas en situación de discapacidad.`,
          category: 'deportes',
          sentiment: 'positive'
        }
      ],
      economia: [
        {
          title: 'Dólar cierra la semana en alza alcanzando los $920 pesos',
          content: `La divisa estadounidense cerró la jornada de viernes con una cotización de $920 pesos, registrando un alza semanal del 2.3% impulsada por las tensiones geopolíticas internacionales y la incertidumbre en los mercados emergentes. Los analistas de las principales corredoras señalan que factores externos, principalmente las decisiones de la Reserva Federal estadounidense y los conflictos comerciales globales, han presionado al peso chileno. El Banco Central informó que mantiene sus herramientas de intervención disponibles si la volatilidad excede los parámetros normales. Las exportaciones mineras se ven beneficiadas por el tipo de cambio actual, mientras que los importadores expresan preocupación por el incremento en sus costos operacionales.`,
          category: 'economia',
          sentiment: 'neutral'
        },
        {
          title: 'Startup chilena de tecnología verde recibe inversión de 50 millones de dólares',
          content: `La empresa nacional EcoTech Solutions cerró una ronda de financiamiento serie B por 50 millones de dólares, liderada por fondos de inversión internacionales especializados en tecnologías sustentables. La startup, que desarrolla soluciones de energía solar y almacenamiento para el sector industrial, planea usar los recursos para expandirse a Colombia, Perú y México. La compañía, fundada en 2019, ya cuenta con más de 200 clientes en Chile y ha generado ahorros energéticos superiores al 30% en las empresas que implementan sus soluciones. El CEO anunció que esperan crear 300 nuevos empleos especializados en los próximos 18 meses y establecer centros de investigación en Santiago y Concepción.`,
          category: 'economia',
          sentiment: 'positive'
        },
        {
          title: 'Sector retail registra caída de 5% en ventas durante febrero',
          content: `La Cámara Nacional de Comercio reportó una disminución del 5% en las ventas del sector retail durante febrero, comparado con el mismo período del año anterior. Los rubros más afectados fueron vestuario y calzado con una baja del 8%, mientras que electrodomésticos cayeron un 6%. Sin embargo, el sector de alimentos y productos de primera necesidad mantuvo estabilidad con un leve crecimiento del 1.2%. Los empresarios del sector atribuyen la caída a la menor confianza del consumidor y al aumento en las tasas de interés. Las ventas online representaron el 23% del total, mostrando un crecimiento sostenido. Se espera una recuperación gradual hacia el segundo semestre del año.`,
          category: 'economia',
          sentiment: 'negative'
        }
      ],
      mundo: [
        {
          title: 'Cumbre climática en Dubai alcanza acuerdo histórico para reducir emisiones',
          content: `Los representantes de 195 países alcanzaron un acuerdo histórico en la cumbre climática COP28 de Dubai, comprometiéndose a reducir las emisiones globales de gases de efecto invernadero en un 50% para 2030. El pacto incluye un fondo de 100 mil millones de dólares anuales para países en desarrollo y metas específicas de transición energética. Chile participó activamente en las negociaciones y se comprometió a alcanzar la carbono neutralidad cinco años antes de lo previsto. El Ministro del Medio Ambiente destacó que este acuerdo representa una oportunidad única para el desarrollo sustentable nacional. Los ecologistas valoraron el compromiso, aunque consideran que las metas siguen siendo insuficientes ante la crisis climática actual.`,
          category: 'mundo',
          sentiment: 'positive'
        },
        {
          title: 'Tensión comercial entre Estados Unidos y China afecta mercados mundiales',
          content: `Las bolsas mundiales cerraron con pérdidas generalizadas tras el anuncio de nuevas medidas comerciales restrictivas entre Estados Unidos y China, que incluyen aranceles adicionales a productos tecnológicos y materias primas. Los mercados asiáticos fueron los más afectados, con caídas superiores al 3%, mientras que Europa y América también registraron descensos significativos. Los analistas económicos advierten que esta escalada podría afectar las cadenas de suministro globales y presionar la inflación mundial. Para Chile, la situación representa tanto riesgos como oportunidades, considerando su rol como proveedor de materias primas a ambas potencias. El Ministerio de Hacienda informó que monitore de cerca la situación para tomar medidas preventivas si es necesario.`,
          category: 'mundo',
          sentiment: 'negative'
        }
      ],
      cultura: [
        {
          title: 'Festival de Viña del Mar anuncia lineup estelar para su nueva edición',
          content: `El Festival Internacional de la Canción de Viña del Mar reveló su lineup para 2025, confirmando la participación de artistas de talla mundial que prometen hacer de esta edición una de las más memorables de los últimos años. Entre los confirmados se encuentran reconocidas estrellas internacionales del pop, rock y música latina, además de destacados representantes del folclore nacional. El alcalde de Viña del Mar destacó que se espera un impacto económico superior a los 25 millones de dólares para la región. La quinta vergara se prepara para recibir a más de 15 mil espectadores por noche durante las seis jornadas del festival. Las entradas saldrán a la venta el próximo mes, con precios que van desde $35 mil hasta $180 mil pesos.`,
          category: 'cultura',
          sentiment: 'positive'
        }
      ],
      tecnologia: [
        {
          title: 'Chile se convierte en el primer país sudamericano en implementar 6G experimental',
          content: `Chile hizo historia al convertirse en el primer país de Sudamérica en implementar una red 6G experimental, gracias a una alianza estratégica entre el gobierno y empresas tecnológicas internacionales. La red piloto, instalada en Santiago y Valparaíso, permitirá velocidades de descarga de hasta 1 terabyte por segundo y latencia prácticamente nula. El proyecto contempla aplicaciones en telemedicina avanzada, ciudades inteligentes y realidad aumentada masiva. El Ministro de Ciencia y Tecnología señaló que esta iniciativa posiciona a Chile como líder regional en innovación tecnológica. Se espera que la implementación comercial comience en 2027, beneficiando inicialmente a 2 millones de usuarios en las principales ciudades del país.`,
          category: 'tecnologia',
          sentiment: 'positive'
        }
      ]
    }
    
    // Generar noticias distribuidas por categorías seleccionadas
    let scrapedNews = []
    
    selectedCategories.forEach((category: string) => {
      const categoryNews = simulatedNewsBank[category as keyof typeof simulatedNewsBank] || simulatedNewsBank['regionales']
      const newsToAdd = Math.min(newsPerCategory, categoryNews.length)
      
      for (let i = 0; i < newsToAdd; i++) {
        const baseNews = categoryNews[i % categoryNews.length]
        scrapedNews.push({
          id: `demo-${category}-${i}-${Date.now()}`,
          title: baseNews.title,
          content: baseNews.content,
          summary: baseNews.content.substring(0, 200) + '...',
          url: `https://demo.vira.cl/news/${category}/${i}`,
          source: category === 'regionales' ? `Diario ${config.region}` : 
                  category === 'nacionales' ? 'El Mercurio' :
                  category === 'deportes' ? 'La Tercera Deportes' :
                  category === 'economia' ? 'Diario Financiero' :
                  category === 'mundo' ? 'BBC Mundo' :
                  category === 'cultura' ? 'El Mostrador Cultura' :
                  'Portal de Noticias',
          category: category,
          publishDate: new Date(),
          region: config.region,
          sentiment: baseNews.sentiment || 'neutral'
        })
      }
    })
    
    // Si necesitamos más noticias para llenar la duración, agregar más
    const currentCount = scrapedNews.length
    if (currentCount < newsLimit) {
      const needed = newsLimit - currentCount
      const allNews = Object.values(simulatedNewsBank).flat()
      
      for (let i = 0; i < needed; i++) {
        const baseNews = allNews[i % allNews.length]
        scrapedNews.push({
          id: `demo-extra-${i}-${Date.now()}`,
          title: baseNews.title + ` (Edición ${Math.floor(Math.random() * 100)})`,
          content: baseNews.content,
          summary: baseNews.content.substring(0, 200) + '...',
          url: `https://demo.vira.cl/news/extra/${i}`,
          source: 'Portal Noticias Demo',
          category: baseNews.category,
          publishDate: new Date(),
          region: config.region,
          sentiment: baseNews.sentiment || 'neutral'
        })
      }
    }
    
    console.log(`✅ DEMO: Generadas ${scrapedNews.length} noticias simuladas para categorías: ${selectedCategories.join(', ')}`)

    // Convertir noticias scrapeadas al formato necesario con duraciones realistas
    const relevantNews = scrapedNews.map(news => {
      // Calcular duración más realista basada en palabras y tipo de noticia
      const wordCount = news.content.split(' ').length
      const baseWordsPerMinute = 180 // Palabras por minuto para radio profesional
      let baseDuration = Math.ceil((wordCount / baseWordsPerMinute) * 60) // Duración base en segundos
      
      // Ajustar según el tipo de noticia
      if (news.category === 'regionales') baseDuration += 10 // Más tiempo para contexto regional
      if (news.category === 'deportes') baseDuration -= 5   // Noticias deportivas más dinámicas
      if (news.category === 'economia') baseDuration += 15  // Más tiempo para explicar términos económicos
      if (news.category === 'mundo') baseDuration += 8      // Más contexto internacional
      if (news.category === 'urgente') baseDuration -= 10   // Noticias urgentes más directas
      
      // Asegurar duración mínima y máxima razonable
      const finalDuration = Math.max(45, Math.min(120, baseDuration)) // Entre 45 segundos y 2 minutos
      
      return {
        ...news,
        duration: finalDuration,
        sentiment: determineSentiment(news.content),
        priority: news.category === 'urgente' ? 'high' : 'medium',
        wordsPerMinute: baseWordsPerMinute,
        estimatedWords: wordCount
      }
    })

    // Seleccionar noticias para llenar la duración objetivo inteligentemente
    let selectedNews = []
    let currentDuration = climateSegment.duration
    const targetWithMargin = targetDuration - 30 // Margen menor de 30s para mejor aprovechamiento
    
    console.log(`🎯 Objetivo: ${Math.floor(targetDuration/60)}:${String(targetDuration%60).padStart(2,'0')}, iniciando con clima: ${climateSegment.duration}s`)
    
    // Primera pasada: seleccionar noticias hasta acercarse al objetivo
    for (const news of relevantNews) {
      if (currentDuration + news.duration <= targetWithMargin) {
        selectedNews.push(news)
        currentDuration += news.duration
        console.log(`✅ Agregada: "${news.title.substring(0, 50)}..." (${news.duration}s) - Total: ${Math.floor(currentDuration/60)}:${String(currentDuration%60).padStart(2,'0')}`)
      }
    }
    
    // Si nos quedamos cortos, intentar llenar el tiempo restante
    const timeRemaining = targetDuration - currentDuration
    console.log(`⏱️ Tiempo restante: ${timeRemaining}s`)
    
    if (timeRemaining > 60) { // Si faltan más de 60 segundos
      console.log(`🔄 Generando noticias adicionales para llenar ${timeRemaining}s restantes...`)
      
      // Crear noticias adicionales cortas para llenar el espacio
      const additionalNewsTemplates = [
        {
          title: 'Estado del tiempo actualizado para la región',
          content: `Las condiciones meteorológicas se mantendrán estables durante las próximas horas en ${config.region}. Se esperan temperaturas máximas de 22 grados y mínimas de 12 grados. Los vientos del suroeste soplarán con intensidad leve a moderada. Para mañana se pronostica cielo parcialmente nublado con probabilidad de lluvias aisladas en sectores cordilleranos. Se recomienda a la población mantenerse informada sobre las condiciones meteorológicas.`,
          category: 'regionales',
          sentiment: 'neutral'
        },
        {
          title: 'Actualización del tráfico y transporte público',
          content: `El tráfico vehicular presenta flujo normal en las principales arterias de ${config.region}. El transporte público opera con normalidad en todas sus líneas. Se recuerda a los usuarios del transporte público mantener el uso de mascarilla y respetar las medidas sanitarias vigentes. Para emergencias en carretera, mantener disponible el número de Carabineros y servicios de emergencia.`,
          category: 'regionales',
          sentiment: 'neutral'
        },
        {
          title: 'Recordatorio de actividades culturales del fin de semana',
          content: `Se recuerda a la comunidad las actividades culturales programadas para este fin de semana en ${config.region}. El teatro municipal presenta función especial, mientras que la biblioteca pública realizará cuentacuentos para niños. El centro cultural ofrece talleres gratuitos de pintura y música. Todas las actividades respetan protocolos sanitarios vigentes.`,
          category: 'cultura',
          sentiment: 'positive'
        }
      ]
      
      let additionalDuration = 0
      for (const template of additionalNewsTemplates) {
        if (currentDuration + additionalDuration + 45 <= targetDuration) { // Noticias cortas de ~45s
          selectedNews.push({
            id: `demo-filler-${selectedNews.length}-${Date.now()}`,
            title: template.title,
            content: template.content,
            summary: template.content.substring(0, 150) + '...',
            url: `https://demo.vira.cl/news/filler/${selectedNews.length}`,
            source: `Radio ${config.region}`,
            category: template.category,
            publishDate: new Date(),
            region: config.region,
            sentiment: template.sentiment,
            duration: 45,
            priority: 'low',
            wordsPerMinute: 180,
            estimatedWords: template.content.split(' ').length
          })
          additionalDuration += 45
          console.log(`➕ Agregada noticia de relleno: "${template.title}" (45s)`)
        }
      }
      currentDuration += additionalDuration
    }
    
    console.log(`🎉 RESULTADO: ${selectedNews.length} noticias, duración total: ${Math.floor(currentDuration/60)}:${String(currentDuration%60).padStart(2,'0')} (objetivo: ${Math.floor(targetDuration/60)}:${String(targetDuration%60).padStart(2,'0')})`)

    console.log(`Selected ${selectedNews.length} news articles for newscast`)
    
    // MODO DEMO: Dejar noticias SIN procesar para demostrar el flujo completo
    const rawNews = selectedNews.map(news => ({
      ...news,
      // Mantener contenido original sin procesar
      originalContent: news.content,
      processedContent: null, // No hay contenido procesado inicialmente
      rewrittenContent: null, // No hay contenido reescrito inicialmente
      humanizedContent: null, // No hay contenido humanizado inicialmente
      isRewritten: false, // No está reescrita
      isHumanized: false, // No está humanizada
      isProcessed: false // No está procesada
    }))
    
    // Generar segmentos publicitarios si están configurados
    const advertisementSegments: any[] = []
    const adConfig = config.advertisementConfig
    
    if (adConfig && adConfig.adCount > 0) {
      console.log(`📢 Generando ${adConfig.adCount} frases publicitarias cada ${adConfig.adFrequency} noticias`)
      
      for (let i = 0; i < adConfig.adCount; i++) {
        advertisementSegments.push({
          id: `ad-${i + 1}`,
          title: `Frase Publicitaria #${i + 1}`,
          content: '', // Inicialmente vacío, se llenará en el timeline
          originalContent: '',
          type: 'advertisement',
          category: 'publicidad',
          sentiment: 'neutral',
          duration: adConfig.adDurationPerPhrase || 15,
          hasAudio: false,
          isRewritten: false,
          isHumanized: false,
          audioProgress: 0,
          transitionType: 'ninguna',
          actualDuration: adConfig.adDurationPerPhrase || 15,
          priority: 'advertisement',
          currentVersion: 'original',
          originalAudioUrl: null,
          rewrittenAudioUrl: null,
          humanizedAudioUrl: null,
          adNumber: i + 1,
          isEmpty: true, // Marca que necesita contenido
          placeholder: `Escribe aquí tu frase publicitaria #${i + 1}...`
        })
      }
    }

    // Intercalar noticias con publicidad según la frecuencia configurada
    const interleavedTimeline: any[] = [climateSegment]
    const newsItems = rawNews.map(news => ({
      ...news,
      hasAudio: false,  // Sin audio inicialmente
      isHumanized: false, // Sin humanizar inicialmente  
      isRewritten: false, // Sin reescribir inicialmente
      audioProgress: 0,
      transitionType: 'ninguna',
      actualDuration: news.duration,
      // URLs de audio para diferentes versiones
      originalAudioUrl: null,
      rewrittenAudioUrl: null, 
      humanizedAudioUrl: null
    }))
    
    // Intercalar según la configuración
    if (adConfig && adConfig.adCount > 0 && adConfig.adFrequency > 0) {
      let adIndex = 0
      let newsIndex = 0
      
      while (newsIndex < newsItems.length && adIndex < advertisementSegments.length) {
        // Agregar las noticias según la frecuencia
        for (let i = 0; i < adConfig.adFrequency && newsIndex < newsItems.length; i++) {
          interleavedTimeline.push(newsItems[newsIndex])
          newsIndex++
        }
        
        // Agregar una frase publicitaria si quedan disponibles
        if (adIndex < advertisementSegments.length) {
          interleavedTimeline.push(advertisementSegments[adIndex])
          adIndex++
        }
      }
      
      // Agregar noticias restantes
      while (newsIndex < newsItems.length) {
        interleavedTimeline.push(newsItems[newsIndex])
        newsIndex++
      }
      
      // Si quedan frases publicitarias, agregarlas al final
      while (adIndex < advertisementSegments.length) {
        interleavedTimeline.push(advertisementSegments[adIndex])
        adIndex++
      }
    } else {
      // Sin publicidad, solo agregar las noticias
      interleavedTimeline.push(...newsItems)
    }
    
    const timeline = interleavedTimeline
    
    // Calcular duración total
    const totalDuration = timeline.reduce((sum, item) => sum + item.duration, 0)
    
    // Estadísticas del modo desarrollador
    const demoStats = {
      mode: 'DESARROLLADOR',
      totalGenerated: scrapedNews.length,
      selected: selectedNews.length,
      sources: [...new Set(scrapedNews.map(n => n.source))],
      categories: [...new Set(scrapedNews.map(n => n.category))],
      avgContentLength: Math.round(scrapedNews.reduce((sum, n) => sum + n.content.length, 0) / scrapedNews.length),
      avgDuration: Math.round(selectedNews.reduce((sum, n) => sum + n.duration, 0) / selectedNews.length),
      targetDuration: targetDuration,
      actualDuration: totalDuration,
      efficiency: Math.round((totalDuration / targetDuration) * 100),
      demoSuccessful: scrapedNews.length > 0
    }
    
    console.log('🚀 MODO DESARROLLADOR - Newscast generation completed:', {
      totalDuration,
      itemCount: timeline.length,
      demoStats
    })

    // Guardar el newscast en Supabase (modo demo)
    const newsReport = await createNewsReport({
      title: `[DEMO] Noticiero ${config.region} - ${new Date().toLocaleDateString('es-CL')}`,
      content: timeline.map(item => item.content).join('\n\n'),
      timeline_data: timeline,
      duration_seconds: totalDuration,
      status: 'generated',
      generation_cost: 0, // Modo demo - sin costo
      token_count: selectedNews.length,
      metadata: {
        region: config.region,
        demoStats,
        processingMethod: 'simulated-demo',
        configuration: config,
        isDemoMode: true,
        generatedAt: new Date().toISOString(),
        demoNotice: 'Este noticiero fue generado en modo desarrollador con noticias simuladas',
        // INFORMACIÓN DE FRASES PUBLICITARIAS
        advertisementInfo: adConfig ? {
          totalAds: adConfig.adCount,
          frequency: adConfig.adFrequency,
          adDuration: adConfig.adDurationPerPhrase,
          totalAdTime: adConfig.totalAdTime,
          message: adConfig.adCount > 0 
            ? `Configurado para ${adConfig.adCount} frases publicitarias cada ${adConfig.adFrequency} noticias`
            : 'Sin frases publicitarias configuradas'
        } : {
          totalAds: 0,
          message: 'Sin frases publicitarias configuradas'
        }
      },
      user_id: userId
    })

    const reportId = newsReport?.id || null
    
    // Log de uso para métricas (modo demo)
    if (demoStats.demoSuccessful) {
      await logTokenUsage({
        user_id: userId,
        service: 'vira-demo',
        operation: 'demo_newscast_generation',
        tokens_used: timeline.length,
        cost: 0, // Modo demo - sin costo
        currency: 'USD',
        metadata: {
          report_id: reportId,
          region: config.region,
          news_count: selectedNews.length,
          demo_mode: true,
          categories: demoStats.categories
        }
      })
    }
    
    // Respuesta con el timeline generado (MODO DEMO)
    return NextResponse.json({
      success: true,
      timeline,
      report_id: reportId,
      metadata: {
        totalDuration,
        targetDuration,
        newsCount: timeline.length,
        region: config.region,
        generatedAt: new Date().toISOString(),
        needsAdjustment: totalDuration > targetDuration,
        demoStats,
        processingMethod: 'simulated-demo',
        isDemoMode: true,
        demoMessage: `🚀 MODO DESARROLLADOR: Se generaron ${selectedNews.length} noticias simuladas para un noticiero de ${Math.floor(totalDuration/60)}:${String(totalDuration%60).padStart(2,'0')} minutos`,
        categories: demoStats.categories,
        efficiency: `${demoStats.efficiency}% de eficiencia de duración`
      }
    })
    
  } catch (error) {
    console.error('Error generating newscast:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al generar el noticiero',
        details: error instanceof Error ? error.message : 'Unknown error',
        errorType: process.env.NODE_ENV === 'development' ? error?.constructor?.name : undefined
      },
      { status: 500 }
    )
  }
}

// Función auxiliar para determinar sentimiento de una noticia
function determineSentiment(content: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['inaugurar', 'éxito', 'crecimiento', 'mejora', 'beneficio', 'logro', 'avance']
  const negativeWords = ['crisis', 'problema', 'accidente', 'muerte', 'crítica', 'fallo', 'pérdida']
  
  const contentLower = content.toLowerCase()
  const positiveCount = positiveWords.filter(word => contentLower.includes(word)).length
  const negativeCount = negativeWords.filter(word => contentLower.includes(word)).length
  
  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}
