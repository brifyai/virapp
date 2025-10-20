
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { 
  Search,
  Brain,
  Volume2
} from 'lucide-react'

interface ResourceBreakdownProps {
  resources: {
    extractionTokens: number
    extractionCost: number
    curationTokens: number
    curationCost: number
    audioTokens: number
    audioCost: number
  }
}

export function ResourceBreakdown({ resources }: ResourceBreakdownProps) {
  const resourceCards = [
    {
      title: 'Tokens de Extracción',
      tokens: resources?.extractionTokens ?? 0,
      cost: resources?.extractionCost ?? 0,
      icon: Search,
      color: 'bg-orange-50 border-orange-200',
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100'
    },
    {
      title: 'Tokens de Curación (IA)',
      tokens: resources?.curationTokens ?? 0,
      cost: resources?.curationCost ?? 0,
      icon: Brain,
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100'
    },
    {
      title: 'Tokens de Audio (TTS)',
      tokens: resources?.audioTokens ?? 0,
      cost: resources?.audioCost ?? 0,
      icon: Volume2,
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100'
    }
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Desglose de Uso de Recursos
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {resourceCards.map((resource, index) => (
          <motion.div
            key={resource.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className={`${resource.color} shadow-sm hover:shadow-md transition-shadow`}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${resource.iconBg}`}>
                    <resource.icon className={`h-5 w-5 ${resource.iconColor}`} />
                  </div>
                  <CardTitle className="text-sm font-medium text-gray-700">
                    {resource.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {resource.tokens.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    Costo: ${resource.cost.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
