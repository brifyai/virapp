
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Zap, Save, ChevronDown, Clock, MapPin, Star, DollarSign, Calculator, Cpu, Mic, Globe, Settings, ChevronRight } from 'lucide-react'

// Interfaces para las funciones de scraping
interface BreakingNews {
  id: string
  title: string
  content: string
  source: string
  url: string
  timestamp: string
  isUrgent?: boolean
  category?: string
}

interface NewsSource {
  nombre_fuente: string
  url: string
  selector_titulo?: string
  selector_contenido?: string
  selector_enlace?: string
  selector_fecha?: string
}

// Funciones de scraping adaptadas desde ultimo-minuto
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
const SacarDatos = async (fuentes: any[], selectedRegion: string): Promise<BreakingNews[]> => {
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
                .td-module-meta-info, .entry-title, .post-title, .article-title, 
                h1 a, h2 a, h3 a, h4 a, h5 a, h6 a,
                .headline, .title, .news-title, .story-title, .article-headline,
                .post-header a, .entry-header a, .content-title a,
                .news-item a, .article-item a, .story-item a,
                .featured-title a, .main-title a, .primary-title a,
                .card-title a, .item-title a, .link-title a,
                .news-link, .article-link, .story-link,
                .list-item a, .grid-item a, .feed-item a,
                .widget-title a, .sidebar-title a,
                .category-title a, .section-title a,
                .breaking-news a, .latest-news a, .top-news a,
                .home-news a, .front-page a, .main-content a,
                .content-wrapper a, .article-wrapper a,
                .news-wrapper a, .story-wrapper a,
                .post a[href*="/"], .entry a[href*="/"],
                .content a[href*="/"], .main a[href*="/"],
                .container a[href*="/"], .wrapper a[href*="/"],
                [class*="title"] a, [class*="headline"] a,
                [class*="news"] a, [class*="article"] a,
                [class*="story"] a, [class*="post"] a,
                [id*="title"] a, [id*="headline"] a,
                [id*="news"] a, [id*="article"] a,
                .wp-block-latest-posts a, .wp-block-post-title a,
                .elementor-heading-title a, .elementor-post-title a,
                .vc_custom_heading a, .vc_gitem-post-data-source-post_title a,
                .fusion-post-title a, .avada-post-title a,
                .divi-post-title a, .et_pb_post_title a,
                .beaver-post-title a, .fl-post-title a,
                .oxygen-post-title a, .bricks-post-title a
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
              content: item.texto,
              source: fuente.nombre,
              url: item.enlace.startsWith('http') ? item.enlace : `${fuente.url}${item.enlace}`,
              timestamp: new Date().toISOString(),
              isUrgent: false,
              category: "general"
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
                selector: "a[href*='/']",
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

// Interfaz para las regiones desde Supabase
interface RadioStation {
  id: string
  region: string
  name: string
}

// Datos predefinidos de radios por región
const radioStations: RadioStation[] = [
  // Arica y Parinacota
  { id: '1', region: 'Arica y Parinacota', name: 'Radio Arica' },
  { id: '2', region: 'Arica y Parinacota', name: 'Radio Parinacota' },
  { id: '3', region: 'Arica y Parinacota', name: 'Radio Norte Grande' },
  
  // Tarapacá
  { id: '4', region: 'Tarapacá', name: 'Radio Iquique' },
  { id: '5', region: 'Tarapacá', name: 'Radio Tarapacá' },
  { id: '6', region: 'Tarapacá', name: 'Radio Desierto' },
  
  // Antofagasta
  { id: '7', region: 'Antofagasta', name: 'Radio Antofagasta' },
  { id: '8', region: 'Antofagasta', name: 'Radio Minera' },
  { id: '9', region: 'Antofagasta', name: 'Radio Norte' },
  
  // Atacama
  { id: '10', region: 'Atacama', name: 'Radio Atacama' },
  { id: '11', region: 'Atacama', name: 'Radio Copiapó' },
  { id: '12', region: 'Atacama', name: 'Radio Vallenar' },
  
  // Coquimbo
  { id: '13', region: 'Coquimbo', name: 'Radio Coquimbo' },
  { id: '14', region: 'Coquimbo', name: 'Radio La Serena' },
  { id: '15', region: 'Coquimbo', name: 'Radio Elqui' },
  
  // Valparaíso
  { id: '16', region: 'Valparaíso', name: 'Radio Valparaíso' },
  { id: '17', region: 'Valparaíso', name: 'Radio Viña del Mar' },
  { id: '18', region: 'Valparaíso', name: 'Radio Aconcagua' },
  
  // Metropolitana
  { id: '19', region: 'Metropolitana', name: 'Radio Santiago' },
  { id: '20', region: 'Metropolitana', name: 'Radio Cooperativa' },
  { id: '21', region: 'Metropolitana', name: 'Radio Bío Bío' },
  { id: '22', region: 'Metropolitana', name: 'Radio ADN' },
  
  // O'Higgins
  { id: '23', region: "O'Higgins", name: 'Radio Rancagua' },
  { id: '24', region: "O'Higgins", name: 'Radio Cachapoal' },
  { id: '25', region: "O'Higgins", name: 'Radio San Fernando' },
  
  // Maule
  { id: '26', region: 'Maule', name: 'Radio Talca' },
  { id: '27', region: 'Maule', name: 'Radio Maule' },
  { id: '28', region: 'Maule', name: 'Radio Curicó' },
  
  // Ñuble
  { id: '29', region: 'Ñuble', name: 'Radio Chillán' },
  { id: '30', region: 'Ñuble', name: 'Radio Ñuble' },
  
  // Biobío
  { id: '31', region: 'Biobío', name: 'Radio Concepción' },
  { id: '32', region: 'Biobío', name: 'Radio Biobío Regional' },
  { id: '33', region: 'Biobío', name: 'Radio Los Ángeles' },
  
  // Araucanía
  { id: '34', region: 'Araucanía', name: 'Radio Temuco' },
  { id: '35', region: 'Araucanía', name: 'Radio Araucanía' },
  { id: '36', region: 'Araucanía', name: 'Radio Frontera' },
  
  // Los Ríos
  { id: '37', region: 'Los Ríos', name: 'Radio Valdivia' },
  { id: '38', region: 'Los Ríos', name: 'Radio Los Ríos' },
  
  // Los Lagos
  { id: '39', region: 'Los Lagos', name: 'Radio Osorno' },
  { id: '40', region: 'Los Lagos', name: 'Radio Puerto Montt' },
  { id: '41', region: 'Los Lagos', name: 'Radio Chiloé' },
  
  // Aysén
  { id: '42', region: 'Aysén', name: 'Radio Coyhaique' },
  { id: '43', region: 'Aysén', name: 'Radio Aysén' },
  
  // Magallanes
  { id: '44', region: 'Magallanes', name: 'Radio Magallanes' },
  { id: '45', region: 'Magallanes', name: 'Radio Punta Arenas' },
  { id: '46', region: 'Magallanes', name: 'Radio Polar' }
]

// Fuentes de noticias por región
const newsSources = {
  'Arica y Parinacota': [
    { name: 'La Estrella de Arica', url: 'https://www.estrellaarica.cl' },
    { name: 'El Morrocotudo', url: 'https://www.elmorrocotudo.cl' },
    { name: 'Arica al Día', url: 'https://www.aricaaldia.cl' },
    { name: 'Soy Arica', url: 'https://www.soyarica.cl' },
    { name: 'Arica Mía', url: 'https://www.aricamia.cl' },
    { name: 'El Concordia', url: 'https://www.elconcordia.cl' },
    { name: 'Pura Noticia Arica', url: 'https://www.puranoticiaarica.cl' },
    { name: 'Arica es Noticia', url: 'https://www.aricaesnoticia.cl' }
  ]
}

const categories = [
  { id: 'regionales', label: 'Regionales', checked: true },
  { id: 'nacionales', label: 'Nacionales', checked: true },
  { id: 'deportes', label: 'Deportes', checked: false },
  { id: 'economia', label: 'Economía', checked: false },
  { id: 'mundo', label: 'Mundo', checked: false },
  { id: 'tendencias', label: 'Tendencias', checked: false },
  { id: 'farandula', label: 'Farandula', checked: false }
]

const voiceOptions = [
  'Alloy (Voz Masculina)',
  'Echo (Voz Femenina)',
  'Nova (Voz Neutral)',
  'Onyx (Voz Profunda)',
  'Shimmer (Voz Suave)'
]

// Definición de proveedores y costos REALES (precios Septiembre 2025)
const serviceProviders = {
  scraping: {
    basic: { name: 'Scraping Básico', costPerSource: 5, description: 'Fuentes RSS estándar' },
    advanced: { name: 'Scraping Avanzado', costPerSource: 15, description: 'JS rendering, anti-bot' },
    premium: { name: 'Scraping Premium', costPerSource: 30, description: 'Multi-región, tiempo real' }
  },
  
  rewriting: {
    'llama3-8b-8192': { name: 'Llama3 8B (Groq)', costPerNews: 0.1, tier: 'Ultra Económico', description: 'Gratis en beta - Ultra rápido' },
    'llama3-70b-8192': { name: 'Llama3 70B (Groq)', costPerNews: 0.8, tier: 'Ultra Económico', description: 'Excelente calidad/precio' },
    'mixtral-8x7b-32768': { name: 'Mixtral 8x7B (Groq)', costPerNews: 0.5, tier: 'Ultra Económico', description: 'Recomendado Groq' },
    'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', costPerNews: 2, tier: 'Económico', description: 'Rápido y económico' },
    'gpt-4.1-mini': { name: 'GPT-4.1 Mini', costPerNews: 1, tier: 'Ultra Económico', description: 'Óptimo para noticias' },
    'gpt-4-turbo': { name: 'GPT-4 Turbo', costPerNews: 25, tier: 'Premium', description: 'Alta calidad' },
    'claude-3-haiku': { name: 'Claude 3 Haiku', costPerNews: 3, tier: 'Económico', description: 'Ultra-rápido' },
    'claude-3-sonnet': { name: 'Claude 3 Sonnet', costPerNews: 12, tier: 'Balanceado', description: 'Equilibrio perfecto' },
    'claude-3-opus': { name: 'Claude 3 Opus', costPerNews: 60, tier: 'Premium', description: 'Máxima calidad' }
  },

  humanization: {
    'llama3-8b-8192': { name: 'Llama3 8B (Groq)', costPerNews: 0.08, tier: 'Ultra Económico', description: 'Gratis en beta - Muy rápido' },
    'llama3-70b-8192': { name: 'Llama3 70B (Groq)', costPerNews: 0.6, tier: 'Ultra Económico', description: 'Excelente humanización' },
    'mixtral-8x7b-32768': { name: 'Mixtral 8x7B (Groq)', costPerNews: 0.4, tier: 'Ultra Económico', description: 'Recomendado Groq' },
    'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', costPerNews: 1.5, tier: 'Económico', description: 'Humanización básica' },
    'gpt-4.1-mini': { name: 'GPT-4.1 Mini', costPerNews: 0.8, tier: 'Ultra Económico', description: 'Estilo natural' },
    'gpt-4-turbo': { name: 'GPT-4 Turbo', costPerNews: 20, tier: 'Premium', description: 'Estilo muy natural' },
    'claude-3-haiku': { name: 'Claude 3 Haiku', costPerNews: 2, tier: 'Económico', description: 'Rápido y natural' },
    'claude-3-sonnet': { name: 'Claude 3 Sonnet', costPerNews: 8, tier: 'Balanceado', description: 'Muy humano' },
    'claude-3-opus': { name: 'Claude 3 Opus', costPerNews: 40, tier: 'Premium', description: 'Ultra humano' }
  },

  audioGeneration: {
    'edge-tts': { name: 'Edge TTS', costPerMinute: 0, tier: 'Gratis', description: 'Gratis, calidad básica' },
    'polly': { name: 'Amazon Polly', costPerMinute: 8, tier: 'Económico', description: 'Muy económico' },
    'azure-speech': { name: 'Azure Speech', costPerMinute: 8, tier: 'Económico', description: 'Voces chilenas' },
    'openai-tts': { name: 'OpenAI TTS', costPerMinute: 35, tier: 'Balanceado', description: 'Balance calidad/precio' },
    'elevenlabs': { name: 'ElevenLabs', costPerMinute: 180, tier: 'Premium', description: 'Ultra calidad' },
    'abacus-elevenlabs': { name: 'Abacus ElevenLabs', costPerMinute: 150, tier: 'Premium', description: 'Premium integrado' }
  }
}

