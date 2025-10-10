
'use client'

import { useState, useEffect } from 'react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Clock, Globe, AlertCircle, RefreshCw, Calendar, MapPin, Eye, Play } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { BreakingNewsCard } from '@/components/ultimo-minuto/breaking-news-card'
import { UrgentFilters } from '@/components/ultimo-minuto/urgent-filters'
import { supabase } from '@/lib/supabase'

interface BreakingNews {
  id: string
  title: string
  summary: string
  content: string
  source: string
  url: string
  publishedAt: string
  region: string
  category: string
  urgency: 'low' | 'medium' | 'high'
  sentiment: 'positive' | 'negative' | 'neutral'
}



export default function UltimoMinutoPage() {
  const [breakingNews, setBreakingNews] = useState<BreakingNews[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTime, setSelectedTime] = useState('5') // 5 horas por defecto
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedNews, setSelectedNews] = useState<BreakingNews[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [audioCard, setAudioCard] = useState<{title: string, audioUrl: string} | null>(null)
  const [fuentes, setFuentes] = useState<any[]>([])

  // Función para obtener fuentes desde fuentes_final
  const ObtenerFuentes = async () => {
    try {
      const { data: fuentes, error } = await supabase
        .from('fuentes_final')
        .select('nombre, url')
         // Solo fuentes activas

      
      if (error) {
        console.error('Error al obtener fuentes:', error.message);
        return [];
      }
      
      if (!fuentes || fuentes.length === 0) {
        console.log('No se encontraron fuentes activas');
        return [];
      }
      
      console.log('Fuentes obtenidas:', fuentes);
      return fuentes;
    } catch (error) {
      console.error('Error en ObtenerFuentes:', error);
      return [];
    }
  };

  // useEffect para cargar las fuentes al montar el componente
  useEffect(() => {
    const cargarFuentes = async () => {
      const fuentesObtenidas = await ObtenerFuentes();
      setFuentes(fuentesObtenidas);
    };
    
    cargarFuentes();
  }, []);

  // Función para extraer el cuerpo completo de una noticia
  const SacarDatosCuerpo = async (url: string): Promise<string> => {
    const api_scrapingbee = "PCL3YCEIRZW7FQHQ0RD3V5325LAI52420VXGK71BC3XET9LD2KCPWK30OXAF7HTRDIOJD09HQZSWAQE0";
    
    try {
      // Validar URL antes de hacer la petición
      if (!url || !url.startsWith('http')) {
        console.warn(`URL inválida: ${url}`);
        return "URL inválida";
      }

      // Limpiar la URL de espacios y caracteres extraños
      const cleanUrl = url.trim();
      
      const response = await fetch(`https://app.scrapingbee.com/api/v1/?${new URLSearchParams({
        api_key: api_scrapingbee,
        url: cleanUrl,
        render_js: "false",
        block_resources: "true",
        premium_proxy: "false",
        country_code: "cl"
      })}`);
      
      if (!response.ok) {
        console.error(`Error HTTP ${response.status} para URL: ${cleanUrl}`);
        return `Error HTTP ${response.status}`;
      }
      
      const data = await response.text();
      
      if (data && data.trim()) {
        // Crear elemento temporal para parsear HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data;
        
        // Lista de selectores CSS para buscar el contenido principal
        const contentSelectors = [
          // Selectores específicos para contenido de artículos
          '.entry-content',
          '.post-content', 
          '.article-content',
          '.content-body',
          '.story-body',
          '.article-body',
          '.post-body',
          '.main-content',
          '.td-post-content',
          '.single-post-content',
          
          // Selectores más genéricos
          'article p',
          '.content p',
          'main p',
          
          // Selectores para sitios específicos chilenos
          '.noticia-contenido',
          '.texto-noticia',
          '.cuerpo-noticia',
          '.desarrollo',
          '.bajada',
          
          // Fallback genérico
          'p'
        ];
        
        let extractedContent = '';
        
        // Remover elementos no deseados antes de extraer contenido
         const unwantedSelectors = [
           'img', 'figure', 'picture', // Imágenes
           '.logo', '.header-logo', '.site-logo', // Logos específicos
           'nav', 'header', 'footer', // Navegación y estructura
           '.advertisement', '.ads', '.banner', // Publicidad
           '.social-share', '.share-buttons', // Botones sociales
           '.related-posts', '.sidebar', // Contenido relacionado
           'script', 'style', 'noscript', // Scripts y estilos
           '.comments', '.comment-section', // Comentarios
           '.breadcrumb', '.tags', '.categories' // Metadatos
         ];
         
         // Eliminar elementos no deseados
         unwantedSelectors.forEach(selector => {
           const unwantedElements = tempDiv.querySelectorAll(selector);
           unwantedElements.forEach(el => el.remove());
         });
         
         // Intentar extraer contenido con cada selector
         for (const selector of contentSelectors) {
           try {
             const elements = tempDiv.querySelectorAll(selector);
             if (elements.length > 0) {
               // Concatenar texto de todos los elementos encontrados
               const texts = Array.from(elements)
                 .map(el => {
                   const text = el.textContent?.trim() || '';
                   // Filtrar textos que parezcan ser nombres de archivos de imagen o logos
                   if (text.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) || 
                       text.match(/logo|banner|advertisement/i) ||
                       text.length < 20) {
                     return null;
                   }
                   return text;
                 })
                 .filter(text => text !== null) // Filtrar textos nulos
                 .slice(0, 5); // Tomar máximo 5 párrafos
               
               if (texts.length > 0) {
                 extractedContent = texts.join(' ');
                 console.log(`Contenido extraído con selector: ${selector}`);
                 break;
               }
             }
           } catch (selectorError) {
             console.warn(`Error con selector ${selector}:`, selectorError);
             continue;
           }
         }
        
        // Si no se encontró contenido específico, usar texto completo como fallback
        if (!extractedContent || extractedContent.length < 50) {
          const allText = tempDiv.textContent || tempDiv.innerText || '';
          extractedContent = allText.trim();
          console.log('Usando texto completo como fallback');
        }
        
        // Limpiar y limitar el contenido
        const cleanContent = extractedContent
          .replace(/\s+/g, ' ') // Normalizar espacios
          .replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ.,;:!?¿¡()\-]/g, '') // Mantener solo caracteres válidos
          .trim();
        
        const finalContent = cleanContent || "Contenido no disponible";
         
         console.log('Datos extraídos de la URL:', url);
         console.log('Contenido extraído:', finalContent);
         console.log('Longitud del contenido:', finalContent.length);
         
         return finalContent;
      } else {
        return "Contenido no disponible";
      }
    } catch (error) {
      console.error(`Error al extraer contenido de ${url}:`, error);
      return "Error al obtener contenido";
    }
  };

  // Función para sacar datos con ScrapingBee usando las fuentes del estado
  const SacarDatos = async (): Promise<BreakingNews[]> => {
    const api_scrapingbee = "PCL3YCEIRZW7FQHQ0RD3V5325LAI52420VXGK71BC3XET9LD2KCPWK30OXAF7HTRDIOJD09HQZSWAQE0";
    
    try {
      // Usar las fuentes del estado
      if (fuentes.length === 0) {
        console.log('No hay fuentes disponibles');
        return [];
      }
      
      // Filtrar fuentes según la región seleccionada
      let fuentesFiltradas = fuentes;
      if (selectedRegion !== 'all') {
        fuentesFiltradas = fuentes.filter(fuente => fuente.nombre === selectedRegion);
        console.log(`Filtrando por región: ${selectedRegion}, fuentes encontradas: ${fuentesFiltradas.length}`);
      }
      
      if (fuentesFiltradas.length === 0) {
        console.log('No hay fuentes para la región seleccionada');
        return [];
      }
      
      // Procesar cada fuente filtrada con ScrapingBee
      const todasLasNoticias: BreakingNews[] = [];
      
      for (const fuente of fuentesFiltradas) {
        try {
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
          
          const data = await response.json();
          
          if (data.items && data.items.length > 0) {
            // Filtrar items que tengan algún campo vacío y tomar solo los primeros 3 por fuente
            const itemsFiltrados = data.items
              .filter((item: { enlace: string; texto: string }) => item.enlace && item.texto)
              .slice(0, 3);
            
            if (itemsFiltrados.length > 0) {
              // Transformar los datos al formato BreakingNews
              const noticiasTransformadas: BreakingNews[] = itemsFiltrados.map((item: { enlace: string; texto: string }, index: number) => ({
                id: `scraped-${Date.now()}-${index}`,
                title: item.texto,
                summary: `Noticia obtenida de ${fuente.nombre}`,
                content: item.texto,
                source: fuente.nombre,
                url: item.enlace.startsWith('http') ? item.enlace : `${fuente.url}${item.enlace}`,
                publishedAt: new Date().toISOString(),
                region: "Arica y Parinacota", // Podrías usar fuente.region si existe
                category: "general",
                urgency: 'medium' as const,
                sentiment: 'neutral' as const
              }));
              
              todasLasNoticias.push(...noticiasTransformadas);
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
                    .news a[href*="/"], .noticia a[href*="/"], .article a[href*="/"],
                    .item a[href*="/"], .story a[href*="/"], .content a[href*="/"],
                    .list-item a[href*="/"], .grid-item a[href*="/"], .card a[href*="/"],
                    .entry a[href*="/"], .headline a[href*="/"], .title a[href*="/"],
                    .featured a[href*="/"], .latest a[href*="/"], .recent a[href*="/"],
                    .breaking a[href*="/"], .urgent a[href*="/"], .important a[href*="/"],
                    a[href*="/noticia/"], a[href*="/news/"], a[href*="/articulo/"],
                    a[href*="/post/"], a[href*="/story/"], a[href*="/reportaje/"],
                    a[href*="/breaking/"], a[href*="/ultimo/"], a[href*="/actualidad/"],
                    a[href*="/2024/"], a[href*="/2023/"], a[href*="/202"],
                    .td-module-title a, .td-block-title a, .td-module-thumb a,
                    h1 a[href*="/"], h2 a[href*="/"], h3 a[href*="/"],
                    [class*="noticia"] a[href*="/"], [class*="news"] a[href*="/"],
                    [class*="article"] a[href*="/"], [class*="post"] a[href*="/"],
                    [class*="story"] a[href*="/"], [class*="breaking"] a[href*="/"]
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
              const newsKeywords = [
                'noticia', 'news', 'articulo', 'article', 'post', 'story', 'breaking', 'ultimo', 'actualidad',
                'reportaje', 'informe', 'cronica', 'chronicle', 'report', 'update', 'alert', 'alerta',
                'comunicado', 'press', 'prensa', 'medio', 'media', 'periodismo', 'journalism',
                'nacional', 'internacional', 'local', 'regional', 'politica', 'economia', 'deportes',
                'cultura', 'sociedad', 'tecnologia', 'salud', 'educacion', 'mundo', 'pais', 'ciudad',
                'gobierno', 'congreso', 'senado', 'camara', 'ministro', 'presidente', 'alcalde',
                'emergencia', 'urgente', 'importante', 'destacado', 'principal', 'portada'
              ];
              const fallbackItems = fallbackData.items
                .filter((item: { enlace: string; texto: string }) => {
                  const texto = item.texto?.toLowerCase() || '';
                  const enlace = item.enlace?.toLowerCase() || '';
                  
                  // Filtros básicos de calidad
                  if (!item.enlace || !item.texto || item.texto.length < 10 || item.texto.length > 300) {
                    return false;
                  }
                  
                  // Excluir enlaces que claramente no son noticias
                  const excludeKeywords = ['javascript:', 'mailto:', '#', 'login', 'register', 'subscribe', 'contact', 'about', 'privacy', 'terms'];
                  if (excludeKeywords.some(keyword => enlace.includes(keyword))) {
                    return false;
                  }
                  
                  // Incluir si contiene palabras clave de noticias
                  const hasNewsKeyword = newsKeywords.some(keyword => texto.includes(keyword) || enlace.includes(keyword));
                  
                  // Incluir si tiene patrón de fecha en URL
                  const hasDatePattern = enlace.match(/\/\d{4}\/\d{1,2}\/\d{1,2}\//) || 
                                        enlace.includes('/2024/') || enlace.includes('/2023/') || enlace.includes('/2022/');
                  
                  // Incluir si parece ser una URL de artículo
                  const hasArticlePattern = enlace.includes('/articulo/') || enlace.includes('/noticia/') || 
                                          enlace.includes('/news/') || enlace.includes('/post/') || 
                                          enlace.includes('/story/') || enlace.includes('/reportaje/');
                  
                  return hasNewsKeyword || hasDatePattern || hasArticlePattern;
                })
                .slice(0, 2); // Solo 2 noticias del fallback
              
              if (fallbackItems.length > 0) {
                const noticiasTransformadas: BreakingNews[] = fallbackItems.map((item: { enlace: string; texto: string }, index: number) => ({
                   id: `fallback-${Date.now()}-${index}`,
                   title: item.texto,
                   content: item.texto,
                   source: fuente.nombre,
                   url: item.enlace.startsWith('http') ? item.enlace : `${fuente.url}${item.enlace}`,
                   timestamp: new Date().toISOString(),
                   isUrgent: false,
                   category: "general"
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
      return todasLasNoticias.slice(0, 15); // Limitar a 15 noticias totales
      
    } catch (error) {
      console.error("Error en la función SacarDatos:", error);
      return [];
    }
  };



  // Función para convertir texto a voz usando Chutes API
  const vozTexto = async (texto: string) => {
    const apiToken = 'cpk_4923ef9e90db4290ad75e3ba829ffcc2.73d645ff58545311aa226d6de7ec2a15.1rVtvhr097YVdX8ECmThYaLuHyGgZBxP';
    try {
      const response = await fetch('https://chutes-kokoro.chutes.ai/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          text: texto,
          voice: 'af_heart'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // La respuesta es un archivo de audio, no JSON
      const audioBlob = await response.blob();
      console.log('Audio generado exitosamente:', audioBlob.size, 'bytes');
      
      // Crear URL para reproducir el audio
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // No intentar reproducir automáticamente, solo crear la tarjeta de audio
      console.log('Audio generado y listo para reproducir');
      
      return audioBlob;
    } catch (error) {
      console.error('Error al convertir texto a voz:', error);
      return null;
    }
  };

  // Función para obtener noticias de último minuto
  const fetchBreakingNews = async () => {
    setIsLoading(true)
    
    try {
      // Ejecutar SacarDatos y obtener las noticias transformadas
      const noticiasScrapeo = await SacarDatos();
      
      // Enriquecer las noticias con el contenido completo usando SacarDatosCuerpo
      const noticiasConCuerpo = await Promise.all(
        noticiasScrapeo.map(async (noticia) => {
          const contenidoCompleto = await SacarDatosCuerpo(noticia.url);
          return {
            ...noticia,
            content: contenidoCompleto,
            summary: contenidoCompleto.length > 200 ? contenidoCompleto.substring(0, 200) + '...' : contenidoCompleto
          };
        })
      );
      
      console.log('Noticias enriquecidas con contenido:', noticiasConCuerpo.length);
      
      if (noticiasConCuerpo.length > 0) {
         setBreakingNews(noticiasConCuerpo)
         setLastUpdate(new Date())
         toast.success(`${noticiasConCuerpo.length} noticias de último minuto encontradas`)
         
         // Ejecutar función de texto a voz con el primer titular y crear tarjeta de audio
         // DESACTIVADO: Función vozTexto comentada para no ejecutarse
         /*
         if (noticiasConCuerpo[0]?.title) {
           const audioBlob = await vozTexto(noticiasConCuerpo[0].title);
           if (audioBlob) {
             const audioUrl = URL.createObjectURL(audioBlob);
             setAudioCard({
               title: noticiasConCuerpo[0].title,
               audioUrl: audioUrl
             });
           })
         }
         */
      } else {
        // Si no hay datos del scraping, intentar con la API original
        const response = await fetch('/api/breaking-news', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timeFrame: parseInt(selectedTime),
            region: selectedRegion,
            category: selectedCategory,
            urgentOnly: true
          }),
        })

        const data = await response.json()

        if (data.success) {
          setBreakingNews(data.news || [])
          setLastUpdate(new Date())
          toast.success(`${data.news?.length || 0} noticias de último minuto encontradas`)
        } else {
          toast.error('Error al obtener noticias: ' + (data.error || 'Error desconocido'))
          setBreakingNews([])
        }
      }
    } catch (error) {
      console.error('Error fetching breaking news:', error)
      toast.error('Error al conectar con el servidor')
      setBreakingNews([])
    } finally {
      setIsLoading(false)
    }
  }

  // Función para manejar selección de noticias
  const toggleNewsSelection = (news: BreakingNews) => {
    setSelectedNews(prev => {
      const isSelected = prev.some(n => n.id === news.id)
      if (isSelected) {
        return prev.filter(n => n.id !== news.id)
      } else {
        return [...prev, news]
      }
    })
  }

  // Función para generar noticiero de último minuto
  const generateUrgentNewscast = async () => {
    const newsToUse = selectedNews.length > 0 ? selectedNews : breakingNews
    
    if (newsToUse.length === 0) {
      toast.error('No hay noticias para generar el noticiero')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/generate-urgent-newscast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          news: newsToUse,
          timeFrame: selectedTime,
          region: selectedRegion,
          priority: 'urgent'
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Noticiero de último minuto generado exitosamente')
        // Redirigir al timeline del noticiero
        window.location.href = `/timeline-noticiero/${data.report_id}?urgent=true`
      } else {
        toast.error('Error al generar noticiero: ' + (data.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error generating urgent newscast:', error)
      toast.error('Error al generar el noticiero')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh cada 5 minutos si está habilitado
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchBreakingNews()
      }, 5 * 60 * 1000) // 5 minutos
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, selectedTime, selectedRegion, selectedCategory])

  // Cargar noticias inicial - DESHABILITADO
  // useEffect(() => {
  //   fetchBreakingNews()
  // }, [])



  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Cobertura de Último Minuto</h1>
                <p className="text-gray-600">Noticias urgentes y de alta importancia en tiempo real</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {lastUpdate && (
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  Actualizado: {lastUpdate.toLocaleTimeString('es-CL')}
                </div>
              )}
              
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-actualizar
              </Button>
              

            </div>
          </div>

          {/* Filtros */}
          <UrgentFilters
            selectedTime={selectedTime}
            selectedRegion={selectedRegion}
            selectedCategory={selectedCategory}
            onTimeChange={setSelectedTime}
            onRegionChange={setSelectedRegion}
            onCategoryChange={setSelectedCategory}
            onSearch={fetchBreakingNews}
            isLoading={isLoading}
            newsCount={breakingNews.length}
            fuentes={fuentes}
          />

          {/* Barra de acciones */}
          {breakingNews.length > 0 && (
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {breakingNews.length} noticias encontradas
                    </Badge>
                    
                    {selectedNews.length > 0 && (
                      <Badge variant="default" className="text-lg px-4 py-2 bg-blue-100 text-blue-800">
                        {selectedNews.length} seleccionadas
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedNews([])}
                      disabled={selectedNews.length === 0}
                    >
                      Limpiar Selección
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBreakingNews([]);
                        setSelectedNews([]);
                        setAudioCard(null);
                      }}
                      disabled={breakingNews.length === 0}
                      className="border-orange-500 text-orange-600 hover:bg-orange-50"
                    >
                      Limpiar Noticias
                    </Button>
                    
                    <Button 
                      onClick={generateUrgentNewscast}
                      disabled={isLoading || breakingNews.length === 0}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {selectedNews.length > 0 
                        ? `Generar con ${selectedNews.length} Seleccionadas`
                        : `Generar con Todas (${breakingNews.length})`
                      }
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tarjeta de Audio */}
        {audioCard && (
          <Card className="border-l-4 border-l-blue-500 mb-6 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-blue-700 flex items-center gap-2">
                🎵 Audio Noticia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 mb-4">{audioCard.title}</p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    console.log('Reproduciendo audio:', {
                      title: audioCard.title,
                      audioUrl: audioCard.audioUrl,
                      audioUrlLength: audioCard.audioUrl.length,
                      audioUrlType: typeof audioCard.audioUrl
                    })
                    const audio = new Audio(audioCard.audioUrl);
                    audio.play().catch(err => console.log('Error reproduciendo audio:', err));
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
                >
                  ▶️ Reproducir
                </Button>
                <span className="text-xs text-gray-500">Audio generado automáticamente</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Noticias */}
        <div className="space-y-4">
          {isLoading && breakingNews.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 mx-auto text-gray-400 animate-spin mb-4" />
                  <p className="text-gray-600">Escaneando fuentes de noticias...</p>
                </div>
              </CardContent>
            </Card>
          ) : breakingNews.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay noticias de último minuto</h3>
                  <p className="text-gray-600 mb-4">
                    No se encontraron noticias urgentes en el período seleccionado.
                  </p>
                  <Button onClick={fetchBreakingNews} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Intentar Nuevamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            breakingNews.map((news) => (
              <BreakingNewsCard
                key={news.id}
                news={news}
                onSelect={toggleNewsSelection}
                isSelected={selectedNews.some(n => n.id === news.id)}
              />
            ))
          )}
        </div>

        {/* Footer con estadísticas */}
        {breakingNews.length > 0 && (
          <Card className="mt-8">
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {breakingNews.filter(n => n.urgency === 'high').length}
                  </div>
                  <div className="text-sm text-gray-600">Noticias Urgentes</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {breakingNews.filter(n => n.urgency === 'medium').length}
                  </div>
                  <div className="text-sm text-gray-600">Importantes</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {breakingNews.filter(n => n.sentiment === 'positive').length}
                  </div>
                  <div className="text-sm text-gray-600">Noticias Positivas</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {new Set(breakingNews.map(n => n.source)).size}
                  </div>
                  <div className="text-sm text-gray-600">Fuentes Diferentes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
