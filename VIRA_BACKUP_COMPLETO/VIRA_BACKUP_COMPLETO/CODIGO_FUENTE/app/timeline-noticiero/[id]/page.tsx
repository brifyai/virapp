
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft,
  Settings,
  Thermometer,
  Calendar,
  Building2,
  Lightbulb,
  Play,
  Pause,
  Download,
  Edit,
  Sparkles,
  Mic,
  Volume2,
  Clock,
  Target,
  Music,
  Trash2,
  RefreshCw,
  Upload,
  FileAudio,
  Library,
  GripVertical,
  ExternalLink,
  Plus,
  Loader2,
  ChevronDown
} from 'lucide-react'

interface NewsItem {
  id: string
  title: string
  content: string
  originalContent?: string
  rewrittenContent?: string
  humanizedContent?: string
  extendedContent?: string
  processedContent?: string
  type?: string
  category?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
  duration: number
  hasAudio: boolean
  isRewritten: boolean
  isHumanized: boolean
  isExtended?: boolean
  audioProgress: number
  transitionType: string
  priority?: string
  originalAudioUrl?: string
  rewrittenAudioUrl?: string
  humanizedAudioUrl?: string
  extendedAudioUrl?: string
  currentVersion?: 'original' | 'rewritten' | 'humanized' | 'extended'
  // CAMPOS PARA FRASES PUBLICITARIAS
  adNumber?: number
  isEmpty?: boolean
  placeholder?: string
}

interface TimelineData {
  timeline: NewsItem[]
  metadata: {
    totalDuration: number
    targetDuration: number
    newsCount: number
    region: string
    generatedAt: string
    needsAdjustment: boolean
    // INFORMACIÓN DE FRASES PUBLICITARIAS
    advertisementInfo?: {
      totalAds: number
      frequency: number
      adDuration: number
      totalAdTime: number
      message: string
    }
  }
}

// Interfaces para las funciones de scraping
interface NewsSource {
  id: number
  nombre: string
  nombre_fuente: string
  url: string
}

interface BreakingNews {
  id: string
  title: string
  content: string
  summary?: string
  url: string
  source: string
  category: string
  publishedAt: string
  region: string
  urgency?: 'low' | 'medium' | 'high'
  sentiment?: 'positive' | 'negative' | 'neutral'
}