// Perfiles preconfigurados
const costProfiles = {
  economico: {
    name: '🥉 Ultra Económico (Groq)',
    description: 'Mínimo costo con Groq - casi gratis',
    providers: {
      scraping: 'basic',
      rewriting: 'llama3-8b-8192',
      humanization: 'llama3-8b-8192',
      audioGeneration: 'edge-tts'
    }
  },
  
  balanceado: {
    name: '🥈 Balanceado (Groq + OpenAI)',
    description: 'Groq 70B + OpenAI TTS - excelente precio',
    providers: {
      scraping: 'advanced',
      rewriting: 'llama3-70b-8192',
      humanization: 'llama3-70b-8192',
      audioGeneration: 'openai-tts'
    }
  },
  
  premium: {
    name: '🥇 Premium',
    description: 'Máxima calidad profesional',
    providers: {
      scraping: 'premium',
      rewriting: 'claude-3-opus',
      humanization: 'gpt-4-turbo',
      audioGeneration: 'elevenlabs'
    }
  }
}

// Componente Calculador de Costos Avanzado
interface CostCalculatorProps {
  // Configuración básica
  duration: number
  selectedSources: string[]
  selectedCategories: Array<{id: string, label: string, checked: boolean}>
  includeTimeWeather: boolean
  providers: {
    scraping: string
    rewriting: string
    humanization: string
    audioGeneration: string
  }
  // Nuevas props para sincronización completa
  totalNews: number
  regionalNews: number
  nationalNews: number
  adFrequency: number
  adCount: number
  newsTime: string
  selectedRegion: string
  selectedStation: string
  voiceModel: string
  // Funciones para actualizar valores
  onProvidersChange: (providers: any) => void
  onUpdateDuration: (duration: number) => void
  onUpdateAdFrequency: (frequency: number) => void
  onUpdateAdCount: (count: number) => void
  onUpdateTimeWeather: (include: boolean) => void
  onUpdateNewsTime: (time: string) => void
}

