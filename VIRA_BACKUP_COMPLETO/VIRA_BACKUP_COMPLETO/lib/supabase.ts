
import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos de base de datos
export interface User {
  id: string
  name?: string
  email: string
  email_verified?: string
  image?: string
  role: string
  created_at: string
  updated_at: string
}

export interface NewsReport {
  id: string
  title: string
  content?: string
  timeline_data?: any
  audio_url?: string
  s3_key?: string
  duration_seconds?: number
  status: string
  generation_cost: number
  token_count: number
  metadata?: any
  radio_station_id?: string
  template_id?: string
  user_id: string
  created_at: string
  published_at?: string
  updated_at: string
}

export interface NewscastTemplate {
  id: string
  name: string
  description?: string
  region: string
  radio_station?: string
  duration_minutes: number
  voice_provider: string
  voice_id: string
  include_weather: boolean
  include_time: boolean
  ad_frequency: number
  categories: any[]
  configuration: any
  user_id: string
  created_at: string
  updated_at: string
}

export interface NewsSource {
  id: string
  name: string
  url: string
  rss_url?: string
  region?: string
  category: string
  is_active: boolean
  scraping_config: any
  last_scraped?: string
  success_rate: number
  user_id: string
  created_at: string
  updated_at: string
}

export interface ScrapedNews {
  id: string
  title: string
  content?: string
  summary?: string
  url?: string
  source_id: string
  category: string
  sentiment: string
  priority: string
  region?: string
  author?: string
  image_url?: string
  published_date?: string
  scraped_at: string
  is_processed: boolean
}

export interface AudioLibrary {
  id: string
  name: string
  type: string
  category?: string
  audio_url?: string
  s3_key?: string
  duration_seconds?: number
  volume_level: number
  fade_in: number
  fade_out: number
  reproductions: number
  is_active: boolean
  metadata: any
  user_id: string
  created_at: string
  updated_at: string
}

export interface AdCampaign {
  id: string
  name: string
  description?: string
  audio_url?: string
  s3_key?: string
  duration_seconds?: number
  is_active: boolean
  reproductions: number
  start_date?: string
  end_date?: string
  radio_station_id?: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface TokenUsage {
  id: string
  user_id: string
  service: string
  operation: string
  tokens_used: number
  cost: number
  currency: string
  metadata: any
  created_at: string
}

// Funciones de utilidad para la base de datos

// Usuarios
export async function getUser(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    return null
  }

  return data
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user:', error)
    return null
  }

  return data
}

// Plantillas de noticieros
export async function createNewscastTemplate(template: Omit<NewscastTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<NewscastTemplate | null> {
  const { data, error } = await supabase
    .from('newscast_templates')
    .insert(template)
    .select()
    .single()

  if (error) {
    console.error('Error creating template:', error)
    return null
  }

  return data
}

export async function getUserNewscastTemplates(userId: string): Promise<NewscastTemplate[]> {
  const { data, error } = await supabase
    .from('newscast_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching templates:', error)
    return []
  }

  return data || []
}

export async function deleteNewscastTemplate(templateId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('newscast_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting template:', error)
    return false
  }

  return true
}

// Reportes de noticias
export async function createNewsReport(report: Omit<NewsReport, 'id' | 'created_at' | 'updated_at'>): Promise<NewsReport | null> {
  const { data, error } = await supabase
    .from('news_reports')
    .insert(report)
    .select()
    .single()

  if (error) {
    console.error('Error creating news report:', error)
    return null
  }

  return data
}

export async function updateNewsReport(reportId: string, updates: Partial<NewsReport>): Promise<NewsReport | null> {
  const { data, error } = await supabase
    .from('news_reports')
    .update(updates)
    .eq('id', reportId)
    .select()
    .single()

  if (error) {
    console.error('Error updating news report:', error)
    return null
  }

  return data
}

export async function getUserNewsReports(userId: string, limit: number = 10): Promise<NewsReport[]> {
  const { data, error } = await supabase
    .from('news_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching news reports:', error)
    return []
  }

  return data || []
}

// Fuentes de noticias
export async function createNewsSource(source: Omit<NewsSource, 'id' | 'created_at' | 'updated_at'>): Promise<NewsSource | null> {
  const { data, error } = await supabase
    .from('news_sources')
    .insert(source)
    .select()
    .single()

  if (error) {
    console.error('Error creating news source:', error)
    return null
  }

  return data
}