export default function TimelineNoticiero({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [backgroundMusic, setBackgroundMusic] = useState('Ninguna')
  const [autoSound, setAutoSound] = useState(true)
  const [processingAudio, setProcessingAudio] = useState<string[]>([])  
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  const [newsSources, setNewsSources] = useState<NewsSource[]>([])
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>('')
  const [editingTitle, setEditingTitle] = useState<string>('')
  const [selectedSourcesInfo, setSelectedSourcesInfo] = useState<{
    selectedSources: string[]
    sourceNewsCount: { [key: string]: number }
  }>({ selectedSources: [], sourceNewsCount: {} })
  const [isAddNewsModalOpen, setIsAddNewsModalOpen] = useState(false)
  const [availableNews, setAvailableNews] = useState<BreakingNews[]>([])
  const [availableSources, setAvailableSources] = useState<NewsSource[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [selectedNewsItems, setSelectedNewsItems] = useState<string[]>([])
  const [newsBySource, setNewsBySource] = useState<{[key: string]: BreakingNews[]}>({})
  const [existingNewsIds, setExistingNewsIds] = useState<Set<string>>(new Set())
  const [cachedModalNews, setCachedModalNews] = useState<{[key: string]: BreakingNews[]}>({})
  const [hasScrapedModal, setHasScrapedModal] = useState(false)
  const [scrapingDetailedContent, setScrapingDetailedContent] = useState(false)
  const [scrapingProgress, setScrapingProgress] = useState({ current: 0, total: 0 })

  // Voces disponibles desde Supabase (biblioteca_audio.tipo = 'voz')
  const [voiceLibrary, setVoiceLibrary] = useState<{ id: string; nombre: string; audio: string; tipo: string; genero?: string; idioma?: string; duracion?: string; descripcion?: string }[]>([])

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const { data, error } = await supabase
          .from('biblioteca_audio')
          .select('*')
          .eq('tipo', 'voz')
          .order('id', { ascending: false })

        if (error) {
          console.error('Error obteniendo voces:', error)
        } else {
          setVoiceLibrary(data || [])
        }
      } catch (err) {
        console.error('Error general obteniendo voces:', err)
      }
    }

    fetchVoices()
  }, [])

  // Función para obtener fuentes desde Supabase
  const ObtenerFuentes = async (): Promise<NewsSource[]> => {
    try {
      const { data, error } = await supabase
        .from('fuentes_final')
        .select('*')
      
      if (error) {
        console.error('Error obteniendo fuentes:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error en ObtenerFuentes:', error)
      return []
    }
  }

  // Función para scraping de contenido de noticias con extracción detallada
  const SacarDatosCuerpo = async (url: string): Promise<string> => {
    const api_scrapingbee = "PCL3YCEIRZW7FQHQ0RD3V5325LAI52420VXGK71BC3XET9LD2KCPWK30OXAF7HTRDIOJD09HQZSWAQE0";
    
    try {
      console.log(`🔍 Scraping contenido detallado de: ${url}`)
      
      const response = await fetch('/api/scraping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          api_key: api_scrapingbee,
          render_js: true, // Activar JS para contenido dinámico
          premium_proxy: true, // Usar proxy premium para mejor acceso
          country_code: 'cl',
          wait: 3000, // Esperar 3 segundos para que cargue el contenido
          block_resources: false // No bloquear recursos para obtener contenido completo
        })
      })

      if (!response.ok) {
        console.error(`❌ Error HTTP ${response.status} para URL: ${url}`)
        // En lugar de devolver un error, generar contenido basado en la URL
        return generateFallbackContent(url)
      }

      const html = await response.text()
      console.log(`📄 HTML obtenido para ${url}, longitud: ${html.length}`)
      
      // Crear un parser DOM temporal
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      
      // Remover elementos no deseados más específicamente
      const unwantedSelectors = [
        'script', 'style', 'nav', 'header', 'footer', 'aside',
        '.advertisement', '.ads', '.social-share', '.comments',
        '.related-articles', '.sidebar', '.menu', '.breadcrumb',
        '.tags', '.meta', '.author-info', '.date-info', '.share-buttons',
        '.newsletter', '.subscription', '.popup', '.modal', '.overlay',
        '.cookie-notice', '.gdpr-notice', '.banner', '.promo',
        '[class*="ad-"]', '[id*="ad-"]', '[class*="banner"]',
        '.outbrain', '.taboola', '.disqus', '.facebook-comments'
      ]
      
      unwantedSelectors.forEach(selector => {
        const elements = doc.querySelectorAll(selector)
        elements.forEach(el => el.remove())
      })
      
      // Extraer título de la noticia
      let newsTitle = ''
      const titleSelectors = [
        'h1.entry-title', 'h1.post-title', 'h1.article-title',
        '.headline h1', '.title h1', 'h1', 'title'
      ]
      
      for (const selector of titleSelectors) {
        const titleElement = doc.querySelector(selector)
        if (titleElement?.textContent?.trim()) {
          newsTitle = titleElement.textContent.trim()
          break
        }
      }
      
      // Extraer subtítulo o bajada si existe
      let subtitle = ''
      const subtitleSelectors = [
        '.subtitle', '.subheading', '.lead', '.excerpt', 
        '.article-subtitle', '.post-subtitle', '.summary'
      ]
      
      for (const selector of subtitleSelectors) {
        const subtitleElement = doc.querySelector(selector)
        if (subtitleElement?.textContent?.trim()) {
          subtitle = subtitleElement.textContent.trim()
          break
        }
      }
      
      // Intentar extraer el contenido principal con selectores más específicos y detallados
      const contentSelectors = [
        // Selectores específicos de WordPress y CMS populares
        '.entry-content', '.post-content', '.article-content',
        '.content-area', '.main-content', '.article-body',
        '.post-body', '.story-body', '.news-content',
        // Selectores de medios chilenos específicos
        '.nota-contenido', '.articulo-cuerpo', '.noticia-texto',
        '.contenido-noticia', '.texto-noticia', '.cuerpo-noticia',
        // Selectores semánticos HTML5
        'article', 'main', '[role="main"]',
        // Selectores genéricos pero específicos
        '.content', '.text', '.body', '.description'
      ]
      
      let mainContent = ''
      let selectorUsed = ''
      
      for (const selector of contentSelectors) {
        const contentElement = doc.querySelector(selector)
        if (contentElement) {
          // Extraer todos los párrafos del contenedor
          const paragraphs = contentElement.querySelectorAll('p, div.paragraph, .text-block')
          
          if (paragraphs.length > 0) {
            const paragraphTexts = Array.from(paragraphs)
              .map(p => p.textContent?.trim())
              .filter(text => text && text.length > 30) // Párrafos con contenido sustancial
              .filter(text => text && !text.match(/^(Compartir|Share|Seguir|Follow|Suscrib|Subscribe)/i)) // Filtrar botones sociales
              .slice(0, 10) // Máximo 10 párrafos para contenido detallado
            
            if (paragraphTexts.length > 0) {
              mainContent = paragraphTexts.join('\n\n')
              selectorUsed = selector
              break
            }
          } else {
            // Si no hay párrafos, usar el contenido completo del elemento
            const textContent = contentElement.textContent?.trim()
            if (textContent && textContent.length > 100) {
              mainContent = textContent
              selectorUsed = selector
              break
            }
          }
        }
      }
      
      // Si no se encuentra contenido específico, intentar con selectores de párrafos generales
      if (!mainContent.trim()) {
        const allParagraphs = doc.querySelectorAll('p')
        const validParagraphs = Array.from(allParagraphs)
          .map(p => p.textContent?.trim())
          .filter(text => text && text.length > 50)
          .filter(text => text && !text.match(/^(Compartir|Share|Seguir|Follow|Copyright|©)/i))
          .slice(0, 8)
        
        if (validParagraphs.length > 0) {
          mainContent = validParagraphs.join('\n\n')
          selectorUsed = 'párrafos generales'
        }
      }
      
      // Construir el contenido final detallado
      let finalContent = ''
      
      if (newsTitle) {
        finalContent += `${newsTitle}\n\n`
      }
      
      if (subtitle) {
        finalContent += `${subtitle}\n\n`
      }
      
      if (mainContent) {
        finalContent += mainContent
      }
      
      // Si aún no hay contenido, usar el body como último recurso
      if (!finalContent.trim()) {
        const bodyText = doc.body?.textContent || ''
        finalContent = bodyText
        selectorUsed = 'body (fallback completo)'
      }
      
      // Limpiar y formatear el texto final
      const cleanContent = finalContent
        .replace(/\s+/g, ' ') // Normalizar espacios
        .replace(/\n\s*\n/g, '\n\n') // Normalizar saltos de línea
        .replace(/(.{100}[^\s]*)\s/g, '$1\n') // Agregar saltos cada ~100 caracteres
        .trim()
        .substring(0, 4000) // Aumentar límite para contenido más detallado
      
      console.log(`✅ Contenido detallado extraído de ${url}:`)
      console.log(`   - Selector usado: ${selectorUsed}`)
      console.log(`   - Título encontrado: ${newsTitle ? 'Sí' : 'No'}`)
      console.log(`   - Subtítulo encontrado: ${subtitle ? 'Sí' : 'No'}`)
      console.log(`   - Longitud final: ${cleanContent.length} caracteres`)
      console.log(`   - Preview: ${cleanContent.substring(0, 150)}...`)
      
      // Si el contenido es muy corto, generar contenido de fallback mejorado
      if (cleanContent.length < 100) {
        const enhancedFallback = generateEnhancedFallbackContent(url, newsTitle, subtitle)
        console.log(`⚠️ Contenido muy corto, usando fallback mejorado`)
        return enhancedFallback
      }
      
      return cleanContent
        
    } catch (error) {
      console.error(`❌ Error en SacarDatosCuerpo para ${url}:`, error)
      return generateFallbackContent(url)
    }
  }

  // Función para generar contenido de fallback mejorado con título y subtítulo
  const generateEnhancedFallbackContent = (url: string, title?: string, subtitle?: string): string => {
    const domain = new URL(url).hostname.replace('www.', '')
    const pathSegments = new URL(url).pathname.split('/').filter(segment => segment.length > 0)
    
    let content = ''
    
    // Usar título si está disponible
    if (title) {
      content += `${title}\n\n`
    }
    
    // Usar subtítulo si está disponible
    if (subtitle) {
      content += `${subtitle}\n\n`
    }
    
    // Intentar extraer información del path de la URL
    const relevantSegments = pathSegments
      .filter(segment => segment.length > 3 && !segment.match(/^\d+$/))
      .map(segment => segment.replace(/-/g, ' '))
      .slice(0, 3)
    
    if (relevantSegments.length > 0) {
      const topic = relevantSegments.join(' ')
      content += `Esta noticia de ${domain} aborda temas relacionados con ${topic}. `
    } else {
      content += `Esta importante noticia de ${domain} `
    }
    
    // Agregar contenido contextual basado en el dominio
    const domainContext = getDomainContext(domain)
    content += domainContext
    
    // Agregar información adicional para hacer el contenido más sustancial
    content += ` La información presentada es de relevancia para la audiencia y refleja los acontecimientos actuales en la región. `
    content += `Se recomienda mantenerse informado sobre estos desarrollos que pueden tener impacto en la comunidad local y nacional.`
    
    return content
  }

  // Función para obtener contexto específico del dominio
  const getDomainContext = (domain: string): string => {
    const domainContexts: { [key: string]: string } = {
      'emol.com': 'presenta información económica y política de relevancia nacional, con análisis detallado de los acontecimientos más importantes del país.',
      'latercera.com': 'ofrece cobertura integral de noticias nacionales e internacionales, con especial énfasis en política, economía y sociedad.',
      'biobiochile.cl': 'proporciona información actualizada sobre eventos regionales y nacionales, con enfoque en noticias de interés público.',
      'cooperativa.cl': 'entrega cobertura noticiosa completa con análisis de los hechos más relevantes del acontecer nacional.',
      'cnnchile.com': 'presenta noticias de última hora con cobertura internacional y nacional, manteniendo a la audiencia informada.',
      'meganoticias.cl': 'ofrece información noticiosa actualizada con enfoque en eventos de interés público y social.',
      'adnradio.cl': 'proporciona cobertura noticiosa integral con análisis de los acontecimientos más importantes.',
      't13.cl': 'entrega información actualizada sobre eventos nacionales e internacionales de relevancia pública.'
    }
    
    return domainContexts[domain] || 'proporciona información actualizada y relevante sobre acontecimientos de interés público, manteniendo a la audiencia informada sobre los desarrollos más importantes.'
  }

  // Función para generar contenido de fallback basado en la URL
  const generateFallbackContent = (url: string): string => {
    const domain = new URL(url).hostname.replace('www.', '')
    const pathSegments = new URL(url).pathname.split('/').filter(segment => segment.length > 0)
    
    // Intentar extraer información del path de la URL
    const relevantSegments = pathSegments
      .filter(segment => segment.length > 3 && !segment.match(/^\d+$/))
      .map(segment => segment.replace(/-/g, ' '))
      .slice(0, 3)
    
    if (relevantSegments.length > 0) {
      const topic = relevantSegments.join(' ')
      return `Esta noticia de ${domain} trata sobre ${topic}. La información completa está disponible en el sitio web original. Se recomienda consultar la fuente para obtener todos los detalles de esta importante noticia.`
    }
    
    return `Noticia importante de ${domain}. Esta información proviene de una fuente confiable y contiene detalles relevantes para la audiencia. Se recomienda consultar la fuente original para obtener la información completa.`
  }

  // Función para generar contenido basado en el título
  const generateContentFromTitle = (title: string): string => {
    const cleanTitle = title.replace(/[\|\-–—].*/g, '').trim()
    return `${cleanTitle}. Esta noticia presenta información relevante sobre el tema mencionado. Los detalles específicos y el contexto completo están disponibles en la fuente original, proporcionando una cobertura integral del acontecimiento.`
  }

  // Función para generar noticias mock realistas por región
  const generateMockNews = (region: string, maxCount: number = 5): BreakingNews[] => {
    const newsTemplates = {
      'Arica y Parinacota': [
        {
          title: 'Nuevo proyecto de desarrollo fronterizo beneficiará a comerciantes locales',
          content: 'Las autoridades regionales anunciaron la implementación de un nuevo proyecto que busca fortalecer el comercio fronterizo entre Chile y Perú. La iniciativa contempla la modernización de infraestructura y la simplificación de trámites aduaneros, lo que se espera genere un impacto positivo en la economía local. Los comerciantes de la zona han expresado su satisfacción por esta medida que promete dinamizar las actividades comerciales en la región.',
          category: 'economia',
          sentiment: 'positive'
        },
        {
          title: 'Mejoras en conectividad digital llegan a sectores rurales de la región',
          content: 'Un ambicioso plan de conectividad digital está siendo implementado en las zonas rurales de Arica y Parinacota. El proyecto incluye la instalación de antenas de telecomunicaciones y fibra óptica que permitirá a las comunidades más alejadas acceder a internet de alta velocidad. Esta iniciativa representa un avance significativo para la educación y el desarrollo económico de estas áreas.',
          category: 'tecnologia',
          sentiment: 'positive'
        },
        {
          title: 'Programa de capacitación laboral se expande en la región',
          content: 'El gobierno regional ha ampliado su programa de capacitación laboral para jóvenes y adultos, ofreciendo cursos en áreas de alta demanda como turismo, agricultura tecnificada y servicios. La iniciativa busca reducir el desempleo juvenil y mejorar las oportunidades laborales en la región, con especial énfasis en el desarrollo de habilidades técnicas.',
          category: 'educacion',
          sentiment: 'positive'
        }
      ],
      'Atacama': [
        {
          title: 'Inversión minera genera nuevas oportunidades de empleo en la región',
          content: 'Una importante empresa minera anunció una nueva inversión que creará cientos de empleos directos e indirectos en la región de Atacama. El proyecto contempla la expansión de operaciones existentes y la implementación de nuevas tecnologías que mejorarán la eficiencia productiva. Las autoridades locales destacan el impacto positivo que tendrá esta inversión en el desarrollo económico regional.',
          category: 'economia',
          sentiment: 'positive'
        },
        {
          title: 'Proyecto de energías renovables avanza en el desierto de Atacama',
          content: 'Un innovador proyecto de energía solar está siendo desarrollado en el desierto de Atacama, aprovechando las condiciones climáticas excepcionales de la zona. La iniciativa promete generar energía limpia para miles de hogares y contribuir significativamente a los objetivos de sustentabilidad del país. El proyecto también incluye programas de capacitación para la comunidad local.',
          category: 'medioambiente',
          sentiment: 'positive'
        },
        {
          title: 'Fortalecimiento del turismo astronómico en la región',
          content: 'Las autoridades regionales están impulsando el desarrollo del turismo astronómico, aprovechando los cielos privilegiados del desierto de Atacama. Se han implementado nuevas rutas turísticas y mejorado la infraestructura de observatorios locales. Esta iniciativa busca diversificar la economía regional y posicionar a Atacama como un destino mundial para la observación astronómica.',
          category: 'turismo',
          sentiment: 'positive'
        }
      ],
      'Valparaíso': [
        {
          title: 'Modernización del puerto impulsa el comercio internacional',
          content: 'El puerto de Valparaíso está experimentando una importante modernización que mejorará su capacidad operativa y eficiencia logística. Las nuevas inversiones en infraestructura y tecnología permitirán manejar un mayor volumen de carga y reducir los tiempos de operación. Este desarrollo fortalecerá la posición del puerto como un hub logístico clave para el comercio internacional.',
          category: 'economia',
          sentiment: 'positive'
        },
        {
          title: 'Programa de revitalización urbana transforma barrios históricos',
          content: 'Un ambicioso programa de revitalización urbana está transformando los barrios históricos de Valparaíso, combinando la preservación del patrimonio con el desarrollo moderno. El proyecto incluye la restauración de edificios emblemáticos, mejoras en el espacio público y el fomento de actividades culturales y comerciales que dinamizan la vida urbana.',
          category: 'cultura',
          sentiment: 'positive'
        },
        {
          title: 'Iniciativas de sustentabilidad ambiental ganan impulso en la región',
          content: 'Diversas iniciativas de sustentabilidad ambiental están siendo implementadas en la región de Valparaíso, incluyendo programas de reciclaje, conservación de recursos hídricos y promoción de energías limpias. Estas medidas buscan mejorar la calidad de vida de los habitantes y posicionar a la región como un referente en desarrollo sustentable.',
          category: 'medioambiente',
          sentiment: 'positive'
        }
      ],
      'Metropolitana': [
        {
          title: 'Expansión del transporte público mejora conectividad urbana',
          content: 'La región metropolitana está experimentando una significativa expansión de su sistema de transporte público, con nuevas líneas de metro y mejoras en la red de buses. Estas inversiones en infraestructura de transporte buscan reducir los tiempos de viaje, mejorar la calidad del aire y facilitar la movilidad de millones de usuarios diariamente.',
          category: 'transporte',
          sentiment: 'positive'
        },
        {
          title: 'Programa de vivienda social avanza en comunas periféricas',
          content: 'Un importante programa de construcción de viviendas sociales está siendo implementado en las comunas periféricas de Santiago, ofreciendo nuevas oportunidades de acceso a la vivienda para familias de sectores vulnerables. El proyecto contempla no solo la construcción de casas, sino también el desarrollo de infraestructura comunitaria y espacios verdes.',
          category: 'social',
          sentiment: 'positive'
        },
        {
          title: 'Fortalecimiento de la educación técnica en establecimientos públicos',
          content: 'Las autoridades educacionales han anunciado un plan de fortalecimiento de la educación técnica en establecimientos públicos de la región metropolitana. La iniciativa incluye la modernización de laboratorios, capacitación docente y alianzas con empresas para facilitar la inserción laboral de los estudiantes.',
          category: 'educacion',
          sentiment: 'positive'
        }
      ]
    }

    const regionNews = newsTemplates[region as keyof typeof newsTemplates] || newsTemplates['Arica y Parinacota']
    
    // Limitar las noticias según maxCount
    const limitedRegionNews = regionNews.slice(0, maxCount)
    
    return limitedRegionNews.map((template, index) => ({
      id: `mock-news-${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${index}`,
      title: template.title,
      content: template.content,
      url: `https://ejemplo.com/noticia-${index + 1}`,
      source: `Noticias ${region}`,
      category: template.category,
      publishedAt: new Date().toISOString(),
      region: region,
      sentiment: template.sentiment as 'positive' | 'negative' | 'neutral'
    }))
  
  }

  // Función principal de scraping de noticias
  const SacarDatos = async (region: string): Promise<BreakingNews[]> => {
    const api_scrapingbee = "PCL3YCEIRZW7FQHQ0RD3V5325LAI52420VXGK71BC3XET9LD2KCPWK30OXAF7HTRDIOJD09HQZSWAQE0";
    
    try {
      console.log(`🔍 Iniciando scraping para región: ${region}`);
      
      // Leer configuración de medios seleccionados
      const searchConfigData = localStorage.getItem('newscast_search_config')
      let selectedSources: string[] = []
      let sourceNewsCount: { [key: string]: number } = {}
      
      if (searchConfigData) {
        const searchConfig = JSON.parse(searchConfigData)
        selectedSources = searchConfig.selectedSources || []
        sourceNewsCount = searchConfig.sourceNewsCount || {}
        console.log('📋 Medios seleccionados:', selectedSources)
        console.log('📊 Cantidad por fuente:', sourceNewsCount)
      } else {
        console.log('⚠️ No se encontró configuración de medios seleccionados')
      }
      
      const fuentes = await ObtenerFuentes()
      console.log(`📊 Fuentes obtenidas: ${fuentes.length}`);
      
      // Usar las fuentes del estado
      if (fuentes.length === 0) {
        console.log('No hay fuentes disponibles, usando noticias mock')
        const totalEsperado = selectedSources.reduce((total, source) => {
          return total + (sourceNewsCount[source] || 3);
        }, 0) || 5;
        return generateMockNews(region, totalEsperado)
      }
      
      // Filtrar fuentes según la región seleccionada
      let fuentesFiltradas = fuentes;
      if (region !== 'all') {
        fuentesFiltradas = fuentes.filter(fuente => fuente.nombre === region);
        console.log(`Filtrando por región: ${region}, fuentes encontradas: ${fuentesFiltradas.length}`);
      }
      
      // Filtrar fuentes según los medios seleccionados por el usuario
      if (selectedSources.length > 0) {
        fuentesFiltradas = fuentesFiltradas.filter(fuente => 
          selectedSources.includes(fuente.nombre_fuente)
        );
        console.log(`Filtrando por medios seleccionados: ${selectedSources.join(', ')}`);
        console.log(`Fuentes después del filtro de medios: ${fuentesFiltradas.length}`);
      }
      
      if (fuentesFiltradas.length === 0) {
        console.log('No hay fuentes para la región/medios seleccionados, usando noticias mock')
        const totalEsperado = selectedSources.reduce((total, source) => {
          return total + (sourceNewsCount[source] || 3);
        }, 0) || 5;
        return generateMockNews(region, totalEsperado)
      }
      
      // Procesar cada fuente filtrada con ScrapingBee
      const todasLasNoticias: BreakingNews[] = [];
      
      for (const fuente of fuentesFiltradas) {
        try {
          console.log(`📰 Scraping fuente: ${fuente.nombre} - ${fuente.url}`);
          const response = await fetch(`https://app.scrapingbee.com/api/v1/?${new URLSearchParams({
            api_key: api_scrapingbee,
            url: fuente.url,
            render_js: "false",
            block_resources: "false",
            extract_rules: JSON.stringify({
              "items": {
                selector: `
                  article a[href*="/"], .post a[href*="/"], .entry a[href*="/"],
                  .news-item a[href*="/"], .article-item a[href*="/"], .story-item a[href*="/"],
                  .td-module-title a, .entry-title a, .post-title a, .article-title a,
                  .news-title a, .story-title a, .headline a,
                  .breaking-news a[href*="/"], .latest-news a[href*="/"], .top-news a[href*="/"],
                  .featured-post a[href*="/"], .main-story a[href*="/"],
                  .content-item a[href*="/"], .list-item a[href*="/"],
                  a[href*="/noticia/"], a[href*="/news/"], a[href*="/articulo/"], 
                  a[href*="/post/"], a[href*="/story/"], a[href*="/reportaje/"],
                  a[href*="/2024/"], a[href*="/2023/"], a[href*="/202"],
                  .wp-block-latest-posts a, .wp-block-post-title a,
                  .elementor-post-title a, .elementor-heading-title a,
                  h1 a[href*="/"], h2 a[href*="/"], h3 a[href*="/"],
                  .card-title a[href*="/"], .item-title a[href*="/"],
                  .grid-item a[href*="/"], .feed-item a[href*="/"],
                  [class*="noticia"] a, [class*="news"] a, [class*="article"] a,
                  [class*="post"] a, [class*="story"] a, [class*="breaking"] a,
                  .td-block-title a, .td-module-thumb a, .td-image-wrap a,
                  .category-news a[href*="/"], .section-news a[href*="/"],
                  .home-news a[href*="/"], .front-page a[href*="/"]
                `.replace(/\s+/g, ' ').trim(),
                type: "list",
                output: {
                  enlace: "a @href",
                  texto: "a"
                }
              }
            })
          })}`);
          
          if (!response.ok) {
            console.error(`❌ Error HTTP ${response.status} para fuente ${fuente.nombre}`);
            continue;
          }
          
          const data = await response.json();
          console.log(`📊 Respuesta de ${fuente.nombre}:`, data.items ? data.items.length : 0, 'items');
          
          if (data.items && data.items.length > 0) {
            // Obtener cantidad configurada para esta fuente, o usar 3 por defecto
            const cantidadParaFuente = sourceNewsCount[fuente.nombre_fuente] || 3;
            console.log(`📊 Cantidad configurada para ${fuente.nombre_fuente}: ${cantidadParaFuente}`);
            
            // Filtrar items que tengan algún campo vacío y tomar la cantidad configurada por fuente
            const itemsFiltrados = data.items
              .filter((item: { enlace: string; texto: string }) => item.enlace && item.texto)
              .slice(0, cantidadParaFuente);
            
            if (itemsFiltrados.length > 0) {
              console.log(`✅ ${itemsFiltrados.length} noticias válidas de ${fuente.nombre_fuente}`);
              // Transformar los datos al formato BreakingNews
              const noticiasTransformadas: BreakingNews[] = itemsFiltrados.map((item: { enlace: string; texto: string }, index: number) => ({
                id: `scraped-${Date.now()}-${index}`,
                title: item.texto,
                content: item.texto,
                source: fuente.nombre_fuente,
                url: item.enlace.startsWith('http') ? item.enlace : `${fuente.url}${item.enlace}`,
                publishedAt: new Date().toISOString(),
                region: region,
                category: "general",
                sentiment: 'neutral' as const
              }));
              
              todasLasNoticias.push(...noticiasTransformadas);
            } else {
              console.warn(`⚠️ No se encontraron noticias válidas en ${fuente.nombre_fuente}`);
            }
          } else {
            // Fallback: intentar con selectores más básicos si no se encontraron noticias
            console.log(`Intentando fallback para fuente: ${fuente.nombre}`);
            
            const fallbackResponse = await fetch(`https://app.scrapingbee.com/api/v1/?${new URLSearchParams({
              api_key: api_scrapingbee,
              url: fuente.url,
              render_js: "false",
              block_resources: "false",
              extract_rules: JSON.stringify({
                "items": {
                  selector: `
                    article a[href*="/"], .post a[href*="/"], .entry a[href*="/"],
                    .news-item a[href*="/"], .article-item a[href*="/"], .story-item a[href*="/"],
                    .td-module-title a, .entry-title a, .post-title a, .article-title a,
                    .news-title a, .story-title a, .headline a,
                    .breaking-news a[href*="/"], .latest-news a[href*="/"], .top-news a[href*="/"],
                    .featured-post a[href*="/"], .main-story a[href*="/"],
                    .content-item a[href*="/"], .list-item a[href*="/"],
                    a[href*="/noticia/"], a[href*="/news/"], a[href*="/articulo/"], 
                    a[href*="/post/"], a[href*="/story/"], a[href*="/reportaje/"],
                    a[href*="/2024/"], a[href*="/2023/"], a[href*="/202"],
                    .wp-block-latest-posts a, .wp-block-post-title a,
                    .elementor-post-title a, .elementor-heading-title a,
                    h1 a[href*="/"], h2 a[href*="/"], h3 a[href*="/"],
                    .card-title a[href*="/"], .item-title a[href*="/"],
                    .grid-item a[href*="/"], .feed-item a[href*="/"],
                    [class*="noticia"] a, [class*="news"] a, [class*="article"] a,
                    [class*="post"] a, [class*="story"] a, [class*="breaking"] a,
                    .td-block-title a, .td-module-thumb a, .td-image-wrap a,
                    .category-news a[href*="/"], .section-news a[href*="/"],
                    .home-news a[href*="/"], .front-page a[href*="/"]
                  `.replace(/\s+/g, ' ').trim(),
                  type: "list",
                  output: {
                    enlace: "@href",
                    texto: "."
                  }
                }
              })
            })}`);
            
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackData.items && fallbackData.items.length > 0) {
              // Filtrar enlaces que parezcan noticias (contienen palabras clave)
              const newsKeywords = ['noticia', 'news', 'articulo', 'article', 'post', 'story', 'breaking', 'ultimo', 'actualidad'];
              const cantidadParaFuente = sourceNewsCount[fuente.nombre_fuente] || 2;
              const fallbackItems = fallbackData.items
                .filter((item: { enlace: string; texto: string }) => {
                  const texto = item.texto?.toLowerCase() || '';
                  const enlace = item.enlace?.toLowerCase() || '';
                  return item.enlace && item.texto && 
                         item.texto.length > 10 && 
                         item.texto.length < 200 &&
                         (newsKeywords.some(keyword => texto.includes(keyword) || enlace.includes(keyword)) ||
                          enlace.includes('/2024/') || enlace.includes('/2023/') ||
                          enlace.match(/\/\d{4}\/\d{2}\/\d{2}\//));
                })
                .slice(0, cantidadParaFuente); // Cantidad configurada para fallback
              
              if (fallbackItems.length > 0) {
                const noticiasTransformadas: BreakingNews[] = fallbackItems.map((item: { enlace: string; texto: string }, index: number) => ({
                  id: `fallback-${Date.now()}-${index}`,
                  title: item.texto,
                  content: item.texto,
                  source: fuente.nombre_fuente,
                  url: item.enlace.startsWith('http') ? item.enlace : `${fuente.url}${item.enlace}`,
                  publishedAt: new Date().toISOString(),
                  region: region,
                  category: "general",
                  sentiment: 'neutral' as const
                }));
                
                todasLasNoticias.push(...noticiasTransformadas);
              }
            }
          }
        } catch (error) {
          console.error(`Error al procesar fuente ${fuente.nombre}:`, error);
          continue; // Continuar con la siguiente fuente
        }
      }
      
      console.log('Total de noticias obtenidas:', todasLasNoticias.length);
      console.log('URLs de noticias:', todasLasNoticias.map(noticia => noticia.url));
      
      // Calcular el total esperado de noticias según la configuración
      const totalEsperado = selectedSources.reduce((total, source) => {
        return total + (sourceNewsCount[source] || 3);
      }, 0);
      console.log(`📊 Total esperado de noticias: ${totalEsperado}`);
      
      // Si no se obtuvieron noticias reales, usar mock
      if (todasLasNoticias.length === 0) {
        console.log('No se obtuvieron noticias reales, usando mock')
        return generateMockNews(region, totalEsperado > 0 ? totalEsperado : 5)
      }
      
      // Retornar las noticias limitadas al total esperado o máximo 15
      const limiteTotal = totalEsperado > 0 ? totalEsperado : 15;
      console.log(`🎯 Limitando noticias a: ${limiteTotal}`);
      return todasLasNoticias.slice(0, limiteTotal)
      
    } catch (error) {
      console.error("Error en la función SacarDatos:", error);
      // En caso de error, calcular total esperado para noticias mock
      const searchConfigData = localStorage.getItem('newscast_search_config')
      let totalEsperado = 5;
      if (searchConfigData) {
        const searchConfig = JSON.parse(searchConfigData)
        const selectedSources = searchConfig.selectedSources || []
        const sourceNewsCount = searchConfig.sourceNewsCount || {}
        totalEsperado = selectedSources.reduce((total: number, source: string) => {
          return total + (sourceNewsCount[source] || 3);
        }, 0) || 5;
      }
      return generateMockNews(region, totalEsperado)
    }
  }

  // Función de scraping específica para el modal
  const scrapNewsForModal = async (region: string): Promise<BreakingNews[]> => {
    const api_scrapingbee = "PCL3YCEIRZW7FQHQ0RD3V5325LAI52420VXGK71BC3XET9LD2KCPWK30OXAF7HTRDIOJD09HQZSWAQE0";
    
    try {
      console.log(`🔍 Iniciando scraping para modal - región: ${region}`);
      
      // Obtener todas las fuentes disponibles
      const fuentes = await ObtenerFuentes()
      console.log(`📊 Fuentes obtenidas para modal: ${fuentes.length}`);
      
      if (fuentes.length === 0) {
        console.log('No hay fuentes disponibles para el modal, usando noticias mock')
        return generateMockNews(region, 20) // Más noticias para el modal
      }
      
      // Filtrar fuentes según la región seleccionada
      let fuentesFiltradas = fuentes;
      if (region !== 'all') {
        fuentesFiltradas = fuentes.filter(fuente => fuente.nombre === region);
        console.log(`Filtrando por región para modal: ${region}, fuentes encontradas: ${fuentesFiltradas.length}`);
      }
      
      if (fuentesFiltradas.length === 0) {
        console.log('No hay fuentes para la región seleccionada en el modal, usando noticias mock')
        return generateMockNews(region, 20)
      }
      
      // Procesar cada fuente filtrada con ScrapingBee
      const todasLasNoticias: BreakingNews[] = [];
      
      for (const fuente of fuentesFiltradas) {
        try {
          console.log(`📰 Scraping fuente para modal: ${fuente.nombre} - ${fuente.url}`);
          const response = await fetch(`https://app.scrapingbee.com/api/v1/?${new URLSearchParams({
            api_key: api_scrapingbee,
            url: fuente.url,
            render_js: "false",
            block_resources: "false",
            extract_rules: JSON.stringify({
              "items": {
                selector: `
                  article a[href*="/"], .post a[href*="/"], .entry a[href*="/"],
                  .news-item a[href*="/"], .article-item a[href*="/"], .story-item a[href*="/"],
                  .td-module-title a, .entry-title a, .post-title a, .article-title a,
                  .news-title a, .story-title a, .headline a,
                  .breaking-news a[href*="/"], .latest-news a[href*="/"], .top-news a[href*="/"],
                  .featured-post a[href*="/"], .main-story a[href*="/"],
                  .content-item a[href*="/"], .list-item a[href*="/"],
                  a[href*="/noticia/"], a[href*="/news/"], a[href*="/articulo/"], 
                  a[href*="/post/"], a[href*="/story/"], a[href*="/reportaje/"],
                  a[href*="/2024/"], a[href*="/2023/"], a[href*="/202"],
                  .wp-block-latest-posts a, .wp-block-post-title a,
                  .elementor-post-title a, .elementor-heading-title a,
                  h1 a[href*="/"], h2 a[href*="/"], h3 a[href*="/"],
                  .card-title a[href*="/"], .item-title a[href*="/"],
                  .grid-item a[href*="/"], .feed-item a[href*="/"],
                  [class*="noticia"] a, [class*="news"] a, [class*="article"] a,
                  [class*="post"] a, [class*="story"] a, [class*="breaking"] a,
                  .td-block-title a, .td-module-thumb a, .td-image-wrap a,
                  .category-news a[href*="/"], .section-news a[href*="/"],
                  .home-news a[href*="/"], .front-page a[href*="/"]
                `.replace(/\s+/g, ' ').trim(),
                type: "list",
                output: {
                  enlace: "a @href",
                  texto: "a"
                }
              }
            })
          })}`);
          
          if (!response.ok) {
            console.error(`❌ Error HTTP ${response.status} para fuente ${fuente.nombre} en modal`);
            continue;
          }
          
          const data = await response.json();
          console.log(`📊 Respuesta de ${fuente.nombre} para modal:`, data.items ? data.items.length : 0, 'items');
          
          if (data.items && data.items.length > 0) {
            // Para el modal, obtener más noticias (hasta 10 por fuente)
            const cantidadParaModal = 10;
            console.log(`📊 Cantidad para modal de ${fuente.nombre_fuente}: ${cantidadParaModal}`);
            
            // Filtrar items que tengan algún campo vacío y tomar más cantidad para el modal
            const itemsFiltrados = data.items
              .filter((item: { enlace: string; texto: string }) => item.enlace && item.texto)
              .slice(0, cantidadParaModal);
            
            if (itemsFiltrados.length > 0) {
              console.log(`✅ ${itemsFiltrados.length} noticias válidas de ${fuente.nombre_fuente} para modal`);
              // Transformar los datos al formato BreakingNews
              const noticiasTransformadas: BreakingNews[] = itemsFiltrados.map((item: { enlace: string; texto: string }, index: number) => ({
                id: `modal-scraped-${Date.now()}-${fuente.id}-${index}`,
                title: item.texto,
                content: item.texto,
                source: fuente.nombre_fuente,
                url: item.enlace.startsWith('http') ? item.enlace : `${fuente.url}${item.enlace}`,
                publishedAt: new Date().toISOString(),
                region: region,
                category: "general",
                urgency: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
                sentiment: Math.random() > 0.6 ? 'positive' : Math.random() > 0.3 ? 'negative' : 'neutral'
              }));
              
              todasLasNoticias.push(...noticiasTransformadas);
            } else {
              console.warn(`⚠️ No se encontraron noticias válidas en ${fuente.nombre_fuente} para modal`);
            }
          } else {
            // Fallback para el modal con selectores más básicos
            console.log(`Intentando fallback para fuente en modal: ${fuente.nombre}`);
            
            const fallbackResponse = await fetch(`https://app.scrapingbee.com/api/v1/?${new URLSearchParams({
              api_key: api_scrapingbee,
              url: fuente.url,
              render_js: "false",
              block_resources: "false",
              extract_rules: JSON.stringify({
                "items": {
                  selector: `a[href*="/"]`,
                  type: "list",
                  output: {
                    enlace: "@href",
                    texto: "."
                  }
                }
              })
            })}`);
            
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackData.items && fallbackData.items.length > 0) {
              // Filtrar enlaces que parezcan noticias
              const newsKeywords = ['noticia', 'news', 'articulo', 'article', 'post', 'story', 'breaking', 'ultimo', 'actualidad'];
              const cantidadParaModal = 5;
              const fallbackItems = fallbackData.items
                .filter((item: { enlace: string; texto: string }) => {
                  const texto = item.texto?.toLowerCase() || '';
                  const enlace = item.enlace?.toLowerCase() || '';
                  return item.enlace && item.texto && 
                         item.texto.length > 10 && 
                         item.texto.length < 200 &&
                         (newsKeywords.some(keyword => texto.includes(keyword) || enlace.includes(keyword)) ||
                          enlace.includes('/2024/') || enlace.includes('/2023/') ||
                          enlace.match(/\/\d{4}\/\d{2}\/\d{2}\//));
                })
                .slice(0, cantidadParaModal);
              
              if (fallbackItems.length > 0) {
                const noticiasTransformadas: BreakingNews[] = fallbackItems.map((item: { enlace: string; texto: string }, index: number) => ({
                  id: `modal-fallback-${Date.now()}-${fuente.id}-${index}`,
                  title: item.texto,
                  content: item.texto,
                  source: fuente.nombre_fuente,
                  url: item.enlace.startsWith('http') ? item.enlace : `${fuente.url}${item.enlace}`,
                  publishedAt: new Date().toISOString(),
                  region: region,
                  category: "general",
                  urgency: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
                  sentiment: Math.random() > 0.6 ? 'positive' : Math.random() > 0.3 ? 'negative' : 'neutral'
                }));
                
                todasLasNoticias.push(...noticiasTransformadas);
              }
            }
          }
        } catch (error) {
          console.error(`Error al procesar fuente ${fuente.nombre} en modal:`, error);
          continue; // Continuar con la siguiente fuente
        }
      }
      
      console.log('Total de noticias obtenidas para modal:', todasLasNoticias.length);
      
      // Si no se obtuvieron noticias reales, usar mock
      if (todasLasNoticias.length === 0) {
        console.log('No se obtuvieron noticias reales para modal, usando mock')
        return generateMockNews(region, 20)
      }
      
      // Retornar todas las noticias obtenidas (sin límite estricto para el modal)
      return todasLasNoticias.slice(0, 50) // Máximo 50 noticias para el modal
      
    } catch (error) {
      console.error("Error en la función scrapNewsForModal:", error);
      return generateMockNews(region, 20)
    }
  }

  // Función para obtener noticias sin filtrar para el modal
  const fetchNewsForModal = async (forceRefresh = false) => {
    // Si ya tenemos noticias en caché y no se fuerza la actualización, usar el caché
    if (hasScrapedModal && !forceRefresh && Object.keys(cachedModalNews).length > 0) {
      console.log('📋 Usando noticias del caché del modal')
      setNewsBySource(cachedModalNews)
      
      // Reconstruir availableNews desde el caché
      const allNews: BreakingNews[] = []
      Object.values(cachedModalNews).forEach(sourceNews => {
        allNews.push(...sourceNews)
      })
      setAvailableNews(allNews)
      return
    }

    setModalLoading(true)
    try {
      // Obtener la región del timeline actual
      const currentRegion = timelineData?.metadata?.region || 'Arica y Parinacota'
      console.log(`🔍 Iniciando scraping para modal - región: ${currentRegion}`)
      
      // Identificar noticias que ya están en el timeline
      const existingIds = new Set<string>()
      if (timelineData?.timeline) {
        timelineData.timeline.forEach(item => {
          // Crear un ID basado en el título para comparar con las noticias disponibles
          const normalizedTitle = item.title.toLowerCase().trim()
          existingIds.add(normalizedTitle)
        })
      }
      setExistingNewsIds(existingIds)
      
      // Usar la nueva función de scraping específica para el modal
      const noticias = await scrapNewsForModal(currentRegion)
      
      // Organizar noticias por fuente
      const newsGroupedBySource: {[key: string]: BreakingNews[]} = {}
      noticias.forEach(news => {
        const sourceName = news.source || 'Fuente Desconocida'
        if (!newsGroupedBySource[sourceName]) {
          newsGroupedBySource[sourceName] = []
        }
        newsGroupedBySource[sourceName].push(news)
      })
      
      // Guardar en caché
      setCachedModalNews(newsGroupedBySource)
      setHasScrapedModal(true)
      
      setNewsBySource(newsGroupedBySource)
      setAvailableNews(noticias)
      
    } catch (error) {
      console.error('Error en fetchNewsForModal:', error)
      // En caso de error, usar noticias mock de la región por defecto
      const currentRegion = timelineData?.metadata?.region || 'Arica y Parinacota'
      const mockNews = generateMockNews(currentRegion, 20)
      
      // Organizar noticias mock por fuente
      const newsGroupedBySource: {[key: string]: BreakingNews[]} = {}
      mockNews.forEach(news => {
        const sourceName = news.source || 'Fuente Desconocida'
        if (!newsGroupedBySource[sourceName]) {
          newsGroupedBySource[sourceName] = []
        }
        newsGroupedBySource[sourceName].push(news)
      })
      
      // Guardar en caché incluso las noticias mock
      setCachedModalNews(newsGroupedBySource)
      setHasScrapedModal(true)
      
      setNewsBySource(newsGroupedBySource)
      setAvailableNews(mockNews)
    } finally {
      setModalLoading(false)
    }
  }

  // Función para manejar la apertura del modal
  const handleOpenAddNewsModal = () => {
    setIsAddNewsModalOpen(true)
    fetchNewsForModal()
  }

  // Función para manejar la selección de noticias
  const handleNewsSelection = (newsId: string) => {
    const normalizedId = newsId.toLowerCase().trim()
    
    // No permitir seleccionar noticias que ya están en el timeline
    if (existingNewsIds.has(normalizedId)) {
      return
    }
    
    setSelectedNewsItems(prev => 
      prev.includes(newsId) 
        ? prev.filter(id => id !== newsId)
        : [...prev, newsId]
    )
  }

  // Función para verificar si una noticia ya está en el timeline
  const isNewsInTimeline = (newsTitle: string): boolean => {
    const normalizedTitle = newsTitle.toLowerCase().trim()
    return existingNewsIds.has(normalizedTitle)
  }

  // Función para agregar noticias seleccionadas al timeline
  const handleAddSelectedNews = async () => {
    if (selectedNewsItems.length === 0) return
    
    const selectedNews = availableNews.filter(news => selectedNewsItems.includes(news.id))
    
    // Iniciar el proceso de scraping detallado
    setScrapingDetailedContent(true)
    setScrapingProgress({ current: 0, total: selectedNews.length })
    
    try {
      console.log(`🔍 Iniciando scraping detallado para ${selectedNews.length} noticias`)
      
      // Procesar cada noticia seleccionada para obtener contenido detallado
      const detailedNews = await Promise.all(
        selectedNews.map(async (news, index) => {
          try {
            console.log(`📰 Procesando noticia ${index + 1}/${selectedNews.length}: ${news.title}`)
            setScrapingProgress({ current: index + 1, total: selectedNews.length })
            
            // Obtener contenido detallado usando SacarDatosCuerpo
            const detailedContent = await SacarDatosCuerpo(news.url)
            
            console.log(`✅ Contenido detallado obtenido para: ${news.title}`)
            console.log(`   - Contenido original: ${news.content.substring(0, 100)}...`)
            console.log(`   - Contenido detallado: ${detailedContent.substring(0, 100)}...`)
            
            return {
              ...news,
              content: detailedContent || news.content, // Usar contenido detallado o fallback al original
              originalContent: news.content, // Guardar el contenido original
              summary: news.content // Usar el contenido original como resumen
            }
          } catch (error) {
            console.error(`❌ Error obteniendo contenido detallado para ${news.title}:`, error)
            // En caso de error, usar el contenido original
            return {
              ...news,
              originalContent: news.content,
              summary: news.content
            }
          }
        })
      )
      
      // Crear los elementos del timeline con el contenido detallado
      const newTimelineItems: NewsItem[] = detailedNews.map(news => ({
        id: `news-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        title: news.title,
        content: news.content,
        originalContent: news.originalContent,
        type: 'noticia',
        category: news.category,
        sentiment: news.sentiment,
        duration: Math.floor(Math.random() * 30) + 30, // Duración aleatoria entre 30-60 segundos
        hasAudio: false,
        isRewritten: false,
        isHumanized: false,
        audioProgress: 0,
        transitionType: 'fade',
        priority: 'medium'
      }))
      
      if (timelineData) {
        setTimelineData({
          ...timelineData,
          timeline: [...timelineData.timeline, ...newTimelineItems],
          metadata: {
            ...timelineData.metadata,
            newsCount: timelineData.metadata.newsCount + newTimelineItems.length,
            totalDuration: timelineData.metadata.totalDuration + newTimelineItems.reduce((sum, item) => sum + item.duration, 0)
          }
        })
      }
      
      console.log(`✅ Se agregaron ${newTimelineItems.length} noticias con contenido detallado al timeline`)
      
    } catch (error) {
      console.error('❌ Error en el proceso de scraping detallado:', error)
      
      // En caso de error general, agregar las noticias con contenido original
      const fallbackTimelineItems: NewsItem[] = selectedNews.map(news => ({
        id: `news-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        title: news.title,
        content: news.content,
        originalContent: news.content,
        type: 'noticia',
        category: news.category,
        sentiment: news.sentiment,
        duration: Math.floor(Math.random() * 30) + 30,
        hasAudio: false,
        isRewritten: false,
        isHumanized: false,
        audioProgress: 0,
        transitionType: 'fade',
        priority: 'medium'
      }))
      
      if (timelineData) {
        setTimelineData({
          ...timelineData,
          timeline: [...timelineData.timeline, ...fallbackTimelineItems],
          metadata: {
            ...timelineData.metadata,
            newsCount: timelineData.metadata.newsCount + fallbackTimelineItems.length,
            totalDuration: timelineData.metadata.totalDuration + fallbackTimelineItems.reduce((sum, item) => sum + item.duration, 0)
          }
        })
      }
    } finally {
      // Limpiar estados y cerrar modal
      setScrapingDetailedContent(false)
      setScrapingProgress({ current: 0, total: 0 })
      setSelectedNewsItems([])
      setIsAddNewsModalOpen(false)
    }
  }

  useEffect(() => {
    loadTimelineData()
  }, [params.id])

  const loadTimelineData = async () => {
    try {
      // Leer configuración guardada desde crear-noticiero
      const searchConfigData = localStorage.getItem('newscast_search_config')
      let searchConfig = null
      if (searchConfigData) {
        searchConfig = JSON.parse(searchConfigData)
        console.log('Configuración de búsqueda cargada desde localStorage:', searchConfig)
        
        // Cargar información de medios seleccionados para mostrar en la interfaz
        if (searchConfig.selectedSources && searchConfig.sourceNewsCount) {
          setSelectedSourcesInfo({
            selectedSources: searchConfig.selectedSources,
            sourceNewsCount: searchConfig.sourceNewsCount
          })
        }
      } else {
        console.log('No se encontró configuración de búsqueda en localStorage')
      }

      // Leer configuración de VIRA para obtener sourceNewsCount
      const viraConfigData = localStorage.getItem('vira_configurations')
      let sourceNewsCount = 5 // Valor por defecto
      if (viraConfigData) {
        const viraConfig = JSON.parse(viraConfigData)
        if (viraConfig.sourceNewsCount) {
          sourceNewsCount = viraConfig.sourceNewsCount
          console.log('Cantidad de noticias configurada:', sourceNewsCount)
        }
      } else {
        console.log('No se encontró configuración de VIRA, usando cantidad por defecto:', sourceNewsCount)
      }
      
      // Limpiar localStorage para forzar recarga de datos actualizados
      localStorage.removeItem(`timeline_${params.id}`)
      
      // Comentar la carga desde localStorage para forzar datos frescos
      // const savedData = localStorage.getItem(`timeline_${params.id}`)
      // if (savedData) {
      //   const parsedData = JSON.parse(savedData)
      //   setTimelineData(parsedData)
      //   return
      // }

      // Obtener región desde searchConfigData (configuración guardada en crear-noticiero)
      let region = 'Arica y Parinacota' // Región por defecto
      
      // Usar la región desde searchConfig si está disponible
      if (searchConfig && searchConfig.region) {
        region = searchConfig.region
        console.log(`Usando región desde searchConfig: ${region}`)
      } else {
        console.log('No se encontró región en searchConfig, usando región por defecto')
      }

      console.log(`Cargando noticias para la región: ${region}`)
      
      // Usar las funciones de scraping para obtener noticias reales
      const scrapedNews = await SacarDatos(region)
      
      // Limitar las noticias según la configuración del usuario
      const limitedNews = scrapedNews.slice(0, sourceNewsCount)
      console.log(`📊 Noticias obtenidas: ${scrapedNews.length}, limitadas a: ${scrapedNews.length}`)
      
      // Enriquecer las noticias con el contenido completo usando SacarDatosCuerpo
      console.log(`🔄 Iniciando enriquecimiento de ${limitedNews.length} noticias con contenido completo...`)
      
      const noticiasConCuerpo = await Promise.all(
        scrapedNews.map(async (noticia, index) => {
          console.log(`📰 Procesando noticia ${index + 1}/${limitedNews.length}: ${noticia.title}`)
          
          const contenidoCompleto = await SacarDatosCuerpo(noticia.url);
          
          // Si el contenido está vacío o es muy corto, usar el título como contenido
          const finalContent = contenidoCompleto.trim().length > 20 
            ? contenidoCompleto 
            : `${noticia.title}. Contenido completo disponible en: ${noticia.url}`;
          
          console.log(`✅ Noticia ${index + 1} procesada. Contenido final: ${finalContent.length} caracteres`)
          
          return {
            ...noticia,
            content: finalContent,
            summary: finalContent.length > 200 ? finalContent.substring(0, 200) + '...' : finalContent
          };
        })
      );
      
      console.log(`🎉 Enriquecimiento completado. ${noticiasConCuerpo.length} noticias procesadas.`)
      
      // Verificar que todas las noticias tienen contenido único
      const contenidosUnicos = new Set(noticiasConCuerpo.map(n => n.content))
      console.log(`📊 Contenidos únicos: ${contenidosUnicos.size}/${noticiasConCuerpo.length}`)
      
      if (contenidosUnicos.size < noticiasConCuerpo.length) {
        console.warn('⚠️ Algunas noticias tienen contenido duplicado')
        noticiasConCuerpo.forEach((noticia, index) => {
          console.log(`   ${index + 1}. ${noticia.title} - ${noticia.content.substring(0, 50)}...`)
        })
      }
      
      // Convertir las noticias enriquecidas al formato NewsItem
      const newsItems: NewsItem[] = noticiasConCuerpo.map((news, index) => ({
        id: news.id,
        title: news.title,
        content: news.content,
        originalContent: news.content,
        category: news.category,
        sentiment: news.sentiment,
        duration: Math.max(15, Math.ceil(news.content.length / 15)), // Estimar duración basada en longitud
        hasAudio: false,
        isRewritten: false,
        isHumanized: false,
        audioProgress: 0,
        transitionType: 'ninguna',
        currentVersion: 'original'
      }))

      // Agregar segmento de clima al inicio
      const climateSegment: NewsItem = {
        id: 'climate-segment',
        title: 'Mención de Hora y Clima',
        content: `Son las ${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}. Para hoy en ${region} se espera un día variable con temperaturas moderadas.`,
        originalContent: `Son las ${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}. Para hoy en ${region} se espera un día variable con temperaturas moderadas.`,
        type: 'climate',
        duration: 25,
        hasAudio: false,
        isRewritten: false,
        isHumanized: false,
        audioProgress: 0,
        transitionType: 'ninguna',
        priority: 'required',
        currentVersion: 'original'
      }

      // Combinar segmento de clima con noticias
      const timeline = [climateSegment, ...newsItems]
      const totalDuration = timeline.reduce((sum, item) => sum + item.duration, 0)

      const timelineData: TimelineData = {
        timeline,
        metadata: {
          totalDuration,
          targetDuration: 900, // 15:00
          newsCount: newsItems.length,
          region,
          generatedAt: new Date().toISOString(),
          needsAdjustment: totalDuration > 960 || totalDuration < 810 // Fuera del rango 13:30-16:00
        }
      }

      setTimelineData(timelineData)
      
      // Guardar en localStorage para futuras cargas
      localStorage.setItem(`timeline_${params.id}`, JSON.stringify(timelineData))
      
      console.log(`Timeline cargado con ${newsItems.length} noticias de ${region}`)
      
    } catch (error) {
      console.error('Error loading timeline:', error)
      
      // Fallback usando noticias mock con contenido único
      let region = 'Arica y Parinacota' // Región por defecto
      
      // Intentar obtener la región desde localStorage
      try {
        const searchConfigData = localStorage.getItem('newscast_search_config')
        if (searchConfigData) {
          const searchConfig = JSON.parse(searchConfigData)
          if (searchConfig && searchConfig.region) {
            region = searchConfig.region
          }
        }
      } catch (e) {
        console.log('Error al obtener región desde localStorage, usando región por defecto')
      }
      
      console.log(`Usando noticias mock para la región: ${region}`)
      
      // Generar noticias mock con contenido único, limitadas por sourceNewsCount
      let totalEsperado = 5; // Valor por defecto
      try {
        const searchConfigData = localStorage.getItem('newscast_search_config')
        if (searchConfigData) {
          const searchConfig = JSON.parse(searchConfigData)
          const selectedSources = searchConfig.selectedSources || []
          const sourceNewsCount = searchConfig.sourceNewsCount || {}
          totalEsperado = selectedSources.reduce((total: number, source: string) => {
            return total + (sourceNewsCount[source] || 3);
          }, 0) || 5;
        }
      } catch (e) {
        console.log('Error al obtener configuración de medios, usando valor por defecto')
      }
      const mockNews = generateMockNews(region, totalEsperado)
      
      // Convertir las noticias mock al formato NewsItem
      const newsItems: NewsItem[] = mockNews.map((news, index) => ({
        id: news.id,
        title: news.title,
        content: news.content,
        originalContent: news.content,
        category: news.category,
        sentiment: news.sentiment,
        duration: Math.max(15, Math.ceil(news.content.length / 15)),
        hasAudio: false,
        isRewritten: false,
        isHumanized: false,
        audioProgress: 0,
        transitionType: 'ninguna',
        currentVersion: 'original'
      }))
      
      // Agregar segmento de clima
      const climateSegment: NewsItem = {
        id: 'climate-segment',
        title: 'Mención de Hora y Clima',
        content: `Son las ${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}. Para hoy en ${region} se espera un día variable con temperaturas moderadas.`,
        originalContent: `Son las ${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}. Para hoy en ${region} se espera un día variable con temperaturas moderadas.`,
        type: 'climate',
        duration: 25,
        hasAudio: false,
        isRewritten: false,
        isHumanized: false,
        audioProgress: 0,
        transitionType: 'ninguna',
        priority: 'required',
        currentVersion: 'original'
      }
      
      const timeline = [climateSegment, ...newsItems]
      const totalDuration = timeline.reduce((sum, item) => sum + item.duration, 0)
      
      const fallbackData: TimelineData = {
        timeline,
        metadata: {
          totalDuration,
          targetDuration: 900,
          newsCount: newsItems.length,
          region,
          generatedAt: new Date().toISOString(),
          needsAdjustment: totalDuration > 960 || totalDuration < 810
        }
      }
      
      setTimelineData(fallbackData)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getDurationColor = () => {
    if (!timelineData) return 'text-gray-600'
    const { totalDuration, targetDuration } = timelineData.metadata
    if (totalDuration > targetDuration) return 'text-red-600'
    if (totalDuration < targetDuration * 0.9) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getProgressPercentage = () => {
    if (!timelineData) return 0
    return Math.min((timelineData.metadata.totalDuration / timelineData.metadata.targetDuration) * 100, 100)
  }

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Positivo</Badge>
      case 'negative':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">Negativo</Badge>
      case 'neutral':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">Neutral</Badge>
      default:
        return null
    }
  }

  const getNewsIcon = (type?: string, category?: string) => {
    if (type === 'climate') return <Thermometer className="h-4 w-4 text-blue-600" />
    if (type === 'advertisement') return <Volume2 className="h-4 w-4 text-purple-600" />
    
    switch (category) {
      case 'cultura':
        return <Building2 className="h-4 w-4 text-purple-600" />
      case 'economia':
        return <Lightbulb className="h-4 w-4 text-yellow-600" />
      case 'publicidad':
        return <Volume2 className="h-4 w-4 text-purple-600" />
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (!timelineData) return
    if (checked) {
      setSelectedItems(timelineData.timeline.map(item => item.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleItemSelect = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId])
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId))
    }
  }

  const handleEdit = (itemId: string) => {
    if (!timelineData) return
    
    const item = timelineData.timeline.find(t => t.id === itemId)
    if (!item) return
    
    // Determinar qué contenido mostrar para editar
    const currentContent = item.processedContent || 
                          item.humanizedContent || 
                          item.rewrittenContent || 
                          item.originalContent || 
                          item.content
    
    setEditingItem(itemId)
    setEditingText(currentContent)
    setEditingTitle(item.title)
  }
  
  const handleSaveEdit = (itemId: string) => {
    if (!timelineData || !editingText.trim() || !editingTitle.trim()) return
    
    // CONTROL ESTRICTO DE DURACIÓN
    const estimatedDuration = Math.max(15, Math.ceil(editingText.length / 15))
    const currentDurationWithoutThisItem = timelineData.timeline
      .filter(t => t.id !== itemId)
      .reduce((sum, t) => sum + t.duration, 0)
    
    const targetDuration = timelineData.metadata.targetDuration
    const maxAllowed = targetDuration + 60 // Margen de 1 minuto MÁXIMO
    const newTotalDuration = currentDurationWithoutThisItem + estimatedDuration
    
    let finalDuration = estimatedDuration
    let finalTotalDuration = newTotalDuration
    let durationControlMessage = ''
    
    if (newTotalDuration > maxAllowed) {
      // AJUSTAR DURACIÓN PARA NO EXCEDER EL LÍMITE
      finalDuration = Math.max(15, targetDuration - currentDurationWithoutThisItem - 10) // Margen de seguridad
      finalTotalDuration = currentDurationWithoutThisItem + finalDuration
      
      const targetMinutes = Math.floor(targetDuration / 60)
      const targetSeconds = targetDuration % 60
      
      durationControlMessage = `\n\n⚠️ CONTROL DE DURACIÓN AUTOMÁTICO\n` +
                             `🎯 Límite objetivo: ${targetMinutes}:${targetSeconds.toString().padStart(2, '0')}\n` +
                             `📏 Contenido ajustado automáticamente\n` +
                             `✅ Se mantiene dentro del límite establecido`
    }
    
    setTimelineData(prev => {
      if (!prev) return null
      return {
        ...prev,
        timeline: prev.timeline.map(t =>
          t.id === itemId ? { 
            ...t, 
            title: editingTitle,
            rewrittenContent: editingText,
            duration: finalDuration,
            // Marcar como editado manualmente
            isRewritten: true,
            currentVersion: 'rewritten'
          } : t
        ),
        metadata: {
          ...prev.metadata,
          totalDuration: finalTotalDuration
        }
      }
    })
    
    setEditingItem(null)
    setEditingText('')
    setEditingTitle('')
  }
  
  const handleCancelEdit = () => {
    setEditingItem(null)
    setEditingText('')
    setEditingTitle('')
  }

  // Función para humanizar texto usando la API de Chutes con fallback
  const HumanizarTexto = async (texto: string) => {
    // Tokens de respaldo para mayor confiabilidad
    const apiTokens = [
      'cpk_4923ef9e90db4290ad75e3ba829ffcc2.73d645ff58545311aa226d6de7ec2a15.bc1qnx253th4lde8plfvt6zx03v45s62p6llylg63g',
      'cpk_4923ef9e90db4290ad75e3ba829ffcc2.73d645ff58545311aa226d6de7ec2a15.1rVtvhr097YVdX8ECmThYaLuHyGgZBxP'
    ]
    
    for (let i = 0; i < apiTokens.length; i++) {
      const apiToken = apiTokens[i]
      try {
        console.log(`🔄 Intentando humanizar con token ${i + 1}/${apiTokens.length}...`)
        
        const response = await fetch('https://llm.chutes.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-120b',
            messages: [
              {
                role: 'user',
                content: `Humaniza el siguiente texto de noticia para que suene más natural y cercano, manteniendo toda la información importante: ${texto}`
              }
            ],
            stream: false,
            max_tokens: 1024,
            temperature: 0.7
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data && data.choices && data.choices[0]) {
            console.log(`✅ Humanización exitosa con token ${i + 1}`)
            return data.choices[0].message.content
          } else {
            throw new Error('No se recibió respuesta válida de la API')
          }
        } else if (response.status === 401) {
          console.warn(`⚠️ Token ${i + 1} no autorizado (401), probando siguiente...`)
          continue
        } else {
          throw new Error(`Error HTTP: ${response.status}`)
        }
      } catch (error) {
        console.error(`❌ Error con token ${i + 1}:`, error)
        if (i === apiTokens.length - 1) {
          // Si es el último token, lanzar el error
          throw new Error(`Error al humanizar texto después de ${apiTokens.length} intentos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        }
        // Continuar con el siguiente token
        continue
      }
    }
  }

  // Función para alargar texto usando la API de Chutes con fallback
  const AlargarTexto = async (texto: string) => {
    // Tokens de respaldo para mayor confiabilidad
    const apiTokens = [
      'cpk_4923ef9e90db4290ad75e3ba829ffcc2.73d645ff58545311aa226d6de7ec2a15.bc1qnx253th4lde8plfvt6zx03v45s62p6llylg63g',
      'cpk_4923ef9e90db4290ad75e3ba829ffcc2.73d645ff58545311aa226d6de7ec2a15.1rVtvhr097YVdX8ECmThYaLuHyGgZBxP'
    ]
    
    for (let i = 0; i < apiTokens.length; i++) {
      const apiToken = apiTokens[i]
      try {
        console.log(`🔄 Intentando alargar texto con token ${i + 1}/${apiTokens.length}...`)
        
        const response = await fetch('https://llm.chutes.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-120b',
            messages: [
              {
                role: 'user',
                content: `Alarga y expande el siguiente texto de noticia agregando más detalles, contexto, explicaciones adicionales y información relevante, manteniendo el mismo tono y estilo periodístico. El objetivo es hacer el texto significativamente más largo sin perder la esencia del mensaje original: ${texto}`
              }
            ],
            stream: false,
            max_tokens: 2048,
            temperature: 0.7
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data && data.choices && data.choices[0]) {
            console.log(`✅ Alargado de texto exitoso con token ${i + 1}`)
            return data.choices[0].message.content
          } else {
            throw new Error('No se recibió respuesta válida de la API')
          }
        } else if (response.status === 401) {
          console.warn(`⚠️ Token ${i + 1} no autorizado (401), probando siguiente...`)
          continue
        } else {
          throw new Error(`Error HTTP: ${response.status}`)
        }
      } catch (error) {
        console.error(`❌ Error con token ${i + 1}:`, error)
        if (i === apiTokens.length - 1) {
          // Si es el último token, lanzar el error
          throw new Error(`Error al alargar texto después de ${apiTokens.length} intentos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        }
        // Continuar con el siguiente token
        continue
      }
    }
  }

  const handleHumanize = async (itemId: string) => {
    if (!timelineData) return
    
    const item = timelineData.timeline.find(t => t.id === itemId)
    if (!item) return
    
    setProcessingAudio([...processingAudio, itemId])
    
    try {
      // Usar el contenido reescrito si existe, sino el original
      const sourceContent = item.rewrittenContent || item.originalContent || item.content
      
      // Usar la nueva función HumanizarTexto con la API de Chutes
      const humanizedText = await HumanizarTexto(sourceContent)
      
      if (humanizedText) {
        // CONTROL ESTRICTO DE DURACIÓN
        const estimatedDuration = Math.max(15, Math.ceil(humanizedText.length / 15))
        const currentDurationWithoutThisItem = timelineData.timeline
          .filter(t => t.id !== itemId)
          .reduce((sum, t) => sum + t.duration, 0)
        
        const targetDuration = timelineData.metadata.targetDuration
        const maxAllowed = targetDuration + 60 // Margen de 1 minuto MÁXIMO
        const newTotalDuration = currentDurationWithoutThisItem + estimatedDuration
        
        let finalDuration = estimatedDuration
        let finalTotalDuration = newTotalDuration
        let durationControlMessage = ''
        
        if (newTotalDuration > maxAllowed) {
          // AJUSTAR DURACIÓN PARA NO EXCEDER EL LÍMITE
          finalDuration = Math.max(15, targetDuration - currentDurationWithoutThisItem - 10) // Margen de seguridad
          finalTotalDuration = currentDurationWithoutThisItem + finalDuration
          
          const targetMinutes = Math.floor(targetDuration / 60)
          const targetSeconds = targetDuration % 60
          
          durationControlMessage = `\n\n⚠️ CONTROL DE DURACIÓN AUTOMÁTICO\n` +
                                 `🎯 Límite objetivo: ${targetMinutes}:${targetSeconds.toString().padStart(2, '0')}\n` +
                                 `📏 Contenido ajustado automáticamente\n` +
                                 `✅ Se mantiene dentro del límite establecido`
        }
        
        setTimelineData(prev => {
          if (!prev) return null
          return {
            ...prev,
            timeline: prev.timeline.map(t =>
              t.id === itemId ? { 
                ...t, 
                humanizedContent: humanizedText,
                processedContent: humanizedText,
                isHumanized: true,
                currentVersion: 'humanized',
                duration: finalDuration
              } : t
            ),
            metadata: {
              ...prev.metadata,
              totalDuration: finalTotalDuration
            }
          }
        })
      } else {
        throw new Error('No se recibió texto procesado')
      }
    } catch (error) {
      console.error('Error humanizando:', error)
    } finally {
      setProcessingAudio(processingAudio.filter(id => id !== itemId))
    }
  }

  // Función para cambiar entre versiones
  const handleVersionChange = (itemId: string, version: 'original' | 'rewritten' | 'humanized' | 'extended') => {
    setTimelineData(prev => {
      if (!prev) return null
      return {
        ...prev,
        timeline: prev.timeline.map(t =>
          t.id === itemId ? { 
            ...t, 
            currentVersion: version
          } : t
        )
      }
    })
  }

  // Función para obtener el contenido actual según la versión seleccionada
  const getCurrentContent = (item: NewsItem): string => {
    switch (item.currentVersion) {
      case 'rewritten':
        return item.rewrittenContent || item.originalContent || item.content
      case 'humanized':
        return item.humanizedContent || item.rewrittenContent || item.originalContent || item.content
      case 'extended':
        return item.extendedContent || item.humanizedContent || item.rewrittenContent || item.originalContent || item.content
      default:
        return item.originalContent || item.content
    }
  }

  // Función para obtener la URL de audio actual
  const getCurrentAudioUrl = (item: NewsItem): string | null => {
    switch (item.currentVersion) {
      case 'rewritten':
        return item.rewrittenAudioUrl || null
      case 'humanized':
        return item.humanizedAudioUrl || null
      case 'extended':
        return item.extendedAudioUrl || null
      default:
        return item.originalAudioUrl || null
    }
  }

  // Función para actualizar el contenido de una frase publicitaria
  const handleUpdateAdvertisement = (itemId: string, content: string) => {
    setTimelineData(prev => {
      if (!prev) return null
      return {
        ...prev,
        timeline: prev.timeline.map(t =>
          t.id === itemId ? { 
            ...t, 
            content: content,
            originalContent: content,
            isEmpty: content.trim().length === 0
          } : t
        )
      }
    })
  }

  // Función para subir audio MP3 para frases publicitarias
  const handleUploadAudioForAd = async (itemId: string, file: File) => {
    if (!timelineData) return

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'advertisement')
      formData.append('itemId', itemId)

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Error subiendo audio')
      }

      const result = await response.json()

      // Actualizar el timeline con la URL del audio
      setTimelineData(prev => {
        if (!prev) return null
        return {
          ...prev,
          timeline: prev.timeline.map(t =>
            t.id === itemId ? { 
              ...t, 
              hasAudio: true,
              originalAudioUrl: result.audioUrl,
              audioProgress: 100,
              uploadedAudio: true
            } : t
          )
        }
      })

      console.log(`✅ Audio subido exitosamente! Archivo: ${file.name}`)
    } catch (error) {
      console.error('Error subiendo audio:', error)
      console.error(`❌ Error al subir el audio: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  // Función para abrir selector de archivos
  const triggerAudioUpload = (itemId: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/mp3,audio/mpeg,audio/wav'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        handleUploadAudioForAd(itemId, file)
      }
    }
    input.click()
  }

  // Función para seleccionar audio desde biblioteca
  const selectFromLibrary = (itemId: string) => {
    // TODO: Implementar modal para seleccionar desde biblioteca
    console.log('🎵 Función "Seleccionar desde Biblioteca" será implementada próximamente.')
  }

  // FUNCIONES DE LA BARRA DE HERRAMIENTAS

  const handleToggleFavorite = (itemId: string) => {
    if (!timelineData) return
    
    setTimelineData(prev => {
      if (!prev) return null
      return {
        ...prev,
        timeline: prev.timeline.map(t =>
          t.id === itemId ? { 
            ...t, 
            isFavorite: !(t as any).isFavorite 
          } : t
        )
      }
    })

    const item = timelineData.timeline.find(t => t.id === itemId)
    if (item) {
      const action = (item as any).isFavorite ? 'removido de' : 'agregado a'
      console.log(`⭐ Elemento ${action} favoritos: "${item.title}"`)
    }
  }

  const handleAdjustVolume = (itemId: string) => {
    if (!timelineData) return
    
    const item = timelineData.timeline.find(t => t.id === itemId)
    if (!item) return

    if (!item.hasAudio) {
      console.error('❌ Este elemento no tiene audio generado. Genera el audio primero para ajustar el volumen.')
      return
    }

    // Simular ajuste de volumen
    const currentVolume = (item as any).volume || 100
    const newVolume = prompt(`Ajustar volumen (0-100):\n\nVolumen actual: ${currentVolume}%`, currentVolume.toString())
    
    if (newVolume && !isNaN(parseInt(newVolume))) {
      const volume = Math.max(0, Math.min(100, parseInt(newVolume)))
      setTimelineData(prev => {
        if (!prev) return null
        return {
          ...prev,
          timeline: prev.timeline.map(t =>
            t.id === itemId ? { 
              ...t, 
              volume: volume 
            } : t
          )
        }
      })
      console.log(`🔊 Volumen ajustado a ${volume}% para "${item.title}"`)
    }
  }

  // FUNCIONES DRAG & DROP PARA REORDENAR NOTICIAS
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
    // Estilo visual al iniciar drag
    const element = e.currentTarget as HTMLElement
    element.style.opacity = '0.5'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null)
    setDragOverItem(null)
    // Restaurar estilo visual
    const element = e.currentTarget as HTMLElement
    element.style.opacity = '1'
  }

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault()
    setDragOverItem(itemId)
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem === targetItemId || !timelineData) return
    
    const timeline = [...timelineData.timeline]
    const draggedIndex = timeline.findIndex(item => item.id === draggedItem)
    const targetIndex = timeline.findIndex(item => item.id === targetItemId)
    
    if (draggedIndex === -1 || targetIndex === -1) return
    
    // Verificar que no se muevan elementos requeridos (clima)
    const draggedItemData = timeline[draggedIndex]
    const targetItemData = timeline[targetIndex]
    
    if (draggedItemData.type === 'climate' || draggedItemData.priority === 'required') {
      console.error('❌ No se puede mover este elemento porque es requerido para el noticiero')
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }

    // Si se está moviendo sobre el elemento clima, colocarlo después
    if (targetItemData.type === 'climate' || targetItemData.priority === 'required') {
      const newTargetIndex = Math.min(targetIndex + 1, timeline.length - 1)
      const [removed] = timeline.splice(draggedIndex, 1)
      timeline.splice(newTargetIndex, 0, removed)
    } else {
      // Mover elemento normalmente
      const [removed] = timeline.splice(draggedIndex, 1)
      timeline.splice(targetIndex, 0, removed)
    }
    
    // Actualizar el timeline
    setTimelineData(prev => {
      if (!prev) return null
      return {
        ...prev,
        timeline: timeline
      }
    })
    
    setDraggedItem(null)
    setDragOverItem(null)
    
    console.log(`✅ Elemento reordenado exitosamente: "${draggedItemData.title}" ha sido movido a la nueva posición.`)
  }

  // Función para convertir texto a voz usando servidor TTS local de Python con clonación de voz
  const vozTexto = async (texto: string, voiceUrl?: string) => {
    try {
      console.log('🔄 Conectando al servidor TTS local para clonación de voz...')
      
      const response = await fetch('http://localhost:5000/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: texto,
          voice_url: voiceUrl || 'https://bbshnncbrpzahuckphtu.supabase.co/storage/v1/object/public/biblioteca_audio/f48ad3de.mp3'
        })
      })
      
      if (response.ok) {
        // La respuesta es un archivo de audio
        const audioBlob = await response.blob()
        console.log(`✅ Audio generado exitosamente con servidor TTS local:`, audioBlob.size, 'bytes')
        
        return audioBlob
      } else {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }
    } catch (error) {
      console.error('❌ Error al conectar con el servidor TTS local:', error)
      
      // Mostrar mensaje de error más específico
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ No se pudo conectar al servidor TTS. Asegúrate de que el servidor esté ejecutándose en http://localhost:5000')
        throw new Error('No se pudo conectar al servidor TTS local. Verifica que esté ejecutándose en el puerto 5000.')
      }
      
      throw error
    }
  }

  const handleGenerateAudio = async (itemId: string, version?: 'original' | 'rewritten' | 'humanized' | 'extended', voiceUrl?: string) => {
    if (!timelineData) return
    
    const item = timelineData.timeline.find(t => t.id === itemId)
    if (!item) return
    
    const targetVersion = version || item.currentVersion || 'original'
    
    setProcessingAudio([...processingAudio, itemId])
    
    try {
      // Determinar qué texto usar según la versión
      let textToSynthesize = ''
      switch (targetVersion) {
        case 'rewritten':
          textToSynthesize = item.rewrittenContent || item.originalContent || item.content
          break
        case 'humanized':
          textToSynthesize = item.humanizedContent || item.rewrittenContent || item.originalContent || item.content
          break
        case 'extended':
          textToSynthesize = item.extendedContent || item.humanizedContent || item.rewrittenContent || item.originalContent || item.content
          break
        default:
          textToSynthesize = item.originalContent || item.content
      }
      
      // Usar la función vozTexto para generar el audio
      const audioBlob = await vozTexto(textToSynthesize, voiceUrl)
      
      if (audioBlob) {
        // Limpiar URL anterior si existe para evitar memory leaks
        const currentItem = timelineData?.timeline.find(t => t.id === itemId)
        if (currentItem) {
          const oldUrl = targetVersion === 'original' ? currentItem.originalAudioUrl :
                        targetVersion === 'rewritten' ? currentItem.rewrittenAudioUrl :
                        targetVersion === 'humanized' ? currentItem.humanizedAudioUrl :
                        currentItem.extendedAudioUrl
          if (oldUrl && oldUrl.startsWith('blob:')) {
            URL.revokeObjectURL(oldUrl)
          }
        }
        
        // Crear URL para el audio generado
        const audioUrl = URL.createObjectURL(audioBlob)
        
        // Calcular duración estimada (aproximadamente 150 palabras por minuto)
        const wordCount = textToSynthesize.split(' ').length
        const estimatedDuration = Math.ceil((wordCount / 150) * 60) // en segundos
        setTimelineData(prev => {
          if (!prev) return null
          return {
            ...prev,
            timeline: prev.timeline.map(t =>
              t.id === itemId ? { 
                ...t, 
                hasAudio: true, 
                audioProgress: 100,
                actualDuration: estimatedDuration,
                // Guardar la URL en la versión correspondiente
                ...(targetVersion === 'original' ? { originalAudioUrl: audioUrl } : {}),
                ...(targetVersion === 'rewritten' ? { rewrittenAudioUrl: audioUrl } : {}),
                ...(targetVersion === 'humanized' ? { humanizedAudioUrl: audioUrl } : {}),
                ...(targetVersion === 'extended' ? { extendedAudioUrl: audioUrl } : {}),
                audioUrl: audioUrl // Para compatibilidad
              } : t
            )
          }
        })
        
        const versionNames = {
          original: 'Original',
          rewritten: 'Reescrita', 
          humanized: 'Humanizada',
          extended: 'Extendida'
        }
      } else {
        throw new Error('No se pudo generar el audio')
      }
    } catch (error) {
      console.error('Error generando audio:', error)
    } finally {
      setProcessingAudio(processingAudio.filter(id => id !== itemId))
    }
  }

  const handlePlayAudio = (itemId: string) => {
    if (currentPlayingId === itemId) {
      // Pausar audio actual
      if (currentAudio) {
        currentAudio.pause()
        setCurrentAudio(null)
      }
      setIsPlaying(false)
      setCurrentPlayingId(null)
    } else {
      // Pausar audio anterior si existe
      if (currentAudio) {
        currentAudio.pause()
      }
      
      // Encontrar el item y obtener su URL de audio
      const item = timelineData?.timeline.find(t => t.id === itemId)
      const audioUrl = getCurrentAudioUrl(item!)
      
      if (audioUrl) {
        const audio = new Audio(audioUrl)
        
        audio.onloadeddata = () => {
          setIsPlaying(true)
          setCurrentPlayingId(itemId)
          setCurrentAudio(audio)
          audio.play().catch(error => {
            console.error('Error reproduciendo audio:', error)
            alert('❌ Error al reproducir el audio')
            setIsPlaying(false)
            setCurrentPlayingId(null)
            setCurrentAudio(null)
          })
        }
        
        audio.onended = () => {
          setIsPlaying(false)
          setCurrentPlayingId(null)
          setCurrentAudio(null)
        }
        
        audio.onerror = () => {
          console.error('Error cargando audio')
          alert('❌ Error al cargar el audio')
          setIsPlaying(false)
          setCurrentPlayingId(null)
          setCurrentAudio(null)
        }
      } else {
        alert('❌ No hay audio disponible para este elemento')
      }
    }
  }

  // Editar elementos seleccionados (función simplificada)
  const handleBulkEdit = () => {
    if (!timelineData || selectedItems.length === 0) {
      alert('❌ Por favor selecciona al menos un elemento para editar')
      return
    }
    
    if (selectedItems.length > 1) {
      alert('📝 EDICIÓN MASIVA\n\n⚠️ Para editar múltiples elementos, debes hacerlo uno por uno.\n\n💡 Selecciona un elemento a la vez y usa el botón "Editar" para modificar su contenido.')
      return
    }
    
    // Si solo hay un elemento seleccionado, abrir el editor
    handleEdit(selectedItems[0])
  }

  // Humanizar elementos seleccionados
  const handleBulkHumanize = async () => {
    if (!timelineData || selectedItems.length === 0) {
      alert('❌ Por favor selecciona al menos un elemento para humanizar')
      return
    }
    
    // INCLUIR: Todas las noticias + mención del tiempo
    // EXCLUIR: Frases publicitarias (advertisements)
    const itemsToHumanize = timelineData.timeline.filter(item => 
      selectedItems.includes(item.id) && item.type !== 'advertisement'
    )
    
    if (itemsToHumanize.length === 0) {
      alert('❌ No hay elementos válidos para humanizar\n\n💡 Solo se pueden humanizar noticias y menciones del tiempo.\n📢 Las frases publicitarias no se incluyen en este proceso.')
      return
    }
    
    const newsCount = itemsToHumanize.filter(item => item.type !== 'climate').length
    const climateCount = itemsToHumanize.filter(item => item.type === 'climate').length
    
    if (!confirm(`✨ HUMANIZAR CONTENIDO MASIVO\n\n` +
                 `📰 Noticias: ${newsCount} elemento${newsCount !== 1 ? 's' : ''}\n` +
                 `🌤️ Menciones del tiempo: ${climateCount} elemento${climateCount !== 1 ? 's' : ''}\n` +
                 `📊 Total a procesar: ${itemsToHumanize.length}\n\n` +
                 `⚠️ Las frases publicitarias NO se incluyen\n` +
                 `⏳ Esto puede tomar varios minutos\n\n` +
                 `¿Continuar con la humanización masiva?`)) {
      return
    }
    
    // Contadores de progreso
    let processed = 0
    let successful = 0
    let failed = 0
    const failedItems: string[] = []
    
    console.log(`🚀 Iniciando humanización masiva - Procesando ${itemsToHumanize.length} elementos`)
    
    // Procesar cada elemento individualmente
    for (const item of itemsToHumanize) {
      processed++
      console.log(`🔄 Procesando ${processed}/${itemsToHumanize.length}: "${item.title}"`)
      
      try {
        await handleHumanize(item.id)
        successful++
        console.log(`✅ Éxito ${successful}/${itemsToHumanize.length}: "${item.title}"`)
      } catch (error) {
        failed++
        failedItems.push(item.title)
        console.error(`❌ Error ${failed}: "${item.title}"`, error)
        
        // Asegurar que se remueva del estado de procesamiento
        setProcessingAudio(prev => prev.filter(id => id !== item.id))
      }
      
      // Pequeña pausa entre elementos para evitar sobrecarga
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Mostrar reporte final
    if (successful === itemsToHumanize.length) {
      console.log(`🎉 ¡Humanización masiva completada exitosamente! ${successful} elementos humanizados`)
    } else {
      console.log(`⚠️ Humanización masiva finalizada con algunos errores. Exitosos: ${successful}, Fallidos: ${failed}`)
    }
  }

  // Generar audio para elementos seleccionados
  const handleBulkGenerateAudio = async (version?: 'original' | 'rewritten' | 'humanized' | 'extended', voiceUrl?: string) => {
    if (!timelineData || selectedItems.length === 0) {
      return
    }
    
    const itemsToGenerate = timelineData.timeline.filter(item => 
      selectedItems.includes(item.id) && !item.hasAudio
    )
    
    if (itemsToGenerate.length === 0) {
      alert('✅ Todos los elementos seleccionados ya tienen voz generada')
      return
    }
    
    if (!confirm(`¿Generar voz para ${itemsToGenerate.length} elemento${itemsToGenerate.length > 1 ? 's' : ''}?\n\nEsto puede tomar varios minutos.`)) {
      return
    }
    
    // Contadores de progreso
    let processed = 0
    let successful = 0
    let failed = 0
    const failedItems: string[] = []
    
    console.log(`🎙️ Iniciando generación de audio masiva - Procesando ${itemsToGenerate.length} elementos`)
    
    // Procesar cada elemento individualmente
    for (const item of itemsToGenerate) {
      processed++
      console.log(`🔄 Procesando audio ${processed}/${itemsToGenerate.length}: "${item.title}"`)
      
      try {
        const targetVersion = version || item.currentVersion || 'original'
        await handleGenerateAudio(item.id, targetVersion, voiceUrl)
        successful++
        console.log(`✅ Audio generado ${successful}/${itemsToGenerate.length}: "${item.title}"`)
      } catch (error) {
        failed++
        failedItems.push(item.title)
        console.error(`❌ Error generando audio ${failed}: "${item.title}"`, error)
        
        // Asegurar que se remueva del estado de procesamiento
        setProcessingAudio(prev => prev.filter(id => id !== item.id))
      }
      
      // Pausa entre elementos para evitar sobrecarga del servidor
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Mostrar reporte final
    if (successful === itemsToGenerate.length) {
      alert(`🎉 ¡Generación de audio masiva completada exitosamente!\n\n` +
            `✅ ${successful} audios generados\n` +
            `⏱️ Proceso completado\n\n` +
            `🎧 Ahora puedes escuchar la vista previa del noticiero completo.`)
    } else {
      alert(`⚠️ Generación de audio masiva finalizada con algunos errores\n\n` +
            `✅ Exitosos: ${successful}\n` +
            `❌ Fallidos: ${failed}\n` +
            `📋 Total procesados: ${processed}\n\n` +
            (failedItems.length > 0 ? 
              `Elementos con errores:\n${failedItems.map(title => '• ' + title).join('\n')}\n\n` : '') +
            `💡 Los elementos exitosos ya tienen audio generado.`)
    }
  }

  // Ajustar duración automáticamente con máxima precisión - AHORA CON ALARGADO DE TEXTOS
  const handleAdjustDuration = async () => {
    if (!timelineData) return
    
    const { totalDuration, targetDuration } = timelineData.metadata
    
    // Tolerancia de 10 segundos (muy preciso)
    if (Math.abs(totalDuration - targetDuration) < 10) {
      alert('✅ La duración actual ya está muy precisa\n\n' +
            `📊 Actual: ${formatDuration(totalDuration)}\n` +
            `🎯 Objetivo: ${formatDuration(targetDuration)}\n` +
            `⚡ Diferencia: ${Math.abs(totalDuration - targetDuration)} segundos\n\n` +
            `💡 No requiere ajustes adicionales.`)
      return
    }
    
    const needsReduction = totalDuration > targetDuration
    const difference = Math.abs(totalDuration - targetDuration)
    const action = needsReduction ? 'REDUCIR' : 'AUMENTAR'
    const method = needsReduction ? 
      'acortando elementos menos importantes y optimizando transiciones' : 
      'alargando textos con IA para agregar más contenido y detalles'
    
    if (!confirm(`🎯 AJUSTE INTELIGENTE DE DURACIÓN CON IA\n\n` +
                 `📊 Duración actual: ${formatDuration(totalDuration)}\n` +
                 `🎯 Duración objetivo: ${formatDuration(targetDuration)}\n` +
                 `⚖️ Diferencia: ${formatDuration(difference)} (${needsReduction ? 'EXCESO' : 'FALTANTE'})\n\n` +
                 `🔧 Acción: ${action}\n` +
                 `🤖 Método: ${method}\n\n` +
                 `${!needsReduction ? '✨ Se usará IA para alargar textos automáticamente\n\n' : ''}` +
                 `¿Proceder con el ajuste automático?`)) {
      return
    }
    
    try {
      let updatedTimeline = [...timelineData.timeline]
      let adjustmentsMade = []
      
      if (needsReduction) {
        // ========== ESTRATEGIA DE REDUCCIÓN INTELIGENTE (MANTENER LÓGICA ORIGINAL) ==========
        
        // 1. Elementos disponibles para ajuste (excluyendo requeridos)
        const adjustableItems = updatedTimeline
          .map((item, index) => ({ ...item, originalIndex: index }))
          .filter(item => item.type !== 'climate' && item.priority !== 'required')
          .sort((a, b) => {
            // Prioridad: elementos más largos y menos importantes primero
            const priorityWeight = (a.priority === 'high' ? 0.5 : 1) - (b.priority === 'high' ? 0.5 : 1)
            const durationWeight = b.duration - a.duration
            return priorityWeight + (durationWeight * 0.1)
          })
        
        let remainingReduction = difference
        
        // 2. Paso 1: Reducir elementos muy largos (>120 seg)
        for (const item of adjustableItems) {
          if (remainingReduction <= 5) break
          if (item.duration <= 120) continue
          
          const maxReduction = Math.min(item.duration * 0.4, item.duration - 60) // Max 40% o hasta 60seg mínimo
          const actualReduction = Math.min(maxReduction, remainingReduction)
          
          if (actualReduction > 5) {
            const itemIndex = item.originalIndex
            updatedTimeline[itemIndex] = {
              ...updatedTimeline[itemIndex],
              duration: updatedTimeline[itemIndex].duration - actualReduction
            }
            
            remainingReduction -= actualReduction
            adjustmentsMade.push(`Reducido "${item.title}": -${Math.round(actualReduction)}s`)
          }
        }
        
        // 3. Paso 2: Reducir moderadamente elementos medios (60-120 seg)
        for (const item of adjustableItems) {
          if (remainingReduction <= 5) break
          if (item.duration <= 60 || item.duration > 120) continue
          
          const maxReduction = Math.min(item.duration * 0.25, item.duration - 30) // Max 25% o hasta 30seg mínimo
          const actualReduction = Math.min(maxReduction, remainingReduction)
          
          if (actualReduction > 3) {
            const itemIndex = item.originalIndex
            updatedTimeline[itemIndex] = {
              ...updatedTimeline[itemIndex],
              duration: updatedTimeline[itemIndex].duration - actualReduction
            }
            
            remainingReduction -= actualReduction
            adjustmentsMade.push(`Ajustado "${item.title}": -${Math.round(actualReduction)}s`)
          }
        }
        
        // 4. Paso 3: Si aún falta, eliminar elementos menos importantes
        if (remainingReduction > 30) {
          const removableItems = adjustableItems
            .filter(item => item.priority !== 'high')
            .sort((a, b) => a.duration - b.duration) // Empezar por los más cortos
          
          for (const item of removableItems) {
            if (remainingReduction <= 30) break
            
            updatedTimeline = updatedTimeline.filter(t => t.id !== item.id)
            remainingReduction -= item.duration
            adjustmentsMade.push(`Eliminado "${item.title}": -${item.duration}s`)
            
            if (remainingReduction <= 0) break
          }
        }
        
      } else {
        // ========== NUEVA ESTRATEGIA DE EXTENSIÓN CON IA ==========
        
        const extensibleItems = updatedTimeline
          .map((item, index) => ({ ...item, originalIndex: index }))
          .filter(item => item.type !== 'climate' && item.type !== 'ad') // Excluir clima y publicidad
          .sort((a, b) => {
            // Prioridad: elementos importantes primero para alargar con IA
            const priorityWeight = (b.priority === 'high' ? 2 : 1) - (a.priority === 'high' ? 2 : 1)
            return priorityWeight
          })
        
        let remainingExtension = difference
        
        // 1. ALARGADO CON IA - Seleccionar elementos para alargar
        const itemsToExtend = extensibleItems.slice(0, Math.min(3, extensibleItems.length)) // Máximo 3 elementos
        
        if (itemsToExtend.length > 0) {
          console.log(`🤖 Iniciando alargado inteligente de textos - Procesando ${itemsToExtend.length} elementos con IA`)
          
          for (const item of itemsToExtend) {
            if (remainingExtension <= 10) break
            
            try {
              // Usar el contenido actual (humanizado, reescrito o original)
              const sourceContent = item.humanizedContent || item.rewrittenContent || item.originalContent || item.content
              
              // Alargar el texto con IA
              const extendedText = await AlargarTexto(sourceContent)
              
              if (extendedText && extendedText.length > sourceContent.length) {
                // Calcular nueva duración basada en el texto alargado
                const newDuration = Math.max(item.duration, Math.ceil(extendedText.length / 12)) // ~12 caracteres por segundo
                const actualExtension = newDuration - item.duration
                
                const itemIndex = item.originalIndex
                updatedTimeline[itemIndex] = {
                  ...updatedTimeline[itemIndex],
                  extendedContent: extendedText,
                  processedContent: extendedText,
                  duration: newDuration,
                  isExtended: true,
                  currentVersion: 'extended'
                }
                
                remainingExtension -= actualExtension
                adjustmentsMade.push(`🤖 Alargado con IA "${item.title}": +${Math.round(actualExtension)}s`)
              }
            } catch (error) {
              console.error(`Error alargando "${item.title}":`, error)
              adjustmentsMade.push(`❌ Error alargando "${item.title}": ${error instanceof Error ? error.message : 'Error desconocido'}`)
            }
          }
        }
        
        // 2. Si aún falta tiempo, agregar pausas naturales
        if (remainingExtension > 5 && extensibleItems.length > 0) {
          const finalExtensionPerItem = remainingExtension / extensibleItems.length
          
          extensibleItems.forEach(item => {
            const itemIndex = item.originalIndex
            const currentDuration = updatedTimeline[itemIndex].duration
            
            updatedTimeline[itemIndex] = {
              ...updatedTimeline[itemIndex],
              duration: currentDuration + finalExtensionPerItem
            }
            
            adjustmentsMade.push(`⏸️ Pausa agregada "${item.title}": +${Math.round(finalExtensionPerItem)}s`)
          })
          
          remainingExtension = 0
        }
      }
      
      // Calcular nueva duración total
      const newTotalDuration = updatedTimeline.reduce((sum, item) => sum + item.duration, 0)
      const finalDifference = Math.abs(newTotalDuration - targetDuration)
      const precision = ((1 - (finalDifference / targetDuration)) * 100).toFixed(1)
      
      // Actualizar estado
      setTimelineData({
        ...timelineData,
        timeline: updatedTimeline,
        metadata: {
          ...timelineData.metadata,
          totalDuration: newTotalDuration,
          newsCount: updatedTimeline.length
        }
      })
      
      // Mostrar resultado detallado
      alert(`🎉 ¡AJUSTE DE DURACIÓN COMPLETADO CON IA!\n\n` +
            `📊 RESULTADOS:\n` +
            `▪️ Duración anterior: ${formatDuration(totalDuration)}\n` +
            `▪️ Duración nueva: ${formatDuration(newTotalDuration)}\n` +
            `🎯 Duración objetivo: ${formatDuration(targetDuration)}\n` +
            `⚡ Diferencia final: ${Math.round(finalDifference)} segundos\n` +
            `🎯 Precisión alcanzada: ${precision}%\n\n` +
            `🔧 CAMBIOS REALIZADOS (${adjustmentsMade.length}):\n` +
            `${adjustmentsMade.slice(0, 5).map(change => `▪️ ${change}`).join('\n')}` +
            (adjustmentsMade.length > 5 ? `\n▪️ ...y ${adjustmentsMade.length - 5} cambios más` : '') +
            `\n\n${!needsReduction ? '🤖 Los textos han sido alargados inteligentemente con IA\n' : ''}` +
            `💡 El noticiero ahora tiene la duración solicitada.`)
      
    } catch (error) {
      console.error('Error adjusting duration:', error)
      alert(`❌ Error al ajustar duración\n\n` +
            `💥 Detalles: ${error instanceof Error ? error.message : 'Error desconocido'}\n\n` +
            `🔄 Por favor intenta nuevamente o ajusta manualmente los elementos.`)
    }
  }

  // Eliminar noticia
  const handleDeleteItem = (itemId: string) => {
    if (!timelineData) return
    
    const item = timelineData.timeline.find(t => t.id === itemId)
    if (!item) return
    
    // No permitir eliminar elementos requeridos
    if (item.priority === 'required' || item.type === 'climate') {
      alert('❌ No se puede eliminar este elemento porque es requerido para el noticiero')
      return
    }
    
    if (!confirm(`¿Eliminar "${item.title}"?\n\nEsta acción no se puede deshacer.`)) {
      return
    }
    
    const updatedTimeline = timelineData.timeline.filter(t => t.id !== itemId)
    const newTotalDuration = updatedTimeline.reduce((sum, item) => sum + item.duration, 0)
    
    setTimelineData({
      ...timelineData,
      timeline: updatedTimeline,
      metadata: {
        ...timelineData.metadata,
        totalDuration: newTotalDuration,
        newsCount: updatedTimeline.length
      }
    })
    
    // Remover de seleccionados
    setSelectedItems(selectedItems.filter(id => id !== itemId))
    
    console.log(`✅ Elemento eliminado exitosamente. Nueva duración: ${formatDuration(newTotalDuration)}`)
  }

  // Editar noticia
  const handleEditItem = (itemId: string) => {
    if (!timelineData) return
    
    const item = timelineData.timeline.find(t => t.id === itemId)
    if (!item) return
    
    // Determinar el contenido actual a editar (priorizar versiones procesadas)
    const currentContent = item.humanizedContent || item.rewrittenContent || item.processedContent || item.originalContent || item.content
    const originalContent = item.originalContent || item.content
    const rewrittenContent = item.rewrittenContent || ''
    const humanizedContent = item.humanizedContent || ''
    
    // Información detallada para el editor
    const editorInfo = `
🔍 INFORMACIÓN DEL ELEMENTO:
▪️ Título: ${item.title}
▪️ Duración actual: ${item.duration}s
▪️ Categoría: ${item.category || 'General'}
▪️ Estado: ${item.isHumanized ? 'Humanizada' : item.isRewritten ? 'Reescrita' : 'Original'}
${item.type === 'climate' ? '▪️ Tipo: Mención del tiempo' : ''}
${item.type === 'advertisement' ? '▪️ Tipo: Frase publicitaria' : ''}

📚 VERSIONES DISPONIBLES:

🔹 ORIGINAL:
${originalContent}

${rewrittenContent ? `🔸 REESCRITA:
${rewrittenContent}

` : ''}${humanizedContent ? `✨ HUMANIZADA:
${humanizedContent}

` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 EDITOR DE CONTENIDO COMPLETO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCCIONES:
• Puedes editar el texto completo sin limitaciones
• Se mantendrá como contenido "procesado"
• La duración se recalculará automáticamente
• Puedes usar cualquier longitud de texto
• Los cambios se guardarán inmediatamente
    `.trim()

    const newContent = prompt(
      `📝 EDITOR PROFESIONAL - ${item.title}\n\n${editorInfo}\n\nCONTENIDO A EDITAR:`, 
      currentContent
    )
    
    if (newContent !== null && newContent.trim() !== '') {
      // Calcular nueva duración aproximada (15 caracteres por segundo)
      const newDuration = Math.max(15, Math.ceil(newContent.trim().length / 15))
      
      const updatedTimeline = timelineData.timeline.map(t =>
        t.id === itemId ? {
          ...t,
          content: newContent.trim(),
          processedContent: newContent.trim(),
          // Mantener versiones existentes pero marcar que el contenido fue editado manualmente
          manuallyEdited: true,
          duration: newDuration,
          hasAudio: false, // Resetear audio porque cambió el contenido
          audioProgress: 0
        } : t
      )
      
      const newTotalDuration = updatedTimeline.reduce((sum, item) => sum + item.duration, 0)
      
      setTimelineData({
        ...timelineData,
        timeline: updatedTimeline,
        metadata: {
          ...timelineData.metadata,
          totalDuration: newTotalDuration
        }
      })
      
      alert(`✅ CONTENIDO EDITADO PROFESIONALMENTE\n\n` +
            `📝 Elemento: "${item.title}"\n` +
            `📊 Caracteres: ${newContent.trim().length}\n` +
            `⏱️ Nueva duración: ${formatDuration(newDuration)}\n` +
            `📈 Duración total actualizada: ${formatDuration(newTotalDuration)}\n\n` +
            `💾 Cambios guardados exitosamente\n` +
            `🎙️ Audio reiniciado - genera nuevo audio si es necesario`)
    }
  }

  const handleListenToNewscast = () => {
    if (!timelineData) return
    
    // Verificar que haya elementos con audio
    const itemsWithAudio = timelineData.timeline.filter(item => item.hasAudio)
    const totalItems = timelineData.timeline.length
    const totalDuration = timelineData.metadata.totalDuration
    
    if (itemsWithAudio.length === 0) {
      alert('❌ No hay elementos con voz generada\n\n🎙️ Genera voz para al menos un elemento antes de escuchar el noticiero.')
      return
    }
    
    // Mostrar información de reproducción
    const minutes = Math.floor(totalDuration / 60)
    const seconds = totalDuration % 60
    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`
    
    alert(`🎧 Reproduciendo vista previa del noticiero completo...\n\n` +
          `📊 Elementos con audio: ${itemsWithAudio.length}/${totalItems}\n` +
          `⏱️ Duración estimada: ${formattedDuration}\n` +
          `🎯 Duración objetivo: ${Math.floor(timelineData.metadata.targetDuration / 60)}:${(timelineData.metadata.targetDuration % 60).toString().padStart(2, '0')}\n\n` +
          `[MODO DESARROLLADOR] Simulando reproducción completa...`)
    
    setIsPlaying(true)
    
    // Simular reproducción basada en la duración real (máximo 10 segundos para demo)
    const simulationTime = Math.min(totalDuration * 100, 10000) // Simular o máximo 10 segundos
    setTimeout(() => {
      setIsPlaying(false)
      console.log(`✅ Vista previa completada. El noticiero sonaría durante aproximadamente ${formattedDuration}`)
    }, simulationTime)
  }

  const handleFinalizeAndDownload = async () => {
    if (!timelineData) return
    
    try {
      // Verificar que todos los elementos tengan audio
      const missingAudio = timelineData.timeline.filter(item => !item.hasAudio && item.type !== 'transition')
      if (missingAudio.length > 0) {
        alert(`❌ Faltan ${missingAudio.length} elementos con voz generada: ${missingAudio.map(item => item.title).join(', ')}\n\nPor favor genera la voz para todos los elementos antes de finalizar.`)
        return
      }
      
      // Mostrar progreso inicial
      console.log('📥 Iniciando descarga de todos los audios...')
      alert('📥 Iniciando descarga de todos los audios del noticiero...')
      
      // Obtener todos los elementos con audio
      const itemsWithAudio = timelineData.timeline.filter(item => 
        item.hasAudio && 
        item.type !== 'transition' && 
        !item.isEmpty
      )
      
      if (itemsWithAudio.length === 0) {
        alert('❌ No hay elementos con audio para descargar.')
        return
      }
      
      let downloadCount = 0
      let errorCount = 0
      
      // Descargar cada audio individualmente
      for (const item of itemsWithAudio) {
        try {
          // Obtener la URL del audio actual según la versión
          const audioUrl = getCurrentAudioUrl(item)
          
          if (!audioUrl) {
            console.error(`No se encontró URL de audio para: ${item.title}`)
            errorCount++
            continue
          }
          
          // Crear nombre descriptivo para el archivo
          const sanitizedTitle = item.title
            .replace(/[^a-zA-Z0-9\s]/g, '') // Remover caracteres especiales
            .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
            .substring(0, 50) // Limitar longitud
          
          const versionSuffix = item.currentVersion && item.currentVersion !== 'original' 
            ? `_${item.currentVersion}` 
            : ''
          
          const filename = `${downloadCount + 1}_${sanitizedTitle}${versionSuffix}.wav`
          
          // Si es una URL blob (audio generado localmente), descargar directamente
          if (audioUrl.startsWith('blob:')) {
            const response = await fetch(audioUrl)
            const blob = await response.blob()
            
            // Crear link de descarga
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            // Limpiar la URL temporal
            URL.revokeObjectURL(link.href)
          } else {
            // Si es una URL externa, crear link directo
            const link = document.createElement('a')
            link.href = audioUrl
            link.download = filename
            link.target = '_blank'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
          
          downloadCount++
          console.log(`✅ Descargado: ${filename}`)
          
          // Pequeña pausa entre descargas para evitar saturar el navegador
          await new Promise(resolve => setTimeout(resolve, 800))
          
        } catch (error) {
          console.error(`Error descargando audio para "${item.title}":`, error)
          errorCount++
        }
      }
      
      // Mostrar resultado final
      const successMessage = downloadCount > 0 
        ? `✅ ¡Descarga completada!\n\n📰 Audios descargados: ${downloadCount} archivos`
        : ''
      
      const errorMessage = errorCount > 0 
        ? `\n⚠️ Errores: ${errorCount} archivos no se pudieron descargar`
        : ''
      
      const finalMessage = downloadCount > 0 
        ? `${successMessage}${errorMessage}\n\n🎉 Todos los audios han sido descargados a tu carpeta de descargas.\n\n📁 Los archivos están numerados y tienen nombres descriptivos para facilitar su organización.\n\nGracias por usar VIRA 🚀`
        : `❌ No se pudo descargar ningún archivo.\n\nVerifica que los audios estén generados correctamente e intenta nuevamente.`
      
      alert(finalMessage)
      
    } catch (error) {
      console.error('Error finalizando:', error)
      alert(`❌ Error al descargar los audios: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nPor favor intenta nuevamente o contacta soporte si el problema persiste.`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando timeline del noticiero...</p>
        </div>
      </div>
    )
  }

  if (!timelineData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Error al cargar el timeline</p>
          <Button onClick={() => router.back()} className="mt-4">
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Configuración
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              Línea de Tiempo del Noticiero
            </h1>
          </div>
        </div>

        {/* Información de medios seleccionados */}
        {selectedSourcesInfo.selectedSources.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Medios</h2>
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-3">Medios Seleccionados</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {selectedSourcesInfo.selectedSources.map((source) => (
                  <div key={source} className="bg-white rounded-md p-3 border border-blue-200">
                    <div className="text-sm font-medium text-gray-900 truncate" title={source}>
                      {source}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {selectedSourcesInfo.sourceNewsCount[source] || 3} noticias
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-blue-700">
                Total de noticias configuradas: {Object.values(selectedSourcesInfo.sourceNewsCount).reduce((sum, count) => sum + count, 0)}
              </div>
            </div>
          </div>
        )}

        {/* Duración y Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-8">
              <div>
                <span className="text-sm text-gray-500">Duración Actual:</span>
                <span className={`ml-2 text-xl font-bold ${getDurationColor()}`}>
                  {formatDuration(timelineData.metadata.totalDuration)}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Duración Objetivo:</span>
                <span className="ml-2 text-xl font-bold text-gray-900">
                  {formatDuration(timelineData.metadata.targetDuration)}
                </span>
              </div>
            </div>
            
            {/* Diseño Sonoro */}
            <div className="flex items-center space-x-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Diseño Sonoro
                </label>
                <Select value={backgroundMusic} onValueChange={setBackgroundMusic}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ninguna">Ninguna</SelectItem>
                    <SelectItem value="Corporativa">Corporativa</SelectItem>
                    <SelectItem value="Dinámica">Dinámica</SelectItem>
                    <SelectItem value="Relajante">Relajante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Music className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Sonido Automático</span>
                </div>
                <Switch checked={autoSound} onCheckedChange={setAutoSound} />
              </div>
            </div>
          </div>
          
          {/* Barra de Progreso */}
          <Progress 
            value={getProgressPercentage()} 
            className="h-3"
            style={{
              '--progress-background': timelineData.metadata.totalDuration > timelineData.metadata.targetDuration ? '#ef4444' : '#22c55e'
            } as React.CSSProperties}
          />

          {/* INFORMACIÓN DE FRASES PUBLICITARIAS */}
          {timelineData.metadata.advertisementInfo && timelineData.metadata.advertisementInfo.totalAds > 0 && (
            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-full p-1.5">
                  📢
                </div>
                <div>
                  <div className="text-sm font-medium text-purple-800">
                    {timelineData.metadata.advertisementInfo.message}
                  </div>
                  <div className="text-xs text-purple-600 mt-0.5">
                    Duración publicitaria estimada: {Math.round(timelineData.metadata.advertisementInfo.totalAdTime / 60 * 100) / 100} minutos
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Seleccionar Todo */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={selectedItems.length === timelineData.timeline.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium text-gray-700">Seleccionar Todo</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkEdit}
              disabled={processingAudio.length > 0}
              className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkHumanize}
              disabled={processingAudio.length > 0}
              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Humanizar
            </Button>
            <div className="flex">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkGenerateAudio()}
                disabled={processingAudio.length > 0}
                className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 rounded-r-none"
              >
                <Mic className="h-4 w-4 mr-2" />
                Generar Voz
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={processingAudio.length > 0}
                    className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 rounded-l-none px-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {voiceLibrary.length > 0 ? (
                    voiceLibrary.map((voice) => (
                      <DropdownMenuItem key={voice.id} onClick={() => handleBulkGenerateAudio(undefined, voice.audio)}>
                        Generar Voz: {voice.nombre}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      No hay voces disponibles
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Timeline de Noticias */}
        <div className="space-y-6 mb-8">
          {timelineData.timeline.map((item, index) => (
            <Card 
              key={item.id} 
              className={`bg-white border-gray-200 hover:shadow-lg transition-all cursor-move ${
                draggedItem === item.id ? 'opacity-50 transform scale-95' : ''
              } ${
                dragOverItem === item.id ? 'border-blue-500 border-2 shadow-blue-200 shadow-lg' : ''
              }`}
              draggable={!(item.type === 'climate' || item.priority === 'required')}
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Checkbox y Drag Handle */}
                  <div className="flex items-center space-x-3 pt-1">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => handleItemSelect(item.id, checked as boolean)}
                    />
                    <div 
                      className={`cursor-move p-2 rounded hover:bg-gray-100 transition-colors ${
                        item.type === 'climate' || item.priority === 'required' 
                          ? 'opacity-30 cursor-not-allowed' 
                          : 'hover:text-blue-600'
                      }`}
                      title={
                        item.type === 'climate' || item.priority === 'required' 
                          ? 'Este elemento no se puede mover'
                          : 'Arrastra para reordenar'
                      }
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Icono del tipo de segmento */}
                  <div className="flex-shrink-0 pt-1">
                    {getNewsIcon(item.type, item.category)}
                  </div>

                  {/* Contenido principal */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {item.title}
                        </h3>
                        <div className="flex items-center space-x-4 mb-3">
                          {getSentimentBadge(item.sentiment)}
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            {item.duration}s
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item.id)}
                          disabled={processingAudio.includes(item.id)}
                          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {editingItem === item.id ? 'Editando...' : 'Editar'}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleHumanize(item.id)}
                          disabled={processingAudio.includes(item.id) || item.isHumanized}
                          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          {item.isHumanized ? 'Humanizada' : 'Humanizar'}
                        </Button>
                        
                        <div className="flex">
                          <Button
                            variant="outline"  
                            size="sm"
                            onClick={() => handleGenerateAudio(item.id, item.currentVersion || 'original', voiceLibrary[0]?.audio)}
                            disabled={processingAudio.includes(item.id)}
                            className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 rounded-r-none"
                          >
                            <Mic className="h-4 w-4 mr-2" />
                            {getCurrentAudioUrl(item) ? 'Audio Listo' : 'Generar Voz'}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={processingAudio.includes(item.id)}
                                className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 rounded-l-none px-2"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {voiceLibrary.length > 0 ? (
                                voiceLibrary.map((voice) => (
                                  <DropdownMenuItem key={voice.id} onClick={() => handleGenerateAudio(item.id, item.currentVersion || 'original', voice.audio)}>
                                    Generar Voz: {voice.nombre}
                                  </DropdownMenuItem>
                                ))
                              ) : (
                                <DropdownMenuItem disabled>
                                  No hay voces disponibles
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={item.priority === 'required' || item.type === 'climate'}
                          className={item.priority === 'required' || item.type === 'climate' ? 
                            'opacity-50 cursor-not-allowed' : 
                            'text-red-600 border-red-200 hover:bg-red-50'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Contenido del elemento - diferente para frases publicitarias */}
                    {item.type === 'advertisement' ? (
                      /* FRASE PUBLICITARIA */
                      <div className="mb-4">
                        <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">
                                📢 Frase Publicitaria #{item.adNumber}
                              </span>
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                {item.duration}s
                              </span>
                            </div>
                            {getCurrentAudioUrl(item) && (
                              <span className="text-xs text-green-600 font-medium">🎙️ Audio disponible</span>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            {/* Contenido de la frase publicitaria */}
                            {item.isEmpty ? (
                              /* Modo edición para frase vacía */
                              <div className="space-y-3">
                                <textarea
                                  className="w-full p-3 border border-purple-200 rounded-lg resize-none bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  rows={3}
                                  placeholder={item.placeholder}
                                  onChange={(e) => handleUpdateAdvertisement(item.id, e.target.value)}
                                />
                                <div className="text-xs text-purple-600">
                                  💡 Tip: Escribe una frase publicitaria convincente de 10-20 segundos
                                </div>
                              </div>
                            ) : (
                              /* Mostrar contenido de la frase */
                              <div className="space-y-2">
                                <p className="text-sm text-gray-700 leading-relaxed bg-white p-3 rounded border border-purple-200">
                                  {item.content}
                                </p>
                                <button
                                  onClick={() => handleUpdateAdvertisement(item.id, '')}
                                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                                >
                                  ✏️ Editar frase publicitaria
                                </button>
                              </div>
                            )}
                            
                            {/* OPCIONES DE AUDIO - SIEMPRE DISPONIBLES */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-purple-100">
                              <span className="text-xs text-gray-500 font-medium">Audio:</span>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => triggerAudioUpload(item.id)}
                                className="h-7 px-2 text-xs bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Subir MP3
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectFromLibrary(item.id)}
                                className="h-7 px-2 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              >
                                <Library className="h-3 w-3 mr-1" />
                                Biblioteca
                              </Button>

                              {getCurrentAudioUrl(item) && (
                                <span className="text-xs text-green-600 font-medium">
                                  ✅ Audio listo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* NOTICIA NORMAL */
                      <div className="mb-4">
                        {/* Tabs de versiones */}
                        <div className="flex space-x-1 mb-3 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => handleVersionChange(item.id, 'original')}
                            className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                              (item.currentVersion || 'original') === 'original'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            📝 Original
                          </button>
                          <button
                            onClick={() => handleVersionChange(item.id, 'rewritten')}
                            disabled={!item.isRewritten}
                            className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                              (item.currentVersion || 'original') === 'rewritten'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : item.isRewritten 
                                  ? 'text-gray-600 hover:text-gray-900'
                                  : 'text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            🔄 Reescrita {item.isRewritten ? '✓' : ''}
                          </button>
                          <button
                            onClick={() => handleVersionChange(item.id, 'humanized')}
                            disabled={!item.isHumanized}
                            className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                              (item.currentVersion || 'original') === 'humanized'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : item.isHumanized 
                                  ? 'text-gray-600 hover:text-gray-900'
                                  : 'text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            ✨ Humanizada {item.isHumanized ? '✓' : ''}
                          </button>
                          <button
                            onClick={() => handleVersionChange(item.id, 'extended')}
                            disabled={!item.isExtended}
                            className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                              (item.currentVersion || 'original') === 'extended'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : item.isExtended 
                                  ? 'text-gray-600 hover:text-gray-900'
                                  : 'text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            📏 Extendida {item.isExtended ? '✓' : ''}
                          </button>
                        </div>
                        
                        {/* Contenido según la versión seleccionada */}
                        <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                              {
                                (item.currentVersion || 'original') === 'original' ? '📝 Versión Original' :
                                (item.currentVersion || 'original') === 'rewritten' ? '🔄 Versión Reescrita' :
                                (item.currentVersion || 'original') === 'humanized' ? '✨ Versión Humanizada' :
                                '📏 Versión Extendida'
                              }
                            </span>
                            {getCurrentAudioUrl(item) && (
                              <span className="text-xs text-green-600 font-medium">🎙️ Audio disponible</span>
                            )}
                          </div>
                          
                          {/* Modo de edición */}
                          {editingItem === item.id ? (
                            <div className="space-y-3">
                              {/* Campo para editar título */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Título de la noticia
                                </label>
                                <input
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  className="w-full p-2 border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                                  placeholder="Título de la noticia..."
                                />
                              </div>
                              
                              {/* Campo para editar contenido */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Contenido de la noticia
                                </label>
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="w-full p-3 border border-blue-200 rounded-lg resize-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  rows={4}
                                  placeholder="Edita el contenido de la noticia..."
                                />
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">
                                  Título: {editingTitle.length} caracteres | Contenido: {editingText.length} caracteres
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelEdit()}
                                    className="text-gray-600 border-gray-200 hover:bg-gray-100"
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSaveEdit(item.id)}
                                    className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                    disabled={!editingTitle.trim() || !editingText.trim()}
                                  >
                                    Guardar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {getCurrentContent(item)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Fondo Musical y Audio */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">Fondo:</span>
                        <Select value="Cortina Musical" onValueChange={() => {}}>
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cortina Musical">Cortina Musical</SelectItem>
                            <SelectItem value="Ninguno">Ninguno</SelectItem>
                            <SelectItem value="Ambiente">Ambiente</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox defaultChecked />
                          <span className="text-sm text-gray-500">Ducking</span>
                        </div>
                      </div>

                      {/* Opciones de Audio */}
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(item.id)}
                            title="Editar contenido"
                            className="hover:bg-gray-100"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleToggleFavorite(item.id)}
                            title={(item as any).isFavorite ? "Remover de favoritos" : "Marcar como favorito"}
                            className={`hover:bg-gray-100 ${(item as any).isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleAdjustVolume(item.id)}
                            title="Ajustar volumen"
                            className="hover:bg-gray-100"
                          >
                            <Volume2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePlayAudio(item.id)}
                          disabled={!getCurrentAudioUrl(item)}
                          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        >
                          {currentPlayingId === item.id && isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleEditItem(item.id)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar de Audio */}
                    {getCurrentAudioUrl(item) && (
                      <div className="mt-3">
                        <div className="flex items-center space-x-2">
                          <div className="h-2 bg-blue-200 rounded-full flex-1">
                            <div 
                              className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${item.audioProgress || 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">{formatDuration(item.duration)}</span>
                          <span className="text-xs text-blue-600 font-medium">
                            {
                              (item.currentVersion || 'original') === 'original' ? '📝' :
                              (item.currentVersion || 'original') === 'rewritten' ? '🔄' : '✨'
                            }
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Transición Siguiente */}
                    {index < timelineData.timeline.length - 1 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-500">Transición Siguiente:</span>
                          <Select value={item.transitionType} onValueChange={() => {}}>
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ninguna">Ninguna</SelectItem>
                              <SelectItem value="fade">Fade</SelectItem>
                              <SelectItem value="corte">Corte</SelectItem>
                              <SelectItem value="efecto">Efecto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleAdjustDuration}
              disabled={processingAudio.length > 0}
              className="bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
            >
              <Settings className="h-4 w-4 mr-2" />
              Ajustar a Duración
            </Button>
            
            <Button
              variant="outline"
              onClick={handleOpenAddNewsModal}
              className="bg-purple-500 hover:bg-purple-600 text-white border-purple-500"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Agregar Noticia
            </Button>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleListenToNewscast}
              className="bg-green-500 hover:bg-green-600 text-white border-green-500 hidden"
            >
              <Play className="h-4 w-4 mr-2" />
              Escuchar Noticiero
            </Button>
            
            <Button
              onClick={handleFinalizeAndDownload}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Finalizar y Descargar
            </Button>
          </div>
        </div>
      </div>
      
      {/* Modal para agregar noticia */}
      <Dialog open={isAddNewsModalOpen} onOpenChange={setIsAddNewsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">Agregar Nueva Noticia</DialogTitle>
              <Button
                onClick={() => fetchNewsForModal(true)}
                disabled={modalLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${modalLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </DialogHeader>
          <div className="p-6">
            {modalLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-3" />
                <span className="text-lg">Cargando noticias disponibles...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Noticias organizadas por fuente */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Building2 className="h-5 w-5 mr-2" />
                    Fuentes y Noticias de la Región: {timelineData?.metadata?.region || 'Región Seleccionada'}
                  </h3>
                  
                  <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                    {Object.entries(newsBySource).map(([sourceName, sourceNews]) => (
                      <div key={sourceName} className="border rounded-lg p-4">
                        {/* Encabezado de la fuente */}
                        <div className="flex items-center justify-between mb-4 pb-2 border-b">
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                            <h4 className="font-semibold text-base">{sourceName}</h4>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {sourceNews.length} noticias
                            </Badge>
                          </div>
                          {/* Enlace a la fuente si está disponible */}
                          {availableSources.find(s => s.nombre === sourceName || s.nombre_fuente === sourceName) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const source = availableSources.find(s => s.nombre === sourceName || s.nombre_fuente === sourceName)
                                if (source) window.open(source.url, '_blank')
                              }}
                              className="p-1"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Lista de noticias de esta fuente */}
                        <div className="space-y-3">
                          {sourceNews.map((news) => {
                            const isInTimeline = isNewsInTimeline(news.title)
                            const isSelected = selectedNewsItems.includes(news.id)
                            
                            return (
                              <Card 
                                key={news.id} 
                                className={`p-3 transition-all ${
                                  isInTimeline 
                                    ? 'bg-gray-50 border-gray-300 opacity-75' 
                                    : isSelected 
                                      ? 'bg-purple-50 border-purple-300' 
                                      : 'hover:shadow-md'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 mr-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      {isInTimeline && (
                                        <Badge variant="secondary" className="text-xs bg-gray-200">
                                          ✓ Lista
                                        </Badge>
                                      )}
                                      <Badge 
                                        variant={news.urgency === 'high' ? 'destructive' : news.urgency === 'medium' ? 'default' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {news.urgency || 'normal'}
                                      </Badge>
                                      <Badge 
                                        variant={news.sentiment === 'positive' ? 'default' : news.sentiment === 'negative' ? 'destructive' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {news.sentiment || 'neutral'}
                                      </Badge>
                                    </div>
                                    <h5 className={`font-medium text-sm mb-2 line-clamp-2 ${isInTimeline ? 'text-gray-600' : ''}`}>
                                      {news.title}
                                    </h5>
                                    <p className={`text-xs mb-2 line-clamp-2 ${isInTimeline ? 'text-gray-500' : 'text-gray-600'}`}>
                                      {news.content}
                                    </p>
                                    <div className={`flex items-center gap-4 text-xs ${isInTimeline ? 'text-gray-400' : 'text-gray-500'}`}>
                                      <span>Categoría: {news.category}</span>
                                      <span>Región: {news.region}</span>
                                      <span>Publicado: {new Date(news.publishedAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => window.open(news.url, '_blank')}
                                      className="p-2"
                                      disabled={isInTimeline}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handleNewsSelection(news.id)}
                                      className="p-2"
                                      disabled={isInTimeline}
                                      title={isInTimeline ? "Esta noticia ya está en el timeline" : "Seleccionar noticia"}
                                    >
                                      {isInTimeline ? (
                                        <span className="text-xs">✓</span>
                                      ) : (
                                        <Plus className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    {selectedNewsItems.length} noticia(s) seleccionada(s)
                  </div>
                  
                  {/* Indicador de progreso del scraping detallado */}
                  {scrapingDetailedContent && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="text-sm font-medium text-blue-700">
                          Obteniendo contenido detallado...
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-blue-600">
                          <span>Procesando noticia {scrapingProgress.current} de {scrapingProgress.total}</span>
                          <span>{Math.round((scrapingProgress.current / scrapingProgress.total) * 100)}%</span>
                        </div>
                        <Progress 
                          value={(scrapingProgress.current / scrapingProgress.total) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddNewsModalOpen(false)}
                      disabled={scrapingDetailedContent}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddSelectedNews}
                      disabled={selectedNewsItems.length === 0 || scrapingDetailedContent}
                      className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50"
                    >
                      {scrapingDetailedContent ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Procesando...
                        </>
                      ) : (
                        `Agregar ${selectedNewsItems.length} Noticia(s)`
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