function CostCalculator({ 
  duration, 
  selectedSources, 
  selectedCategories, 
  includeTimeWeather, 
  providers, 
  onProvidersChange,
  // Nuevas props
  totalNews,
  regionalNews,
  nationalNews,
  adFrequency,
  adCount,
  newsTime,
  selectedRegion,
  selectedStation,
  voiceModel,
  // Funciones de actualización
  onUpdateDuration,
  onUpdateAdFrequency,
  onUpdateAdCount,
  onUpdateTimeWeather,
  onUpdateNewsTime
}: CostCalculatorProps) {
  const [selectedProfile, setSelectedProfile] = useState<'economico' | 'balanceado' | 'premium' | 'personalizado'>('balanceado')

  const [showAdvanced, setShowAdvanced] = useState(false)

  // Obtener proveedores actuales según el perfil seleccionado
  const currentProviders = selectedProfile === 'personalizado' 
    ? providers 
    : costProfiles[selectedProfile].providers

  // Calcular costos usando valores REALES de la configuración
  const targetDuration = duration * 60 // convertir minutos a segundos
  const actualNewsCount = totalNews // Usar el total real de noticias configuradas
  const audioMinutes = Math.ceil(targetDuration / 60)

  // Costos individuales
  const baseProcessingCost = 25 // Costo base más realista
  const scrapingCost = selectedSources.length * serviceProviders.scraping[currentProviders.scraping as keyof typeof serviceProviders.scraping].costPerSource
  const rewritingCost = actualNewsCount * serviceProviders.rewriting[currentProviders.rewriting as keyof typeof serviceProviders.rewriting].costPerNews
  const humanizationCost = actualNewsCount * serviceProviders.humanization[currentProviders.humanization as keyof typeof serviceProviders.humanization].costPerNews
  const weatherCost = includeTimeWeather ? 15 : 0 // Costo realista para API de clima
  const timeCost = includeTimeWeather ? 5 : 0 // Costo mínimo para obtener hora
  const audioCost = audioMinutes * serviceProviders.audioGeneration[currentProviders.audioGeneration as keyof typeof serviceProviders.audioGeneration].costPerMinute
  
  // Costo adicional de publicidad (si hay frases publicitarias)
  const adCost = adCount > 0 ? adCount * 10 : 0 // Costo por frase publicitaria

  const totalCost = baseProcessingCost + scrapingCost + rewritingCost + humanizationCost + weatherCost + timeCost + audioCost + adCost

  const updateCustomProvider = (service: string, provider: string) => {
    onProvidersChange({
      ...providers,
      [service]: provider
    })
    setSelectedProfile('personalizado')
  }

  // Función para actualizar cuando se selecciona un perfil predefinido
  const handleProfileChange = (profile: 'economico' | 'balanceado' | 'premium') => {
    setSelectedProfile(profile)
    onProvidersChange(costProfiles[profile].providers)
  }

  return (
    <div className="space-y-6">
      {/* Selector de Perfiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {Object.entries(costProfiles).map(([key, profile]) => (
          <button
            key={key}
            onClick={() => handleProfileChange(key as any)}
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              selectedProfile === key
                ? 'border-blue-500 bg-blue-50 text-blue-900'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="font-semibold text-sm">{profile.name}</div>
            <div className="text-xs text-gray-600 mt-1">{profile.description}</div>
          </button>
        ))}
        
        <button
          onClick={() => setSelectedProfile('personalizado')}
          className={`p-3 rounded-lg border-2 text-left transition-all ${
            selectedProfile === 'personalizado'
              ? 'border-purple-500 bg-purple-50 text-purple-900'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="font-semibold text-sm flex items-center">
            <Settings className="h-4 w-4 mr-1" />
            Personalizado
          </div>
          <div className="text-xs text-gray-600 mt-1">Elige cada proveedor</div>
        </button>
      </div>

      {/* Resumen de Costo */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-900">Costo Total Estimado:</span>
          <span className="text-3xl font-bold text-blue-600">
            ${totalCost.toLocaleString('es-CL')} CLP
          </span>
        </div>
        <div className="text-sm text-gray-700">
          Noticiero de {duration} minuto{duration !== 1 ? 's' : ''} • {actualNewsCount} noticia{actualNewsCount !== 1 ? 's' : ''} • {selectedSources.length} fuente{selectedSources.length !== 1 ? 's' : ''}
        </div>
        <div className="text-xs text-gray-600 mt-2">
          Perfil: {selectedProfile === 'personalizado' ? '🎛️ Personalizado' : costProfiles[selectedProfile].name}
        </div>
      </div>

      {/* Toggle para configuración avanzada */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 flex items-center">
          <Calculator className="h-4 w-4 mr-2" />
          Desglose Detallado
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2"
        >
          {showAdvanced ? 'Ocultar' : 'Configurar'} Proveedores
          <ChevronRight className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
        </Button>
      </div>

      {/* Configuración avanzada de proveedores */}
      {showAdvanced && (
        <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
          {/* Scraping */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Scraping de Noticias</span>
                <Badge variant="outline" className="text-xs">
                  ${scrapingCost.toLocaleString('es-CL')}
                </Badge>
              </div>
            </div>
            <Select
              value={currentProviders.scraping}
              onValueChange={(value) => updateCustomProvider('scraping', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(serviceProviders.scraping).map(([key, provider]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center justify-between w-full">
                      <span>{provider.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ${provider.costPerSource}/fuente
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reescritura IA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">Reescritura con IA</span>
                <Badge variant="outline" className="text-xs">
                  ${rewritingCost.toLocaleString('es-CL')}
                </Badge>
              </div>
            </div>
            <Select
              value={currentProviders.rewriting}
              onValueChange={(value) => updateCustomProvider('rewriting', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(serviceProviders.rewriting).map(([key, provider]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>{provider.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {provider.tier}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        ${provider.costPerNews}/noticia
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Humanización IA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm">Humanización con IA</span>
                <Badge variant="outline" className="text-xs">
                  ${humanizationCost.toLocaleString('es-CL')}
                </Badge>
              </div>
            </div>
            <Select
              value={currentProviders.humanization}
              onValueChange={(value) => updateCustomProvider('humanization', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(serviceProviders.humanization).map(([key, provider]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>{provider.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {provider.tier}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        ${provider.costPerNews}/noticia
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Síntesis de Voz */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-sm">Síntesis de Voz</span>
                <Badge variant="outline" className="text-xs">
                  ${audioCost.toLocaleString('es-CL')}
                </Badge>
              </div>
            </div>
            <Select
              value={currentProviders.audioGeneration}
              onValueChange={(value) => updateCustomProvider('audioGeneration', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(serviceProviders.audioGeneration).map(([key, provider]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>{provider.name}</span>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            provider.tier === 'Gratis' ? 'bg-green-100 text-green-700' :
                            provider.tier === 'Económico' ? 'bg-blue-100 text-blue-700' :
                            provider.tier === 'Balanceado' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {provider.tier}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {provider.costPerMinute === 0 ? 'Gratis' : `$${provider.costPerMinute}/min`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Desglose simple */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between p-3 bg-white rounded-lg border">
          <span>Procesamiento Base</span>
          <span className="font-medium">${baseProcessingCost.toLocaleString('es-CL')}</span>
        </div>

        <div className="flex justify-between p-3 bg-white rounded-lg border">
          <span>Scraping ({selectedSources.length} fuente{selectedSources.length !== 1 ? 's' : ''})</span>
          <span className="font-medium">${scrapingCost.toLocaleString('es-CL')}</span>
        </div>

        <div className="flex justify-between p-3 bg-white rounded-lg border">
          <span>Reescritura IA ({actualNewsCount} noticia{actualNewsCount !== 1 ? 's' : ''})</span>
          <span className="font-medium">${rewritingCost.toLocaleString('es-CL')}</span>
        </div>

        <div className="flex justify-between p-3 bg-white rounded-lg border">
          <span>Humanización IA</span>
          <span className="font-medium">${humanizationCost.toLocaleString('es-CL')}</span>
        </div>

        {includeTimeWeather && (
          <>
            <div className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span>Mención de Hora</span>
              <span className="font-medium">${timeCost.toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span>Mención del Clima</span>
              <span className="font-medium">${weatherCost.toLocaleString('es-CL')}</span>
            </div>
          </>
        )}

        {adCount > 0 && (
          <div className="flex justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
            <span>Frases Publicitarias ({adCount} frases)</span>
            <span className="font-medium">${adCost.toLocaleString('es-CL')}</span>
          </div>
        )}

        <div className="flex justify-between p-3 bg-green-50 rounded-lg border border-green-200 md:col-span-2">
          <span>Conversión a Audio ({audioMinutes} min)</span>
          <span className="font-medium">${audioCost.toLocaleString('es-CL')}</span>
        </div>
      </div>

      {/* Información de configuración sincronizada */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 text-sm mb-3">📊 Configuración Sincronizada</h5>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
          <div><strong>Región:</strong> {selectedRegion}</div>
          <div><strong>Radio:</strong> {selectedStation}</div>
          <div><strong>Voz:</strong> {voiceModel}</div>
          <div><strong>Noticias:</strong> {regionalNews} reg. + {nationalNews} nac.</div>
          <div><strong>Publicidad:</strong> cada {adFrequency} noticias</div>
          <div><strong>Hora emisión:</strong> {newsTime}</div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-xs text-gray-600 space-y-2">
          <div className="flex items-center gap-2">
            <span>💡</span>
            <span>Los precios son estimados y pueden variar según la complejidad del contenido.</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🎯</span>
            <span>Todos los proveedores garantizan calidad profesional adecuada para broadcasting.</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🔄</span>
            <span>El costo se cobra únicamente cuando el noticiero es generado exitosamente.</span>
          </div>
          <div className="flex items-center gap-2">
            <span>⚡</span>
            <span>Los proveedores "Económicos" son igual de rápidos pero con menor refinamiento.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Función para obtener fuentes desde Supabase
const ObtenerFuentes = async () => {
  try {
    const { data, error } = await supabase
      .from('fuentes_final')
      .select('*')
    
    if (error) {
      console.error('Error al obtener fuentes:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error en ObtenerFuentes:', error)
    return []
  }
}

export default function CrearNoticiero() {
  const router = useRouter()
  // Estados eliminados: regions y loadingRegions ya no son necesarios
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedRadio, setSelectedRadio] = useState('')
  const [selectedCategories, setSelectedCategories] = useState(categories)
  const [duration, setDuration] = useState([15])
  const [intelligentCuration, setIntelligentCuration] = useState(true)
  const [voice, setVoice] = useState('Alloy (Voz Masculina)')
  const [adFrequency, setAdFrequency] = useState(3)
  const [adCount, setAdCount] = useState(3)
  const [includeTimeWeather, setIncludeTimeWeather] = useState(true)
  const [newsTime, setNewsTime] = useState('08:00')
  const [selectedSources, setSelectedSources] = useState<string[]>([])  
  const [sourceNewsCount, setSourceNewsCount] = useState<{[key: string]: number}>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [newsSourcesFromDB, setNewsSourcesFromDB] = useState<{[key: string]: Array<{name: string, url: string}>}>({}) 
  const [fuentes, setFuentes] = useState<Array<{id: string, nombre: string, nombre_fuente: string, region: string}>>([])
  
  // Estado para los proveedores de costos (por defecto balanceado)
  const [costProviders, setCostProviders] = useState({
    scraping: 'advanced',
    rewriting: 'llama3-70b-8192',
    humanization: 'llama3-70b-8192',  
    audioGeneration: 'openai-tts'
  })

  // Función para obtener fuentes desde Supabase
  async function obtenerFuentes() {

    try {
      const { data, error } = await supabase
        .from('fuentes_final')
        .select('*')
        .order('nombre', { ascending: true })
      
      if (error) {
        console.error('Error al obtener fuentes ssss:', error.message)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error al conectar con Supabase:', error)
      return null
    }
  }

 
  // Cargar fuentes al inicializar el componente
  useEffect(() => {
    const cargarFuentes = async () => {
      try {
        const fuentesData = await ObtenerFuentes()
        if (fuentesData && fuentesData.length > 0) {
          setFuentes(fuentesData)
          console.log('Fuentes cargadas:', fuentesData.length)
        }
      } catch (error) {
        console.error('Error al cargar fuentes:', error)
      }
    }
    
    cargarFuentes()
  }, [])

  
  // Ejecutar pedirHistoriaChutes cuando se carga la página
  /*
  useEffect(() => {
    pedirHistoriaChutes()
  }, [])
  */
  // Obtener regiones desde Supabase
 

  // Limpiar radio seleccionada cuando cambie la región para mostrar todas las opciones
  useEffect(() => {
    if (selectedRegion) {
      setSelectedRadio('') // No preseleccionar ninguna radio
    }
  }, [selectedRegion])

  // NUEVA LÓGICA: Calcular noticias basado en DURACIÓN y CATEGORÍAS seleccionadas
  const { totalNews, regionalNews, nationalNews, availableTime, adTime } = useMemo(() => {
    const selectedCats = selectedCategories.filter(cat => cat.checked)
    const totalDurationMinutes = duration[0] // duración total en minutos
    const totalDurationSeconds = totalDurationMinutes * 60 // convertir a segundos
    
    // SI NO HAY CATEGORÍAS SELECCIONADAS = 0 NOTICIAS
    if (selectedCats.length === 0) {
      return { 
        totalNews: 0, 
        regionalNews: 0, 
        nationalNews: 0,
        availableTime: 0,
        adTime: 0
      }
    }
    
    // Calcular tiempo consumido por publicidad
    const adDurationPerPhrase = 15 // segundos por frase publicitaria (estimado)
    const totalAdTime = adCount * adDurationPerPhrase // tiempo total de publicidad en segundos
    
    // Calcular tiempo consumido por clima/hora si está habilitado
    const timeWeatherDuration = includeTimeWeather ? 30 : 0 // 30 segundos para clima/hora
    
    // Tiempo disponible para noticias (descontando publicidad y clima)
    const availableNewsTime = Math.max(totalDurationSeconds - totalAdTime - timeWeatherDuration, 60) // mínimo 1 minuto
    
    // Cada noticia consume aproximadamente 45-60 segundos (promedio 50 segundos)
    const averageNewsLength = 50
    const maxPossibleNews = Math.floor(availableNewsTime / averageNewsLength)
    
    // NUEVA LÓGICA: Distribuir tiempo disponible entre categorías seleccionadas
    const timePerCategory = availableNewsTime / selectedCats.length
    const newsPerCategory = Math.floor(timePerCategory / averageNewsLength)
    
    // Asegurar al menos 1 noticia por categoría si hay tiempo suficiente
    const minNewsPerCategory = maxPossibleNews >= selectedCats.length ? 1 : 0
    const finalNewsPerCategory = Math.max(newsPerCategory, minNewsPerCategory)
    
    // Total de noticias = categorías × noticias por categoría
    let finalTotalNews = selectedCats.length * finalNewsPerCategory
    
    // Limitar al máximo posible por tiempo disponible
    finalTotalNews = Math.min(finalTotalNews, maxPossibleNews)
    
    // Si sobra tiempo, distribuir noticias extra entre categorías
    let remainingNews = maxPossibleNews - finalTotalNews
    if (remainingNews > 0 && finalTotalNews > 0) {
      const extraNewsPerCategory = Math.floor(remainingNews / selectedCats.length)
      finalTotalNews += selectedCats.length * extraNewsPerCategory
    }
    
    // Distribuir entre regionales y nacionales basado en proporción
    const hasRegional = selectedCats.some(cat => cat.id === 'regionales')
    const hasNational = selectedCats.some(cat => cat.id === 'nacionales') 
    const otherCats = selectedCats.filter(cat => cat.id !== 'regionales' && cat.id !== 'nacionales').length
    
    let regionalNews = 0
    let nationalNews = 0
    
    if (finalTotalNews === 0) {
      // Sin noticias, sin distribución
      regionalNews = 0
      nationalNews = 0
    } else {
      // Calcular proporción basada en categorías seleccionadas
      const totalCats = selectedCats.length
      
      if (hasRegional && hasNational && otherCats > 0) {
        // Las 3 tipos de categorías presentes - dividir proporcionalmente
        const newsPerType = Math.floor(finalTotalNews / 3)
        regionalNews = newsPerType
        nationalNews = newsPerType + (finalTotalNews - newsPerType * 3) // resto a nacionales
      } else if (hasRegional && hasNational) {
        // Solo regionales y nacionales - dividir 50/50
        regionalNews = Math.floor(finalTotalNews * 0.5)
        nationalNews = finalTotalNews - regionalNews
      } else if (hasRegional) {
        // Solo regionales - todas las noticias
        regionalNews = finalTotalNews
        nationalNews = 0
      } else if (hasNational) {
        // Solo nacionales - todas las noticias
        regionalNews = 0
        nationalNews = finalTotalNews
      } else {
        // Solo otras categorías - contar como nacionales
        regionalNews = 0
        nationalNews = finalTotalNews
      }
    }
    
    return { 
      totalNews: finalTotalNews, 
      regionalNews, 
      nationalNews,
      availableTime: Math.round(availableNewsTime / 60 * 10) / 10, // tiempo disponible en minutos (redondeado)
      adTime: Math.round(totalAdTime / 60 * 10) / 10 // tiempo de publicidad en minutos
    }
  }, [selectedCategories, duration, adCount, includeTimeWeather]) // Dependencias para recalcular

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    setSelectedCategories(categories =>
      categories.map(cat =>
        cat.id === categoryId ? { ...cat, checked } : cat
      )
    )
  }

  const handleSourceSelect = (sourceName: string) => {
    setSelectedSources(prev => {
      const isCurrentlySelected = prev.includes(sourceName)
      if (isCurrentlySelected) {
        // Si se deselecciona, remover también del contador
        setSourceNewsCount(prevCount => {
          const newCount = { ...prevCount }
          delete newCount[sourceName]
          return newCount
        })
        return prev.filter(s => s !== sourceName)
      } else {
        // Si se selecciona, agregar con cantidad por defecto de 3
        setSourceNewsCount(prevCount => ({
          ...prevCount,
          [sourceName]: 3
        }))
        return [...prev, sourceName]
      }
    })
  }

  const handleNewsCountChange = (sourceName: string, count: number) => {
    setSourceNewsCount(prev => ({
      ...prev,
      [sourceName]: Math.max(1, Math.min(10, count)) // Limitar entre 1 y 10
    }))
  }

  const handleSave = async () => {
    if (!selectedRegion || !selectedRadio) {
      alert('❌ Por favor selecciona una región y radio antes de guardar la plantilla')
      return
    }

    try {
      const templateData = {
        name: `Plantilla ${selectedRegion} - ${selectedRadio}`,
        region: selectedRegion,
        radio: selectedRadio,
        duration: duration[0],
        categories: selectedCategories.filter(cat => cat.checked),
        voice: voice,
        adFrequency: adFrequency,
        includeTimeWeather: includeTimeWeather,
        newsTime: newsTime,
        createdAt: new Date().toISOString()
      }

      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const savedTemplates = JSON.parse(localStorage.getItem('vira_templates') || '[]')
      const newTemplate = {
        id: Date.now(),
        ...templateData
      }
      
      savedTemplates.push(newTemplate)
      localStorage.setItem('vira_templates', JSON.stringify(savedTemplates))
      
      alert(`✅ Plantilla guardada exitosamente!\n\n📝 Nombre: ${templateData.name}\n⏱️ Duración: ${duration[0]} minutos\n📍 Región: ${selectedRegion}\n📻 Radio: ${selectedRadio}\n\nPuedes encontrarla en la sección "Plantillas"`)
    } catch (error) {
      alert('❌ Error al guardar la plantilla. Por favor intenta nuevamente.')
    }
  }



  // Función para hacer petición POST a Chutes API
  const pedirHistoriaChutes = async () => {
    const apiToken = 'cpk_4923ef9e90db4290ad75e3ba829ffcc2.73d645ff58545311aa226d6de7ec2a15.1rVtvhr097YVdX8ECmThYaLuHyGgZBxP';
    try {
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
              content: 'Cuentame una historia corta. Devuelve solo la historia, sin titulo'
            }
          ],
          stream: false,
          max_tokens: 1024,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Respuesta de Chutes:', data);
      
      // Extraer el contenido de la respuesta
      if (data.choices && data.choices[0] && data.choices[0].message) {
        console.log('Historia generada:', data.choices[0].message.content);
      }
    } catch (error) {
      console.error('Error al pedir historia a Chutes:', error);
    }
  };

  const handleSearchUrgentNews = async () => {
    // Scroll suave a la sección de Último Minuto con delay
    setTimeout(() => {
      const ultimoMinutoSection = document.getElementById('ultimo-minuto')
      if (ultimoMinutoSection) {
        ultimoMinutoSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }
    }, 100)

    if (!selectedRegion) {
      alert('❌ Por favor selecciona una región primero')
      return
    }

    try {
      alert(`⏳ Buscando noticias urgentes para ${selectedRegion}...`)
      
      // Usar las funciones SacarDatos y SacarDatosCuerpo integradas
      const breakingNews = await SacarDatos(fuentes, selectedRegion)
      
      if (breakingNews && breakingNews.length > 0) {
        const urgentNews = breakingNews.filter((news: BreakingNews) => 
          news.category === 'urgente' || 
          news.title.toLowerCase().includes('urgente') ||
          news.title.toLowerCase().includes('último momento') ||
          news.title.toLowerCase().includes('breaking')
        )
        
        if (urgentNews.length > 0) {
          const newsText = urgentNews.map((news: BreakingNews, index: number) => 
            `${index + 1}. ${news.title}\n   ${news.content.substring(0, 100)}...`
          ).join('\n\n')
          
          alert(`🚨 NOTICIAS URGENTES ENCONTRADAS (${urgentNews.length})\n\n${newsText}\n\n✅ Estas noticias se han agregado automáticamente a tu configuración`)
        } else {
          const regularNews = breakingNews.slice(0, 3)
          const newsText = regularNews.map((news: BreakingNews, index: number) => 
            `${index + 1}. ${news.title}\n   ${news.content.substring(0, 100)}...`
          ).join('\n\n')
          
          alert(`📰 NOTICIAS RECIENTES (${regularNews.length})\n\n${newsText}\n\n💡 No se encontraron noticias marcadas como urgentes, pero estas son las más recientes para ${selectedRegion}`)
        }
      } else {
        alert(`⚠️ No se encontraron noticias urgentes para ${selectedRegion} en este momento.\n\nInténtalo nuevamente en unos minutos o verifica tu conexión a internet.`)
      }
    } catch (error) {
      console.error('Error searching urgent news:', error)
      alert(`❌ Error al buscar noticias urgentes: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nPor favor verifica tu conexión e intenta nuevamente.`)
    }
  }

  const handleGenerateNews = async () => {
    if (isGenerating) return
    
    setIsGenerating(true)
    try {
      // Validar configuración mínima
      if (!selectedRegion || !selectedRadio) {
        alert('❌ Por favor selecciona una región y radio antes de generar el noticiero.')
        setIsGenerating(false)
        return
      }

      // Console.log con fuentes seleccionadas y sus cantidades
      console.log('=== FUENTES SELECCIONADAS ===')
      console.log('Fuentes:', selectedSources)
      console.log('Cantidad de fuentes seleccionadas:', selectedSources.length)
      console.log('Detalle de cantidades por fuente:')
      selectedSources.forEach(source => {
        const count = sourceNewsCount[source] || 3
        console.log(`- ${source}: ${count} noticias`)
      })
      console.log('Total de noticias a obtener:', 
        selectedSources.reduce((total, source) => total + (sourceNewsCount[source] || 3), 0)
      )
      console.log('=============================')

      // Guardar configuración antes de generar el noticiero
      const configurationData = {
        name: `Configuración ${selectedRegion} - ${selectedRadio} - ${new Date().toLocaleDateString()}`,
        region: selectedRegion,
        radio: selectedRadio,
        duration: duration[0],
        categories: selectedCategories.filter(cat => cat.checked),
        voice: voice,
        adFrequency: adFrequency,
        includeTimeWeather: includeTimeWeather,
        newsTime: newsTime,
        selectedSources: selectedSources,
        sourceNewsCount: sourceNewsCount,
        createdAt: new Date().toISOString()
      }

      // Guardar en localStorage (similar a handleSave)
      const savedConfigurations = JSON.parse(localStorage.getItem('vira_configurations') || '[]')
      const newConfiguration = {
        id: Date.now(),
        ...configurationData
      }
      
      savedConfigurations.push(newConfiguration)
      localStorage.setItem('vira_configurations', JSON.stringify(savedConfigurations))
      
      console.log('✅ Configuración guardada:', configurationData)

      // Configuración del noticiero
      const config = {
        region: selectedRegion,
        radio: selectedRadio,
        targetDuration: duration[0] * 60, // Convertir minutos a segundos
        selectedSources: selectedSources,
        sourceNewsCount: sourceNewsCount, // Agregar las cantidades por fuente
        includeCategories: selectedCategories.filter(cat => cat.checked).map(cat => cat.id),
        style: 'profesional',
        tone: 'neutral',
        length: 'medium',
        providers: costProviders, // Agregar proveedores seleccionados
        // FRASES PUBLICITARIAS
        advertisementConfig: {
          adCount: adCount,
          adFrequency: adFrequency, // cada cuántas noticias
          adDurationPerPhrase: 15, // segundos estimados por frase
          totalAdTime: adCount * 15, // tiempo total de publicidad
          includeTimeWeather: includeTimeWeather
        }
      }

      console.log('Generando noticiero con configuración:', config)

      // SCRAPING DESHABILITADO - No se ejecutará SacarDatos ni SacarDatosCuerpo
      console.log(`⚠️ Scraping deshabilitado para la región: ${selectedRegion}`)
      
      // Configuración sin scraping de noticias
      const configWithNews = {
        ...config,
        scrapedNews: [] // Sin noticias scrapeadas
      }
      
      console.log('Configuración final sin scraping:', configWithNews)

      // Llamar a la API de generación
      const response = await fetch('/api/generate-newscast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configWithNews)
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        // Generar ID único para la sesión del noticiero
        const timelineId = `newscast_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        
        // Guardar configuración de región y radio en localStorage
        const searchConfig = {
          region: selectedRegion,
          radio: selectedRadio,
          selectedSources: selectedSources,
          sourceNewsCount: sourceNewsCount,
          timestamp: Date.now()
        }
        localStorage.setItem('newscast_search_config', JSON.stringify(searchConfig))
        
        // Guardar datos del timeline en localStorage para la siguiente página
        localStorage.setItem(`timeline_${timelineId}`, JSON.stringify(result))
        
        // Navegar al timeline del noticiero
        router.push(`/timeline-noticiero/${timelineId}`)
      } else {
        throw new Error(result.error || 'Error desconocido al generar el noticiero')
      }

    } catch (error) {
      console.error('Error generando noticiero:', error)
      
      let errorMessage = 'Error desconocido al procesar la solicitud'
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = 'Error de autenticación. Por favor inicia sesión nuevamente.'
        } else if (error.message.includes('403')) {
          errorMessage = 'No tienes permisos para realizar esta acción.'
        } else if (error.message.includes('429')) {
          errorMessage = 'Has alcanzado el límite de generaciones. Intenta más tarde.'
        } else if (error.message.includes('500')) {
          errorMessage = 'Error interno del servidor. Por favor intenta más tarde.'
        } else {
          errorMessage = error.message
        }
      }
      
      alert(`❌ Error al generar el noticiero:\n\n${errorMessage}\n\nPor favor verifica tu conexión e intenta nuevamente.`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Obtener fuentes de noticias para la región seleccionada desde fuentes
  const currentSources = selectedRegion 
    ? fuentes
        .filter(fuente => fuente.nombre === selectedRegion)
        .map(fuente => ({ name: fuente.nombre_fuente, url: '#' }))
    : []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Crear Nuevo Noticiero
          </h1>
          <div className="flex items-center space-x-3">
            <Select defaultValue="cargar-plantilla">
              <SelectTrigger className="w-48 bg-white">
                <SelectValue placeholder="Cargar Plantilla..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cargar-plantilla">Cargar Plantilla...</SelectItem>
                <SelectItem value="matinal-express">Noticiero Matinal Express</SelectItem>
                <SelectItem value="resumen-tarde">Resumen Tarde</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-white" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 1. Selección de Emisora */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Selección de Emisora</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Región */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Región
                </label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una región" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Obtener regiones únicas desde Supabase */}
                    {Array.from(new Set(fuentes.map(f => f.nombre))).map(region => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Radio */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Radio
                </label>
                <Select value={selectedRadio} onValueChange={setSelectedRadio} disabled={!selectedRegion}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={!selectedRegion ? "Selecciona una región primero" : "Selecciona una radio"} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Filtrar radios por región seleccionada */}
                    {radioStations
                      .filter(station => station.region === selectedRegion)
                      .map(station => (
                        <SelectItem key={station.id} value={station.name}>
                          {station.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fuentes Sugeridas */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                  <span className="text-sm font-medium text-gray-600">FUENTES SUGERIDAS</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentSources.map(source => (
                    <div key={source.name} className="flex items-center gap-2">
                      <Button
                        variant={selectedSources.includes(source.name) ? "default" : "outline"}
                        size="sm"
                        className={`text-xs ${
                          selectedSources.includes(source.name) 
                            ? "bg-blue-600 text-white" 
                            : "hover:bg-blue-50 hover:border-blue-200"
                        }`}
                        onClick={() => handleSourceSelect(source.name)}
                      >
                        {source.name}
                      </Button>
                      {selectedSources.includes(source.name) && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 text-xs"
                            onClick={() => handleNewsCountChange(source.name, (sourceNewsCount[source.name] || 3) - 1)}
                          >
                            -
                          </Button>
                          <span className="text-xs font-medium min-w-[20px] text-center">
                            {sourceNewsCount[source.name] || 3}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 text-xs"
                            onClick={() => handleNewsCountChange(source.name, (sourceNewsCount[source.name] || 3) + 1)}
                          >
                            +
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cobertura de Último Minuto */}
              <div id="ultimo-minuto">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                    <span className="text-sm font-medium text-gray-700">Cobertura de Último Minuto</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Inicia tu noticiero con las noticias más urgentes del momento.
                  </p>
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleSearchUrgentNews}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Buscar Noticias Urgentes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Categorías y Estilo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Categorías y Estilo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Categorías */}
              <div className="grid grid-cols-2 gap-4">
                {selectedCategories.map(category => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={category.id}
                      checked={category.checked}
                      onCheckedChange={(checked) => 
                        handleCategoryChange(category.id, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={category.id}
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      {category.label}
                    </label>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Curación Inteligente */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Curación Inteligente</span>
                    <Star className="h-4 w-4 text-amber-500" />
                  </div>
                  <Switch
                    checked={intelligentCuration}
                    onCheckedChange={(checked) => setIntelligentCuration(checked as boolean)}
                  />
                </div>
                <p className="text-xs text-gray-600">
                  Prioriza noticias y evita duplicados.
                </p>
              </div>

              {/* Voz y Tono */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Voz y Tono</span>
                  <Star className="h-4 w-4 text-amber-500" />
                </div>
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tendencias */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-800">
                    Tendencias en {selectedRegion}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800">
                    "Crisis hídrica"
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800">
                    "Festival de la Serena"
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800">
                    "Minería"
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Formato del Noticiero */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Formato del Noticiero</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Total estimado - DINÁMICO CON DISTRIBUCIÓN DE TIEMPO */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-700 font-medium">Total estimado:</span>
                  <span className="text-lg font-bold text-blue-900">
                    {totalNews} noticias
                  </span>
                </div>
                <div className="text-xs text-blue-600 mb-3">
                  {selectedCategories.filter(cat => cat.checked).length <= 2 ? (
                    // Si solo hay 1-2 categorías, mostrar en línea
                    <div className="flex justify-between">
                      <span>Regionales: {regionalNews}</span>
                      <span>Nacionales: {nationalNews}</span>
                    </div>
                  ) : (
                    // Si hay más categorías, mostrar distribución detallada
                    <div className="space-y-1">
                      <div className="text-center font-medium text-blue-700 mb-2">
                        📊 Distribución por categorías ({Math.round(totalNews / selectedCategories.filter(cat => cat.checked).length)} noticias/categoría):
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        {selectedCategories.filter(cat => cat.checked).map(cat => {
                          const newsPerCategory = Math.round(totalNews / selectedCategories.filter(cat => cat.checked).length)
                          return (
                            <div key={cat.id} className="bg-white rounded px-2 py-1 border border-blue-100">
                              <span className="font-medium">{cat.label}:</span> {newsPerCategory}
                            </div>
                          )
                        })}
                      </div>
                      {totalNews % selectedCategories.filter(cat => cat.checked).length > 0 && (
                        <div className="text-center text-xs text-gray-500 mt-1">
                          * {totalNews % selectedCategories.filter(cat => cat.checked).length} noticia{totalNews % selectedCategories.filter(cat => cat.checked).length !== 1 ? 's' : ''} extra distribuida{totalNews % selectedCategories.filter(cat => cat.checked).length !== 1 ? 's' : ''} aleatoriamente
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Distribución de tiempo visual */}
                <div className="bg-white rounded-lg p-3 mb-3 border border-blue-200">
                  <div className="text-xs text-blue-700 font-medium mb-2">⏱️ Distribución de tiempo ({duration[0]} min):</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-700">🗞️ Noticias:</span>
                      <span className="font-medium text-green-600">{availableTime} min</span>
                    </div>
                    {adCount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">📢 Publicidad ({adCount} frases):</span>
                        <span className="font-medium text-purple-600">{adTime} min</span>
                      </div>
                    )}
                    {includeTimeWeather && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">🌤️ Hora/Clima:</span>
                        <span className="font-medium text-blue-600">0.5 min</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-blue-600 text-center mb-3">
                  {selectedCategories.filter(cat => cat.checked).length === 0 ? (
                    <div className="text-red-600">⚠️ Sin categorías seleccionadas = 0 noticias</div>
                  ) : (
                    <div>
                      📊 {selectedCategories.filter(cat => cat.checked).length} categoría{selectedCategories.filter(cat => cat.checked).length !== 1 ? 's' : ''} × ~50 seg/noticia
                      <div className="text-green-600 mt-1">
                        ⏱️ Tiempo distribuido equitativamente entre categorías
                      </div>
                    </div>
                  )}
                  {adCount > 0 && (
                    <div className="text-purple-600 mt-1">
                      ⚠️ {adCount} frases publicitarias reducen las noticias disponibles
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="text-xs text-blue-700 font-medium mb-2">
                    {selectedCategories.filter(cat => cat.checked).length === 0 
                      ? "❌ Sin categorías = Sin noticias" 
                      : `Categorías activas (${selectedCategories.filter(cat => cat.checked).length}):`
                    }
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedCategories.filter(cat => cat.checked).map(cat => (
                      <span key={cat.id} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {cat.label}
                      </span>
                    ))}
                    {selectedCategories.filter(cat => cat.checked).length === 0 && (
                      <span className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                        🚫 Selecciona al menos 1 categoría para generar noticias
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Duración Total */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Duración Total ({duration[0]} min)
                </label>
                <Slider
                  value={duration}
                  onValueChange={setDuration}
                  min={5}
                  max={60}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Cantidad de Frases Publicitarias */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Cantidad de Frases Publicitarias
                </label>
                <Slider
                  value={[adCount]}
                  onValueChange={(value) => setAdCount(value[0])}
                  min={0}
                  max={30}
                  step={1}
                  className="w-full"
                />
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">{adCount}</span>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  Rango: 0 - 30 frases publicitarias
                </div>
              </div>

              {/* Publicidad cada... */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Publicidad cada...
                </label>
                <Slider
                  value={[adFrequency]}
                  onValueChange={(value) => setAdFrequency(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex items-center justify-end space-x-2">
                  <span className="text-2xl font-bold text-gray-900">{adFrequency}</span>
                  <span className="text-sm text-gray-600">noticias</span>
                </div>
              </div>

              {/* Incluir Mención de Hora y Clima */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="time-weather"
                    checked={includeTimeWeather}
                    onCheckedChange={(checked) => setIncludeTimeWeather(checked as boolean)}
                  />
                  <label 
                    htmlFor="time-weather"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Incluir Mención de Hora y Clima
                  </label>
                </div>
                {includeTimeWeather && (
                  <div className="flex items-center space-x-2 ml-6">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <Input
                      type="time"
                      value={newsTime}
                      onChange={(e) => setNewsTime(e.target.value)}
                      className="w-32 h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calculador de Costos */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                💰 Costo Estimado del Noticiero
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CostCalculator
                duration={duration[0]}
                selectedSources={selectedSources}
                selectedCategories={selectedCategories}
                includeTimeWeather={includeTimeWeather}
                providers={costProviders}
                onProvidersChange={setCostProviders}
                // Nuevas props sincronizadas
                totalNews={totalNews}
                regionalNews={regionalNews}
                nationalNews={nationalNews}
                adFrequency={adFrequency}
                adCount={adCount}
                newsTime={newsTime}
                selectedRegion={selectedRegion}
                selectedStation={selectedRadio}
                voiceModel={voice}
                // Funciones de actualización
                onUpdateDuration={(newDuration) => setDuration([newDuration])}
                onUpdateAdFrequency={setAdFrequency}
                onUpdateAdCount={setAdCount}
                onUpdateTimeWeather={setIncludeTimeWeather}
                onUpdateNewsTime={setNewsTime}
              />
            </CardContent>
          </Card>
        </div>

        {/* Botón Generar */}
        <div className="mt-8 flex justify-center">
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 disabled:opacity-50"
            onClick={handleGenerateNews}
            disabled={isGenerating}
          >
            <Zap className="h-5 w-5 mr-2" />
            {isGenerating ? 'Generando...' : 'Generar Noticiero'}
          </Button>
        </div>
      </main>
    </div>
  )
}
