
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Calendar, Clock, Trash2, Edit, Radio, Settings, Download, CheckCircle, Plus, X } from 'lucide-react'
import Swal from 'sweetalert2'

// Interfaz para las plantillas de Supabase
interface Plantilla {
  id: string
  nombre_plantilla: string
  region: string
  radio: string
  duracion: number
  categorias: string[]
  voz: string
  created_at?: string
  updated_at?: string
}

// Plantillas disponibles (como respaldo)
const availableTemplates = [
  { id: 1, name: 'Noticiero Matinal Express', radio: 'Radio Festival', region: 'Valparaíso' },
  { id: 2, name: 'Resumen Tarde', radio: 'Radio USACH', region: 'Metropolitana de Santiago' }
]

// Opciones de frecuencia
const frequencyOptions = [
  { value: 'monday-to-saturday', label: 'Lunes a Sábado' },
  { value: 'weekdays', label: 'Lunes a Viernes' },
  { value: 'daily', label: 'Diario (Lunes a Domingo)' },
  { value: 'custom', label: 'Días y horas específicas' }
]

// Días de la semana para configuración personalizada
const daysOfWeek = [
  { value: 'lun', label: 'Lun', full: 'Lunes' },
  { value: 'mar', label: 'Mar', full: 'Martes' },
  { value: 'mie', label: 'Mié', full: 'Miércoles' },
  { value: 'jue', label: 'Jue', full: 'Jueves' },
  { value: 'vie', label: 'Vie', full: 'Viernes' },
  { value: 'sab', label: 'Sáb', full: 'Sábado' },
  { value: 'dom', label: 'Dom', full: 'Domingo' }
]

// Software de Automatización Radial compatibles
const radioSoftware = [
  {
    id: 'dinesat',
    name: 'Dinesat',
    description: 'Software de automatización profesional para radio con soporte completo de VIRA',
    logo: '📻',
    status: 'compatible',
    features: ['Exportación directa MP3', 'API de integración', 'Programación automática', 'Metadata completa'],
    popularity: 'high',
    region: 'América Latina',
    website: 'https://www.dinesat.com'
  },
  {
    id: 'zara-radio',
    name: 'Zara Radio',
    description: 'Software gratuito de automatización radial muy popular en España y Latinoamérica',
    logo: '📡',
    status: 'compatible',
    features: ['Importación MP3', 'Listas de reproducción', 'Programación por horas'],
    popularity: 'high',
    region: 'España / Latinoamérica',
    website: 'https://www.zarastudio.es'
  },
  {
    id: 'radiodj',
    name: 'RadioDJ',
    description: 'Software gratuito de automatización con base de datos MySQL',
    logo: '🎵',
    status: 'compatible',
    features: ['Base de datos MySQL', 'Rotaciones automáticas', 'Jingles y comerciales'],
    popularity: 'medium',
    region: 'Internacional',
    website: 'https://www.radiodj.ro'
  },
  {
    id: 'winamp-dsp',
    name: 'Winamp + DSP',
    description: 'Solución clásica con plugins de automatización',
    logo: '🔊',
    status: 'parcial',
    features: ['Plugins de automatización', 'Formato MP3/WAV', 'Ecualizador'],
    popularity: 'low',
    region: 'Internacional',
    website: 'https://www.winamp.com'
  },
  {
    id: 'sam-broadcaster',
    name: 'SAM Broadcaster',
    description: 'Software comercial de automatización con streaming integrado',
    logo: '📻',
    status: 'compatible',
    features: ['Streaming integrado', 'Base de datos avanzada', 'Crossfade automático'],
    popularity: 'medium',
    region: 'Internacional',
    website: 'https://www.spacial.com'
  },
  {
    id: 'virtual-dj',
    name: 'VirtualDJ Pro',
    description: 'Software de DJ con funciones de automatización',
    logo: '🎧',
    status: 'parcial',
    features: ['Mezcla automática', 'Efectos en tiempo real', 'Streaming'],
    popularity: 'medium',
    region: 'Internacional',
    website: 'https://www.virtualdj.com'
  }
]

