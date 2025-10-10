
import { Navigation } from '@/components/navigation'
import { MetricsCards } from '@/components/dashboard/metrics-cards'
import { ResourceBreakdown } from '@/components/dashboard/resource-breakdown'
import { ProductionLeaders } from '@/components/dashboard/production-leaders'
import { AdvertisingReport } from '@/components/dashboard/advertising-report'
import { TimeFilters } from '@/components/dashboard/time-filters'
import { supabase } from '@/lib/supabase'

// Función para obtener métricas del dashboard
async function getDashboardData() {
  try {
    // Obtener métricas principales usando Supabase
    const { count: totalNewsReports } = await supabase
      .from('news_reports')
      .select('*', { count: 'exact', head: true })
    
    // Obtener uso de tokens
    const { data: tokenUsage } = await supabase
      .from('token_usage')
      .select('*')
    
    const totalPeriodCost = tokenUsage?.reduce((sum, usage) => sum + (usage.cost || 0), 0) || 0
    
    // Calcular tokens por tipo de operación
    const extractionUsage = tokenUsage?.filter(u => u.operation === 'text_processing') || []
    const curationUsage = tokenUsage?.filter(u => u.operation === 'newscast_generation') || []
    const audioUsage = tokenUsage?.filter(u => u.operation === 'tts') || []
    
    const extractionTokens = extractionUsage.reduce((sum, usage) => sum + (usage.tokens_used || 0), 0)
    const curationTokens = curationUsage.reduce((sum, usage) => sum + (usage.tokens_used || 0), 0)
    const audioTokens = audioUsage.reduce((sum, usage) => sum + (usage.tokens_used || 0), 0)
    
    const extractionCost = extractionUsage.reduce((sum, usage) => sum + (usage.cost || 0), 0)
    const curationCost = curationUsage.reduce((sum, usage) => sum + (usage.cost || 0), 0)
    const audioCost = audioUsage.reduce((sum, usage) => sum + (usage.cost || 0), 0)
    
    const totalTokens = extractionTokens + curationTokens + audioTokens
    
    // Estaciones de radio más activas
    const { data: radioStats } = await supabase
      .from('radio_stations')
      .select(`
        *,
        news_reports!inner(count)
      `)
      .order('created_at', { ascending: false })
    
    const mostActiveRadio = radioStats?.[0]?.name ?? 'N/A'
    
    // Líderes de producción (simulado por ahora)
    const leaders = [
      { rank: 1, radioName: 'Radio Nacional', newsCount: 234, tokens: 125000 },
      { rank: 2, radioName: 'Radio Norte', newsCount: 156, tokens: 89000 },
      { rank: 3, radioName: 'Radio Sur', newsCount: 134, tokens: 76000 },
      { rank: 4, radioName: 'Radio Centro', newsCount: 98, tokens: 54000 },
      { rank: 5, radioName: 'Radio Costa', newsCount: 67, tokens: 34000 },
    ]
    
    // Campañas publicitarias desde Supabase
    const { data: campaigns } = await supabase
      .from('ad_campaigns')
      .select('name, reproductions')
      .order('reproductions', { ascending: false })
      .limit(5)
    
    const advertisingCampaigns = campaigns?.map(campaign => ({
      name: campaign.name,
      reproductions: campaign.reproductions
    })) || [
      { name: 'Campaña Verano 2024', reproductions: 1250 },
      { name: 'Black Friday Especial', reproductions: 890 },
      { name: 'Año Nuevo 2024', reproductions: 2100 }
    ]
    
    return {
      metrics: {
        totalNewsReports: totalNewsReports || 0,
        totalPeriodCost: totalPeriodCost || 0,
        totalTokens: totalTokens > 1000000 ? `${(totalTokens / 1000000).toFixed(1)}M` : totalTokens.toLocaleString(),
        mostActiveRadio: mostActiveRadio || 'N/A',
        totalPeriodRevenue: 26
      },
      resources: {
        extractionTokens,
        extractionCost,
        curationTokens,
        curationCost,
        audioTokens,
        audioCost
      },
      leaders,
      campaigns: advertisingCampaigns
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    // Datos por defecto en caso de error
    return {
      metrics: {
        totalNewsReports: 0,
        totalPeriodCost: 0,
        totalTokens: '0',
        mostActiveRadio: 'N/A',
        totalPeriodRevenue: 0
      },
      resources: {
        extractionTokens: 0,
        extractionCost: 0,
        curationTokens: 0,
        curationCost: 0,
        audioTokens: 0,
        audioCost: 0
      },
      leaders: [],
      campaigns: []
    }
  }
}

export default async function DashboardPage() {
  const { metrics, resources, leaders, campaigns } = await getDashboardData()
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Dashboard de Analíticas
          </h1>
          <TimeFilters />
        </div>
        
        {/* Métricas principales */}
        <div className="mb-8">
          <MetricsCards metrics={metrics} />
        </div>
        
        {/* Desglose de recursos */}
        <div className="mb-8">
          <ResourceBreakdown resources={resources} />
        </div>
        
        {/* Tablas de líderes y publicidad */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ProductionLeaders leaders={leaders} />
          <AdvertisingReport campaigns={campaigns} />
        </div>
      </main>
    </div>
  )
}
