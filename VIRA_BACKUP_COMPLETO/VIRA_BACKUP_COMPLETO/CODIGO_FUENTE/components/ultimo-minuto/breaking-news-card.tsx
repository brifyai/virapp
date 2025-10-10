
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Globe, MapPin, Eye, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface BreakingNewsCardProps {
  news: {
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
  onSelect?: (news: any) => void
  isSelected?: boolean
}

export function BreakingNewsCard({ news, onSelect, isSelected = false }: BreakingNewsCardProps) {
  // Función para resumir el título de la noticia usando Chutes API
  const humanizarTexto = async (tituloNoticia: string) => {
    const apiToken = 'cpk_4923ef9e90db4290ad75e3ba829ffcc2.73d645ff58545311aa226d6de7ec2a15.1rVtvhr097YVdX8ECmThYaLuHyGgZBxP';
    
    try {
      toast.loading('Generando resumen del título...');
      
      // Validar que hay título
      if (!tituloNoticia || tituloNoticia.trim() === '') {
        throw new Error('No hay título para resumir');
      }
      
      // Generar resumen del título con Chutes API
      const chutesResponse = await fetch('https://llm.chutes.ai/v1/chat/completions', {
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
              content: `resume la siguiente noticia de manera breve:"${tituloNoticia}"`
            }
          ],
          stream: false,
          max_tokens: 300,
          temperature: 0.4
        })
      });
      
      if (!chutesResponse.ok) {
        throw new Error(`Error en API de Chutes: ${chutesResponse.status}`);
      }
      
      const chutesData = await chutesResponse.json();
      console.log('Respuesta de Chutes:', chutesData);
      
      // Extraer el resumen de la respuesta
      if (chutesData.choices && chutesData.choices[0] && chutesData.choices[0].message) {
        const resumen = chutesData.choices[0].message.content;
        console.log('Resumen generado:', resumen);
        
        toast.dismiss();
        toast.success('Resumen generado exitosamente');
        
        // Mostrar el resumen en un alert o modal
        //alert(`RESUMEN DEL TÍTULO:\n\n"${tituloNoticia}"\n\n${resumen}`);
        
        return resumen;
      }
    } catch (error) {
      console.error('Error al resumir título:', error);
      toast.dismiss();
      toast.error(`Error: ${(error as Error).message || 'No se pudo generar el resumen'}`);
    }
  };
  const getUrgencyStyle = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return {
          badge: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertTriangle,
          text: '🚨 URGENTE',
          glow: 'shadow-red-200/50'
        }
      case 'medium':
        return {
          badge: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: AlertTriangle,
          text: '⚡ IMPORTANTE',
          glow: 'shadow-orange-200/50'
        }
      default:
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Clock,
          text: '📢 ACTUAL',
          glow: 'shadow-blue-200/50'
        }
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'politica': 'bg-purple-100 text-purple-800',
      'economia': 'bg-green-100 text-green-800',
      'deportes': 'bg-blue-100 text-blue-800',
      'tecnologia': 'bg-indigo-100 text-indigo-800',
      'salud': 'bg-pink-100 text-pink-800',
      'clima': 'bg-cyan-100 text-cyan-800',
      'seguridad': 'bg-red-100 text-red-800',
      'transporte': 'bg-yellow-100 text-yellow-800',
      'emergencia': 'bg-red-200 text-red-900',
      'general': 'bg-gray-100 text-gray-800'
    }
    return colors[category as keyof typeof colors] || colors.general
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const published = new Date(dateString)
    const diffMinutes = Math.floor((now.getTime() - published.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return 'Ahora mismo'
    if (diffMinutes < 60) return `hace ${diffMinutes} min`
    if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60)
      return `hace ${hours}h`
    }
    const days = Math.floor(diffMinutes / 1440)
    return `hace ${days}d`
  }

  const urgencyConfig = getUrgencyStyle(news.urgency)

  return (
    <Card 
      className={`
        hover:shadow-lg transition-all duration-200 cursor-pointer group
        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}
        ${news.urgency === 'high' ? 'shadow-md shadow-red-200/50' : ''}
      `}
      onClick={() => onSelect?.(news)}
    >
      <CardContent className="p-6">
        {/* Header con urgencia y tiempo */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={urgencyConfig.badge}
            >
              {urgencyConfig.text}
            </Badge>
            
            <Badge 
              variant="secondary" 
              className={getCategoryColor(news.category)}
            >
              {news.category.charAt(0).toUpperCase() + news.category.slice(1)}
            </Badge>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-500">
            {getSentimentIcon(news.sentiment)}
            <Clock className="h-4 w-4" />
            <span className="font-medium">{formatTimeAgo(news.publishedAt)}</span>
          </div>
        </div>

        {/* Título principal */}
        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-700 transition-colors">
          {news.title}
        </h3>

        {/* Resumen */}
        <p className="text-gray-700 mb-4 line-clamp-3 text-sm leading-relaxed">
          {news.summary || news.content.substring(0, 200) + '...'}
        </p>

        {/* Footer con metadata y acciones */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <Globe className="h-4 w-4 mr-1" />
              {news.source}
            </span>
            
            <span className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {news.region}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {isSelected && (
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                ✓ Seleccionada
              </Badge>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                humanizarTexto(news.title)
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
                📄 Resumir
              </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                // Aquí se puede agregar la lógica para crear voz
                toast.success('Función "Crear Voz" activada')
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              🎤 Crear Voz
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                window.open(news.url, '_blank')
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
          </div>
        </div>

        {/* Indicador de urgencia visual */}
        {news.urgency === 'high' && (
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-lg" />
        )}
      </CardContent>
    </Card>
  )
}