// Tipos para los noticieros programados
interface ScheduledNews {
  id: number
  templateName: string
  frequency: string
  time: string
  email: string
  status: 'active' | 'paused'
  nextExecution: string
}

// Tipos para filas de la tabla 'programados' de Supabase
interface Programado {
  id: number
  plantilla: any
  frecuencia: string | null
  hora_generacion: string | null
  email: string | null
}

export default function AutomatizacionPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedFrequency, setSelectedFrequency] = useState('monday-to-saturday')
  const [generationTime, setGenerationTime] = useState('09:00')
  const [emailDestination, setEmailDestination] = useState('')
  const [scheduledNews, setScheduledNews] = useState<ScheduledNews[]>([])
  const [isScheduling, setIsScheduling] = useState(false)
  
  // Estados para plantillas de Supabase
  const [plantillasSupabase, setPlantillasSupabase] = useState<Plantilla[]>([])
  const [loadingPlantillas, setLoadingPlantillas] = useState(true)
  
  // Estados para configuración personalizada
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [customTimes, setCustomTimes] = useState<string[]>(['08:00'])
  const [newTimeInput, setNewTimeInput] = useState('09:00')

  // Estados para 'programados' de Supabase
  const [programados, setProgramados] = useState<Programado[]>([])
  const [loadingProgramados, setLoadingProgramados] = useState(true)

  // Función para cargar plantillas desde Supabase
  const cargarPlantillas = async () => {
    setLoadingPlantillas(true)
    try {
      const { data: plantillas, error } = await supabase
        .from('plantillas')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error al cargar plantillas:', error.message)
        setPlantillasSupabase([])
      } else {
        console.log('Plantillas cargadas:', plantillas)
        setPlantillasSupabase(plantillas || [])
      }
    } catch (error) {
      console.error('Error al conectar con Supabase:', error)
      setPlantillasSupabase([])
    } finally {
      setLoadingPlantillas(false)
    }
  }

  // Función para cargar programados desde Supabase
  const cargarProgramados = async () => {
    setLoadingProgramados(true)
    try {
      const { data, error } = await supabase
        .from('programados')
        .select('*')
        .order('id', { ascending: false })
      if (error) {
        console.error('Error al cargar programados:', error.message)
        setProgramados([])
      } else {
        setProgramados(data || [])
      }
    } catch (error) {
      console.error('Error al conectar con Supabase:', error)
      setProgramados([])
    } finally {
      setLoadingProgramados(false)
    }
  }

  // Cargar plantillas y programados al montar el componente
  useEffect(() => {
    cargarPlantillas()
    cargarProgramados()
  }, [])

  // Función para obtener el color del estado de compatibilidad
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compatible':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'parcial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'no-compatible':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Función para obtener el color de popularidad
  const getPopularityColor = (popularity: string) => {
    switch (popularity) {
      case 'high':
        return 'bg-blue-100 text-blue-800'
      case 'medium':
        return 'bg-purple-100 text-purple-800'
      case 'low':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Funciones para configuración personalizada
  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const addCustomTime = () => {
    if (newTimeInput && !customTimes.includes(newTimeInput)) {
      setCustomTimes(prev => [...prev, newTimeInput])
    }
  }

  const removeCustomTime = (timeToRemove: string) => {
    setCustomTimes(prev => prev.filter(time => time !== timeToRemove))
  }

  const formatTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour24 = parseInt(hours)
    const ampm = hour24 >= 12 ? 'p.m.' : 'a.m.'
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    return `${hour12}:${minutes} ${ampm}`
  }

  const handleScheduleNews = async () => {
    if (!selectedTemplate || !emailDestination.trim()) {
      await Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Por favor complete todos los campos requeridos' })
      return
    }

    if (!emailDestination.includes('@') || !emailDestination.includes('.')) {
      await Swal.fire({ icon: 'warning', title: 'Email inválido', text: 'Por favor ingrese un email válido' })
      return
    }

    // Validación para configuración personalizada
    if (selectedFrequency === 'custom') {
      if (selectedDays.length === 0) {
        await Swal.fire({ icon: 'warning', title: 'Selecciona días', text: 'Por favor selecciona al menos un día de la semana' })
        return
      }
      if (customTimes.length === 0) {
        await Swal.fire({ icon: 'warning', title: 'Agrega horarios', text: 'Por favor agrega al menos un horario' })
        return
      }
    }

    setIsScheduling(true)
    
    try {
      // Buscar la plantilla en Supabase primero, luego en las hardcodeadas como respaldo
      let template = plantillasSupabase.find(t => t.id === selectedTemplate)
      let templateName = ''
      
      if (template) {
        templateName = template.nombre_plantilla
      } else {
        // Respaldo con plantillas hardcodeadas
        const fallbackTemplate = availableTemplates.find(t => t.id.toString() === selectedTemplate)
        templateName = fallbackTemplate?.name || 'Plantilla no encontrada'
      }

      // Crear descripción de frecuencia personalizada
      let frequencyDisplay = frequencyOptions.find(f => f.value === selectedFrequency)?.label || 'Personalizado'
      if (selectedFrequency === 'custom') {
        const dayNames = selectedDays.map(day => 
          daysOfWeek.find(d => d.value === day)?.full || day
        ).join(', ')
        const timesList = customTimes.map(time => formatTimeDisplay(time)).join(', ')
        frequencyDisplay = `${dayNames} a las ${timesList}`
      }

      // Construir objeto plantilla para guardar en jsonb
      const plantillaJSON = template ? template : { nombre_plantilla: templateName }

      // Insertar en Supabase tabla 'programados'
      const { error } = await supabase
        .from('programados')
        .insert({
          plantilla: plantillaJSON,
          frecuencia: frequencyDisplay,
          hora_generacion: selectedFrequency === 'custom' ? customTimes.join(', ') : generationTime,
          email: emailDestination,
        })

      if (error) {
        console.error('Error al insertar programación:', error.message)
        await Swal.fire({ icon: 'error', title: 'Error', text: 'Error al programar el noticiero' })
        return
      }

      // Refrescar lista desde Supabase
      await cargarProgramados()
      
      // Limpiar formulario
      setSelectedTemplate('')
      setSelectedFrequency('monday-to-saturday')
      setGenerationTime('09:00')
      setEmailDestination('')
      setSelectedDays([])
      setCustomTimes(['08:00'])
      setNewTimeInput('09:00')
      
      await Swal.fire({ icon: 'success', title: 'Programación creada', text: 'Noticiero automático programado exitosamente!' })
    } catch (error) {
      console.error('Error programando noticiero:', error)
      await Swal.fire({ icon: 'error', title: 'Error', text: 'Error al programar el noticiero' })
    } finally {
      setIsScheduling(false)
    }
  }

  const getNextExecutionTime = (frequency: string, time: string): string => {
    const now = new Date()
    const [hours, minutes] = time.split(':').map(Number)
    
    const nextRun = new Date()
    nextRun.setHours(hours, minutes, 0, 0)
    
    // Si ya pasó la hora de hoy, programar para mañana
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1)
    }
    
    // Ajustar según el tipo de frecuencia
    switch (frequency) {
      case 'weekdays': // Lunes a Viernes
        const day = nextRun.getDay()
        if (day === 0) nextRun.setDate(nextRun.getDate() + 1) // Domingo -> Lunes
        if (day === 6) nextRun.setDate(nextRun.getDate() + 2) // Sábado -> Lunes
        break
        
      case 'monday-to-saturday': // Lunes a Sábado
        const dayMtoS = nextRun.getDay()
        if (dayMtoS === 0) nextRun.setDate(nextRun.getDate() + 1) // Domingo -> Lunes
        break
        
      case 'custom': // Días personalizados
        // Para configuración personalizada, encontrar el próximo día válido
        let daysToAdd = 1
        let foundValidDay = false
        const dayMap = { lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6, dom: 0 }
        const validDays = selectedDays.map(day => dayMap[day as keyof typeof dayMap])
        
        while (!foundValidDay && daysToAdd <= 7) {
          const testDay = new Date(nextRun)
          testDay.setDate(testDay.getDate() + daysToAdd - 1)
          if (validDays.includes(testDay.getDay())) {
            nextRun.setDate(nextRun.getDate() + daysToAdd - 1)
            foundValidDay = true
          } else {
            daysToAdd++
          }
        }
        break
        
      case 'daily':
      default:
        // No ajustes necesarios para diario
        break
    }
    
    return nextRun.toLocaleDateString('es-CL', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeleteScheduled = (id: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta programación?')) {
      setScheduledNews(prev => prev.filter(news => news.id !== id))
    }
  }

  const handleEditScheduled = (id: number) => {
    alert(`Editando programación ID: ${id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Automatización de Noticieros
          </h1>
          <p className="text-gray-600 mt-2">
            Programa noticieros automáticos e integra con tu software de automatización radial
          </p>
        </div>

        {/* Software de Automatización Radial */}
        <Card className="bg-white mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
              <Radio className="h-5 w-5 mr-2 text-blue-600" />
              Software de Automatización Radial Compatibles
            </CardTitle>
            <p className="text-gray-600 text-sm">
              VIRA es compatible con los principales software de automatización radial del mercado
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {radioSoftware.map((software) => (
                <div
                  key={software.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{software.logo}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{software.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(software.status)}`}>
                            {software.status === 'compatible' ? '✅ Compatible' : 
                             software.status === 'parcial' ? '⚠️ Parcial' : '❌ No compatible'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={`text-xs px-2 py-1 rounded ${getPopularityColor(software.popularity)}`}>
                        {software.popularity === 'high' ? '🔥 Popular' : 
                         software.popularity === 'medium' ? '⭐ Medio' : '📊 Básico'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                    {software.description}
                  </p>

                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Características:</p>
                    <div className="flex flex-wrap gap-1">
                      {software.features.slice(0, 2).map((feature, index) => (
                        <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                      {software.features.length > 2 && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          +{software.features.length - 2} más
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{software.region}</span>
                    <div className="flex items-center space-x-2">
                      {software.status === 'compatible' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2"
                          onClick={() => window.open(software.website, '_blank')}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Descargar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-2"
                        onClick={() => window.open(software.website, '_blank')}
                      >
                        Ver sitio
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Información especial sobre Dinesat */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">
                    Recomendación VIRA: Dinesat
                  </h4>
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Dinesat</strong> es nuestra recomendación principal para radios profesionales en América Latina. 
                    Ofrece la mejor integración con VIRA, exportación directa de archivos MP3, y soporte técnico especializado.
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-blue-700">
                    <span>✅ Integración completa VIRA</span>
                    <span>✅ Soporte técnico en español</span>
                    <span>✅ Usado por +500 radios</span>
                    <span>✅ Exportación automática MP3</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Guía rápida de integración */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">🚀 Guía Rápida de Integración</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>1.</strong> Genera tu noticiero en VIRA y descarga el archivo MP3</p>
                <p><strong>2.</strong> Importa el archivo a tu software de automatización (Dinesat, Zara Radio, etc.)</p>
                <p><strong>3.</strong> Programa la reproducción según tus horarios de emisión</p>
                <p><strong>4.</strong> Configura la automatización para repetir el proceso diariamente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulario de Programación */}
        <Card className="bg-white mb-8">
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Programar Nuevo Noticiero Automático
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna Izquierda */}
              <div className="space-y-6">
                {/* Plantilla */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Plantilla
                  </Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingPlantillas ? "Cargando plantillas..." : "Selecciona un perfil..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingPlantillas ? (
                        <SelectItem value="loading" disabled>
                          Cargando plantillas...
                        </SelectItem>
                      ) : plantillasSupabase.length > 0 ? (
                        plantillasSupabase.map(plantilla => (
                          <SelectItem key={plantilla.id} value={plantilla.id}>
                            {plantilla.nombre_plantilla} ({plantilla.radio} - {plantilla.region})
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="no-plantillas" disabled>
                            No hay plantillas disponibles
                          </SelectItem>
                          {/* Plantillas de respaldo */}
                          {availableTemplates.map(template => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.name} (Respaldo)
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Hora de Generación */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Hora de Generación
                  </Label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={generationTime}
                      onChange={(e) => setGenerationTime(e.target.value)}
                      className="pr-10"
                    />
                    <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Columna Derecha */}
              <div className="space-y-6">
                {/* Frecuencia */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Frecuencia
                  </Label>
                  <Select value={selectedFrequency} onValueChange={setSelectedFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Configuración de días y horas específicas */}
                {selectedFrequency === 'custom' && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                    {/* Días de la semana */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Días de la semana
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map(day => (
                          <Button
                            key={day.value}
                            variant={selectedDays.includes(day.value) ? "default" : "outline"}
                            size="sm"
                            className={`px-3 py-2 text-sm ${
                              selectedDays.includes(day.value) 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            onClick={() => toggleDay(day.value)}
                          >
                            {day.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Horas de Generación */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Horas de Generación
                      </Label>
                      
                      {/* Horarios agregados */}
                      <div className="space-y-2 mb-4">
                        {customTimes.map((time, index) => (
                          <div key={index} className="flex items-center justify-between bg-blue-100 px-3 py-2 rounded-lg">
                            <span className="font-medium text-blue-900">
                              {formatTimeDisplay(time)}
                            </span>
                            {customTimes.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-blue-700 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removeCustomTime(time)}
                              >
                                ✕
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Agregar nuevo horario */}
                      <div className="flex items-center space-x-2">
                        <Input
                          type="time"
                          value={newTimeInput}
                          onChange={(e) => setNewTimeInput(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-4 py-2 text-sm border-gray-300 hover:bg-gray-50"
                          onClick={addCustomTime}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enviar a Email */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Enviar a Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="destinatario@email.com"
                    value={emailDestination}
                    onChange={(e) => setEmailDestination(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Botón Programar */}
            <div className="flex justify-end mt-8">
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                onClick={handleScheduleNews}
                disabled={isScheduling}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {isScheduling ? 'Programando...' : 'Programar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Noticieros Programados */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Noticieros Programados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loadingProgramados ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Cargando noticieros programados...</p>
              </div>
            ) : programados.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  No hay noticieros programados.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {programados.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {(item.plantilla && (item.plantilla?.nombre_plantilla || item.plantilla?.name || item.plantilla?.templateName)) || 'Plantilla'}
                      </h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">Frecuencia:</span> {item.frecuencia || '—'}
                        </p>
                        <p>
                          <span className="font-medium">Hora de generación:</span> {item.hora_generacion || '—'}
                        </p>
                        <p>
                          <span className="font-medium">Email:</span> {item.email || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="h-8">Ver detalles</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Detalle de programación</DialogTitle>
                            <DialogDescription>
                              Revisa la configuración completa de esta programación
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 text-sm">

                            <div>
                              <span className="font-medium">Plantilla:</span> {(item.plantilla?.nombre_plantilla || item.plantilla?.name || item.plantilla?.templateName || 'Plantilla')}
                            </div>
                            <div><span className="font-medium">Frecuencia:</span> {item.frecuencia || '—'}</div>
                            <div><span className="font-medium">Hora de generación:</span> {item.hora_generacion || '—'}</div>
                            <div><span className="font-medium">Email:</span> {item.email || '—'}</div>
                            <div>
                              <span className="font-medium">Plantilla (JSON):</span>
                              <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-100 p-3 text-xs">
                                {JSON.stringify(
                                  typeof item.plantilla === 'object' && item.plantilla !== null
                                    ? Object.fromEntries(
                                        Object.entries(item.plantilla).filter(([key]) => key !== 'id')
                                      )
                                    : item.plantilla,
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
