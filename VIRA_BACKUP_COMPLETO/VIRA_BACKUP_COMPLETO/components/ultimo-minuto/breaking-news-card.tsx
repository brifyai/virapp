
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { 
  Clock, 
  Globe, 
  MapPin, 
  Eye, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Mic 
} from '@lucide/react'

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
  onHumanize?: (textoNoticia: string) => void
}

export function BreakingNewsCard({ news, onSelect, isSelected = false, onHumanize }: BreakingNewsCardProps) {
  const { toast } = useToast()
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
        relative hover:shadow-lg transition-all duration-200 cursor-pointer group
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
            
            {onHumanize && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onHumanize(news.content)
                  toast({
                    title: "Éxito",
                    description: "Texto humanizado correctamente"
                  })
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              >
                ✨ Humanizar
              </Button>
            )}
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
                toast({
                  title: "Procesando",
                  description: "Creando voz para la noticia..."
                })
                // TODO: Implementar lógica de síntesis de voz
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
            >
              <Mic className="h-4 w-4 mr-1" />
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