export async function getNewsSourcesByRegion(region: string): Promise<NewsSource[]> {
  const { data, error } = await supabase
    .from('news_sources')
    .select('*')
    .or(`region.eq.${region},region.eq.nacional`)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching news sources:', error)
    return []
  }

  return data || []
}

export async function getUserNewsSources(userId: string): Promise<NewsSource[]> {
  const { data, error } = await supabase
    .from('news_sources')
    .select('*')
    .eq('user_id', userId)
    .order('name')

  if (error) {
    console.error('Error fetching user news sources:', error)
    return []
  }

  return data || []
}

// Noticias scrapeadas
export async function createScrapedNews(news: Omit<ScrapedNews, 'id' | 'scraped_at'>): Promise<ScrapedNews | null> {
  const { data, error } = await supabase
    .from('scraped_news')
    .insert(news)
    .select()
    .single()

  if (error) {
    console.error('Error creating scraped news:', error)
    return null
  }

  return data
}

export async function getRecentNewsByRegion(region: string, limit: number = 10): Promise<any[]> {
  const { data, error } = await supabase
    .from('recent_news')
    .select('*')
    .or(`region.eq.${region},region.eq.nacional`)
    .limit(limit)

  if (error) {
    console.error('Error fetching recent news:', error)
    return []
  }

  return data || []
}

// Biblioteca de audio
export async function createAudioLibraryItem(audio: Omit<AudioLibrary, 'id' | 'created_at' | 'updated_at'>): Promise<AudioLibrary | null> {
  const { data, error } = await supabase
    .from('audio_library')
    .insert(audio)
    .select()
    .single()

  if (error) {
    console.error('Error creating audio library item:', error)
    return null
  }

  return data
}

export async function getUserAudioLibrary(userId: string, type?: string): Promise<AudioLibrary[]> {
  let query = supabase
    .from('audio_library')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query.order('name')

  if (error) {
    console.error('Error fetching audio library:', error)
    return []
  }

  return data || []
}

// Uso de tokens
export async function logTokenUsage(usage: Omit<TokenUsage, 'id' | 'created_at'>): Promise<TokenUsage | null> {
  const { data, error } = await supabase
    .from('token_usage')
    .insert(usage)
    .select()
    .single()

  if (error) {
    console.error('Error logging token usage:', error)
    return null
  }

  return data
}

export async function getUserTokenUsage(userId: string, limit: number = 50): Promise<TokenUsage[]> {
  const { data, error } = await supabase
    .from('token_usage')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching token usage:', error)
    return []
  }

  return data || []
}

export async function getUserTotalCost(userId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_user_total_cost', { user_uuid: userId })

  if (error) {
    console.error('Error fetching user total cost:', error)
    return 0
  }

  return data || 0
}

// Funciones de búsqueda y filtrado
export async function searchScrapedNews(query: string, region?: string, category?: string): Promise<ScrapedNews[]> {
  let supabaseQuery = supabase
    .from('scraped_news')
    .select('*')
    .textSearch('title', query)

  if (region) {
    supabaseQuery = supabaseQuery.eq('region', region)
  }

  if (category) {
    supabaseQuery = supabaseQuery.eq('category', category)
  }

  const { data, error } = await supabaseQuery
    .order('published_date', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error searching news:', error)
    return []
  }

  return data || []
}

// Métricas y estadísticas
export async function getSystemMetrics(days: number = 30): Promise<any[]> {
  const { data, error } = await supabase
    .from('system_metrics')
    .select('*')
    .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching system metrics:', error)
    return []
  }

  return data || []
}

export async function getUserStats(userId: string): Promise<any> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user stats:', error)
    return null
  }

  return data
}

// Funciones de limpieza y mantenimiento
export async function cleanupOldFiles(daysOld: number = 30): Promise<void> {
  const { error } = await supabase
    .from('uploaded_files')
    .delete()
    .lt('created_at', new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('Error cleaning up old files:', error)
  }
}

export async function updateNewsSourceSuccessRate(sourceId: string, success: boolean): Promise<void> {
  // Lógica para actualizar la tasa de éxito del scraping
  const { data: currentSource } = await supabase
    .from('news_sources')
    .select('success_rate')
    .eq('id', sourceId)
    .single()

  if (currentSource) {
    // Calcular nueva tasa de éxito (implementar lógica de promedio móvil)
    const newRate = success ? Math.min(1.0, currentSource.success_rate + 0.1) : Math.max(0.0, currentSource.success_rate - 0.1)
    
    await supabase
      .from('news_sources')
      .update({ success_rate: newRate, last_scraped: new Date().toISOString() })
      .eq('id', sourceId)
  }
}
