
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Plus, Edit, Trash2, Star, X, Eye, Play } from 'lucide-react'
import Swal from 'sweetalert2'

// Interfaz para las fuentes seleccionadas
interface FuenteSeleccionada {
  nombre_fuente: string
  cantidad: number
}

// Interfaz para las plantillas de Supabase
// Esta interfaz coincide exactamente con la columna cantidad_fuentes en Supabase
// cantidad_fuentes se almacena como JSONB array en PostgreSQL/Supabase
interface Plantilla {
  id: string
  nombre_plantilla: string
  region: string
  radio: string
  duracion: number
  categorias: string[]
  voz: string
  cantidad_fuentes: FuenteSeleccionada[] // Array JSON compatible con Supabase JSONB
  // Nuevo campo opcional para reflejar la columna de usuario en Supabase
  usuario?: string
  created_at?: string
  updated_at?: string
}

// Plantillas existentes (como respaldo)
const existingTemplates = [
  {
    id: 1,
    name: 'Noticiero Matinal Express',
    radio: 'Radio Festival',
    region: 'Valparaíso'
  },
  {
    id: 2,
    name: 'Resumen Tarde',
    radio: 'Radio USACH',
    region: 'Metropolitana de Santiago'
  }
]

// Regiones de Chile
const chileanRegions = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana de Santiago',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes y Antártica Chilena'
]

// Radios por región
const radiosByRegion = {
  'Arica y Parinacota': ['Radio Caprissima', 'Radio Norte', 'Radio Arica'],
  'Valparaíso': ['Radio Valparaíso', 'Radio Portillo', 'Radio Aconcagua'],
  'Metropolitana de Santiago': ['Radio Santiago', 'Radio Cooperativa', 'Radio ADN', 'Radio Biobío'],
}

const voiceOptions = [
  'Alloy (Voz Masculina)',
  'Echo (Voz Femenina)',
  'Nova (Voz Neutral)',
  'Onyx (Voz Profunda)',
  'Shimmer (Voz Suave)'
]

const categories = [
  { id: 'regionales', label: 'Regionales', checked: true },
  { id: 'nacionales', label: 'Nacionales', checked: true },
  { id: 'deportes', label: 'Deportes', checked: false },
  { id: 'economia', label: 'Economía', checked: false },
  { id: 'mundo', label: 'Mundo', checked: false },
  { id: 'tendencias', label: 'Tendencias', checked: false },
  { id: 'farandula', label: 'Farandula', checked: false }
]

export default function PlantillasPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState(existingTemplates)
  const [plantillasSupabase, setPlantillasSupabase] = useState<Plantilla[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingPlantilla, setEditingPlantilla] = useState<Plantilla | null>(null)
  
  // Estado del formulario de nueva plantilla
  const [templateName, setTemplateName] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('Arica y Parinacota')
  const [selectedRadio, setSelectedRadio] = useState('Radio Caprissima')
  const [duration, setDuration] = useState([15])
  const [adPhrases, setAdPhrases] = useState(3)
  const [adFrequency, setAdFrequency] = useState(3)
  const [selectedCategories, setSelectedCategories] = useState(categories)
  const [selectedVoice, setSelectedVoice] = useState('Alloy (Voz Masculina)')

  // Estados para fuentes sugeridas
  const [fuentes, setFuentes] = useState<Array<{id: string, nombre: string, nombre_fuente: string, url: string}>>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [sourceNewsCount, setSourceNewsCount] = useState<{[key: string]: number}>({})
  const [loadingFuentes, setLoadingFuentes] = useState(false)

  // Función para limpiar el formulario completamente
  const limpiarFormulario = () => {
    setTemplateName('')
    setSelectedRegion('Arica y Parinacota')
    setSelectedRadio('Radio Caprissima')
    setDuration([15])
    setAdPhrases(3)
    setAdFrequency(3)
    setSelectedCategories(categories.map(cat => ({
      ...cat,
      checked: cat.id === 'regionales' || cat.id === 'nacionales' // Solo estas dos por defecto
    })))
    setSelectedVoice('Alloy (Voz Masculina)')
    setSelectedSources([])
    setSourceNewsCount({})
    setEditingPlantilla(null)
    console.log('Formulario limpiado para nueva plantilla')
  }

  // Función para cargar plantillas desde Supabase
  const cargarPlantillas = async () => {
    setLoading(true)
    try {
      // Leer email almacenado en LocalStorage para filtrar por usuario e incluir 'todos'
      let storedEmail: string | null = null
      try {
        storedEmail = typeof window !== 'undefined' ? localStorage.getItem('vira_user_email') : null
      } catch (e) {
        console.warn('[Plantillas] No se pudo leer vira_user_email de LocalStorage:', e)
      }

      let plantillasQuery = supabase
        .from('plantillas')
        .select('*')

      if (storedEmail && storedEmail.trim() !== '') {
        // Incluir plantillas del usuario y las globales (usuario = 'todos')
        plantillasQuery = plantillasQuery.or(`usuario.eq.${storedEmail},usuario.eq.todos`)
      }

      const { data: plantillas, error } = await plantillasQuery
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error al cargar plantillas:', error.message)
        setPlantillasSupabase([])
      } else {
        console.log('Plantillas cargadas desde Supabase:', plantillas)
        
        // Procesar datos para asegurar compatibilidad con cantidad_fuentes
        const plantillasProcesadas = (plantillas || []).map(plantilla => ({
          ...plantilla,
          // Asegurar que cantidad_fuentes sea siempre un array
          cantidad_fuentes: Array.isArray(plantilla.cantidad_fuentes) 
            ? plantilla.cantidad_fuentes 
            : (plantilla.cantidad_fuentes ? [plantilla.cantidad_fuentes] : [])
        }))
        
        console.log('Plantillas procesadas:', plantillasProcesadas)
        setPlantillasSupabase(plantillasProcesadas)
      }
    } catch (error) {
      console.error('Error al conectar con Supabase:', error)
      setPlantillasSupabase([])
    } finally {
      setLoading(false)
    }
  }

  // Cargar plantillas al montar el componente
  useEffect(() => {
    cargarPlantillas()
    cargarFuentes()
  }, [])

  // Función para cargar fuentes desde Supabase
  const cargarFuentes = async () => {
    setLoadingFuentes(true)
    try {
      const { data: fuentesData, error } = await supabase
        .from('fuentes_final')
        .select('*')
        .order('nombre', { ascending: true })
      
      if (error) {
        console.error('Error al cargar fuentes:', error.message)
        setFuentes([])
      } else {
        console.log('Fuentes cargadas:', fuentesData)
        setFuentes(fuentesData || [])
      }
    } catch (error) {
      console.error('Error al conectar con Supabase:', error)
      setFuentes([])
    } finally {
      setLoadingFuentes(false)
    }
  }

  // Función para cargar los datos de una plantilla en el formulario de edición
  const cargarDatosParaEditar = (plantilla: Plantilla) => {
    setTemplateName(plantilla.nombre_plantilla)
    setSelectedRegion(plantilla.region)
    setSelectedRadio(plantilla.radio)
    setDuration([plantilla.duracion])
    setSelectedVoice(plantilla.voz)
    
    // Actualizar categorías basándose en las categorías guardadas
    const categoriasActualizadas = categories.map(cat => ({
      ...cat,
      checked: plantilla.categorias.includes(cat.label)
    }))
    setSelectedCategories(categoriasActualizadas)
    
    // Cargar fuentes desde cantidad_fuentes (array de Supabase)
    if (plantilla.cantidad_fuentes && Array.isArray(plantilla.cantidad_fuentes) && plantilla.cantidad_fuentes.length > 0) {
      console.log('Cargando fuentes desde Supabase:', plantilla.cantidad_fuentes)
      
      // Validar que cada elemento tenga la estructura correcta
      const fuentesValidas = plantilla.cantidad_fuentes.filter(item => 
        item && 
        typeof item === 'object' && 
        'nombre_fuente' in item && 
        'cantidad' in item &&
        typeof item.nombre_fuente === 'string' &&
        typeof item.cantidad === 'number'
      )
      
      if (fuentesValidas.length > 0) {
        // Extraer nombres de fuentes
        const fuentesSeleccionadas = fuentesValidas.map(item => item.nombre_fuente)
        setSelectedSources(fuentesSeleccionadas)
        
        // Extraer cantidades en formato objeto
        const cantidadesObj = fuentesValidas.reduce((acc, item) => {
          acc[item.nombre_fuente] = item.cantidad
          return acc
        }, {} as {[key: string]: number})
        setSourceNewsCount(cantidadesObj)
        
        console.log('Fuentes cargadas:', fuentesSeleccionadas)
        console.log('Cantidades cargadas:', cantidadesObj)
      } else {
        console.log('No se encontraron fuentes válidas en cantidad_fuentes')
        setSelectedSources([])
        setSourceNewsCount({})
      }
    } else {
      console.log('cantidad_fuentes vacío o no es array:', plantilla.cantidad_fuentes)
      setSelectedSources([])
      setSourceNewsCount({})
    }
    
    setEditingPlantilla(plantilla)
  }

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    setSelectedCategories(categories =>
      categories.map(cat =>
        cat.id === categoryId ? { ...cat, checked } : cat
      )
    )
  }

  // Funciones para manejar fuentes sugeridas
  const handleSourceSelect = (sourceName: string) => {
    setSelectedSources(prev => {
      const isCurrentlySelected = prev.includes(sourceName)
      if (isCurrentlySelected) {
        // Remover fuente y su cantidad
        const newSourceNewsCount = { ...sourceNewsCount }
        delete newSourceNewsCount[sourceName]
        setSourceNewsCount(newSourceNewsCount)
        
        const newSources = prev.filter(source => source !== sourceName)
        console.log('Fuente removida. Array actual:', newSources
          .filter(fuente => newSourceNewsCount[fuente])
          .map(fuente => ({
            nombre_fuente: fuente,
            cantidad: newSourceNewsCount[fuente]
          }))
        )
        return newSources
      } else {
        // Agregar fuente con cantidad por defecto
        setSourceNewsCount(prev => ({ ...prev, [sourceName]: 3 }))
        const newSources = [...prev, sourceName]
        const updatedCounts = { ...sourceNewsCount, [sourceName]: 3 }
        console.log('Fuente agregada. Array actual:', newSources
          .filter(fuente => updatedCounts[fuente])
          .map(fuente => ({
            nombre_fuente: fuente,
            cantidad: updatedCounts[fuente]
          }))
        )
        return newSources
      }
    })
  }

  const handleNewsCountChange = (sourceName: string, count: number) => {
    const newCount = Math.max(1, Math.min(10, count))
    setSourceNewsCount(prev => {
      const newSourceNewsCount = { ...prev, [sourceName]: newCount }
      console.log('Cantidad actualizada. Array actual:', selectedSources
        .filter(fuente => newSourceNewsCount[fuente])
        .map(fuente => ({
          nombre_fuente: fuente,
          cantidad: newSourceNewsCount[fuente]
        }))
      )
      return newSourceNewsCount
    })
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      await Swal.fire({ icon: 'warning', title: 'Nombre requerido', text: 'Por favor ingrese un nombre para la plantilla' })
      return
    }

    const categoriasSeleccionadas = selectedCategories
      .filter(cat => cat.checked)
      .map(cat => cat.label)

    // Crear arreglo con fuentes seleccionadas y sus cantidades (formato Supabase)
    const fuentesConCantidades: FuenteSeleccionada[] = selectedSources
      .filter(fuente => sourceNewsCount[fuente] && sourceNewsCount[fuente] > 0) // Solo fuentes con cantidades válidas
      .map(fuente => ({
        nombre_fuente: fuente,
        cantidad: Number(sourceNewsCount[fuente]) // Asegurar que sea número
      }))
      .filter(item => item.nombre_fuente && item.nombre_fuente.trim() !== '') // Filtrar nombres vacíos

    console.log('Array cantidad_fuentes para Supabase:', fuentesConCantidades)
    console.log('Estructura JSON:', JSON.stringify(fuentesConCantidades, null, 2))

    const nuevaPlantilla = {
      nombre_plantilla: templateName,
      region: selectedRegion,
      radio: selectedRadio,
      duracion: duration[0],
      categorias: categoriasSeleccionadas,
      voz: selectedVoice,
      cantidad_fuentes: fuentesConCantidades // Array tipado de FuenteSeleccionada[]
    }

    try {
      const { data, error } = await supabase
        .from('plantillas')
        .insert([nuevaPlantilla])
        .select()

      if (error) {
        console.error('Error al guardar plantilla:', error.message)
        await Swal.fire({ icon: 'error', title: 'Error al guardar la plantilla', text: 'Por favor intente nuevamente.' })
        return
      }

      console.log('Plantilla guardada:', data)
      
      // Recargar plantillas
      await cargarPlantillas()
      
      // Limpiar formulario usando la función centralizada
      limpiarFormulario()
      
      setIsModalOpen(false)
      await Swal.fire({ icon: 'success', title: 'Plantilla guardada', text: 'Plantilla guardada exitosamente!' })
    } catch (error) {
      console.error('Error al conectar con Supabase:', error)
      await Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Por favor intente nuevamente.' })
    }
  }

  const handleUpdateTemplate = async () => {
    if (!templateName.trim() || !editingPlantilla) {
      await Swal.fire({ icon: 'warning', title: 'Nombre requerido', text: 'Por favor ingrese un nombre para la plantilla' })
      return
    }

    const categoriasSeleccionadas = selectedCategories
      .filter(cat => cat.checked)
      .map(cat => cat.label)

    // Crear arreglo con fuentes seleccionadas y sus cantidades (formato Supabase)
    const fuentesConCantidades: FuenteSeleccionada[] = selectedSources
      .filter(fuente => sourceNewsCount[fuente] && sourceNewsCount[fuente] > 0) // Solo fuentes con cantidades válidas
      .map(fuente => ({
        nombre_fuente: fuente,
        cantidad: Number(sourceNewsCount[fuente]) // Asegurar que sea número
      }))
      .filter(item => item.nombre_fuente && item.nombre_fuente.trim() !== '') // Filtrar nombres vacíos

    console.log('Array cantidad_fuentes para actualizar en Supabase:', fuentesConCantidades)
    console.log('Estructura JSON:', JSON.stringify(fuentesConCantidades, null, 2))

    const plantillaActualizada = {
      nombre_plantilla: templateName,
      region: selectedRegion,
      radio: selectedRadio,
      duracion: duration[0],
      categorias: categoriasSeleccionadas,
      voz: selectedVoice,
      cantidad_fuentes: fuentesConCantidades // Array tipado de FuenteSeleccionada[]
    }

    try {
      const { data, error } = await supabase
        .from('plantillas')
        .update(plantillaActualizada)
        .eq('id', editingPlantilla.id)
        .select()

      if (error) {
        console.error('Error al actualizar plantilla:', error.message)
        await Swal.fire({ icon: 'error', title: 'Error al actualizar la plantilla', text: 'Por favor intente nuevamente.' })
        return
      }

      console.log('Plantilla actualizada:', data)
      
      // Recargar plantillas
      await cargarPlantillas()
      
      // Limpiar formulario usando la función centralizada
      limpiarFormulario()
      
      setIsEditModalOpen(false)
      await Swal.fire({ icon: 'success', title: 'Plantilla actualizada', text: 'Plantilla actualizada exitosamente!' })
    } catch (error) {
      console.error('Error al conectar con Supabase:', error)
      await Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Por favor intente nuevamente.' })
    }
  }

  const handleEditTemplate = (plantilla: Plantilla) => {
    cargarDatosParaEditar(plantilla)
    setIsEditModalOpen(true)
  }

  const handleViewTemplate = async (plantilla: Plantilla) => {
    console.log('=== CONFIGURACIÓN DE PLANTILLA ===')
    console.log('ID de Plantilla:', plantilla.id)
    console.log('Nombre:', plantilla.nombre_plantilla)
    console.log('Región:', plantilla.region)
    console.log('Radio:', plantilla.radio)
    console.log('Duración:', plantilla.duracion, 'minutos')
    console.log('Voz seleccionada:', plantilla.voz)
    console.log('Categorías configuradas:', plantilla.categorias)
    console.log('Cantidad de categorías:', plantilla.categorias?.length || 0)
    
    console.log('=== FUENTES SELECCIONADAS ===')
    
    // Validar y procesar cantidad_fuentes
    if (plantilla.cantidad_fuentes && Array.isArray(plantilla.cantidad_fuentes) && plantilla.cantidad_fuentes.length > 0) {
      const fuentesValidas = plantilla.cantidad_fuentes.filter(f => 
        f && typeof f === 'object' && f.nombre_fuente && typeof f.cantidad === 'number'
      )
      
      console.log('Fuentes:', fuentesValidas.map(f => f.nombre_fuente))
      console.log('Cantidad de fuentes seleccionadas:', fuentesValidas.length)
      console.log('Detalle de cantidades por fuente:')
      fuentesValidas.forEach(fuente => {
        console.log(`  - ${fuente.nombre_fuente}: ${fuente.cantidad} noticias`)
      })
      console.log('Total de noticias a obtener:', 
        fuentesValidas.reduce((total, fuente) => total + Number(fuente.cantidad), 0)
      )
    } else {
      console.log('Fuentes: []')
      console.log('Cantidad de fuentes seleccionadas: 0')
      console.log('No hay fuentes configuradas en esta plantilla')
      console.log('Total de noticias a obtener: 0')
    }
    
    console.log('=== ANÁLISIS TÉCNICO DE SUPABASE ===')
    console.log('Tipo de cantidad_fuentes:', typeof plantilla.cantidad_fuentes)
    console.log('Es array:', Array.isArray(plantilla.cantidad_fuentes))
    console.log('Estructura JSON completa:', JSON.stringify(plantilla.cantidad_fuentes, null, 2))
    
    console.log('=== METADATOS ===')
    console.log('Fecha de creación:', plantilla.created_at)
    console.log('Fecha de actualización:', plantilla.updated_at)
    console.log('Objeto completo de Supabase:', plantilla)
    console.log('===============================')
    
    // Calcular resumen para la alerta
    const fuentesArray = Array.isArray(plantilla.cantidad_fuentes) 
      ? plantilla.cantidad_fuentes.filter(f => f && typeof f === 'object' && f.nombre_fuente && f.cantidad)
      : []
    const totalNoticias = fuentesArray.reduce((total, fuente) => total + Number(fuente.cantidad || 0), 0)
    const numFuentes = fuentesArray.length
    const numCategorias = plantilla.categorias?.length || 0
    
    await Swal.fire({
      icon: 'info',
      title: 'Configuración de Plantilla Analizada',
      html: `
        <div style="text-align:left">
          <p><strong>Plantilla:</strong> "${plantilla.nombre_plantilla}"</p>
          <p><strong>Región:</strong> ${plantilla.region}</p>
          <p><strong>Radio:</strong> ${plantilla.radio}</p>
          <p><strong>Duración:</strong> ${plantilla.duracion} minutos</p>
          <p><strong>Voz:</strong> ${plantilla.voz}</p>
          <hr />
          <p><strong>Configuración de contenido:</strong></p>
          <ul>
            <li>Categorías: ${numCategorias} configuradas</li>
            <li>Fuentes: ${numFuentes} seleccionadas</li>
            <li>Total noticias: ${totalNoticias}</li>
          </ul>
        </div>
      `,
      confirmButtonText: 'Cerrar'
    })
  }

  // Función para generar noticiero similar a crear-noticiero
  const handleGenerateNewscast = async (plantilla: Plantilla) => {
    try {
      console.log('🚀 INICIANDO GENERACIÓN DE NOTICIERO DESDE PLANTILLA')
      console.log('=====================================================')
      console.log('Plantilla seleccionada:', plantilla)
      
      // Validar que la plantilla tenga la configuración mínima
      if (!plantilla.region || !plantilla.radio) {
        await Swal.fire({ icon: 'warning', title: 'Configuración incompleta', text: 'Esta plantilla no tiene configuración completa (región o radio faltante)' })
        return
      }
      
      if (!plantilla.cantidad_fuentes || !Array.isArray(plantilla.cantidad_fuentes) || plantilla.cantidad_fuentes.length === 0) {
        await Swal.fire({ icon: 'warning', title: 'Fuentes faltantes', text: 'Esta plantilla no tiene fuentes configuradas' })
        return
      }
      
      // Validar fuentes válidas
      const fuentesValidas = plantilla.cantidad_fuentes.filter(f => 
        f && typeof f === 'object' && f.nombre_fuente && typeof f.cantidad === 'number' && f.cantidad > 0
      )
      
      if (fuentesValidas.length === 0) {
        await Swal.fire({ icon: 'warning', title: 'Fuentes inválidas', text: 'Esta plantilla no tiene fuentes válidas configuradas' })
        return
      }
      
      // Preparar datos para localStorage en formato específico solicitado
      const newscastData = {
        region: plantilla.region,
        radio: plantilla.radio,
        selectedSources: fuentesValidas.map(f => f.nombre_fuente),
        sourceNewsCount: fuentesValidas.reduce((acc, f) => {
          acc[f.nombre_fuente] = f.cantidad
          return acc
        }, {} as {[key: string]: number}),
        timestamp: Date.now()
      }
      
      // Guardar en localStorage usando el mismo nombre que busca timeline-noticiero
      localStorage.setItem('newscast_search_config', JSON.stringify(newscastData))
      localStorage.setItem('vira_generation_source', 'plantilla')
      localStorage.setItem('vira_template_used', plantilla.id)
      
      console.log('💾 DATOS GUARDADOS EN LOCALSTORAGE (FORMATO ESPECÍFICO):')
      console.log('====================================================')
      console.log(JSON.stringify(newscastData, null, 2))
      console.log('====================================================')
      
      // Configuración extendida para compatibilidad (opcional)
      const newscastConfigExtended = {
        // Formato base específico
        ...newscastData,
        
        // Datos adicionales para compatibilidad con crear-noticiero
        duration: [plantilla.duracion],
        voice: plantilla.voz,
        selectedCategories: categories.map(cat => ({
          ...cat,
          checked: plantilla.categorias.includes(cat.label) || plantilla.categorias.includes(cat.id)
        })),
        adFrequency: 3,
        adCount: 3,
        includeTimeWeather: true,
        newsTime: '08:00',
        intelligentCuration: true,
        
        // Metadatos
        generatedFrom: 'plantilla',
        templateId: plantilla.id,
        templateName: plantilla.nombre_plantilla,
        generatedAt: new Date().toISOString()
      }
      
      // Guardar también la configuración extendida en otra clave
      localStorage.setItem('vira_newscast_config_extended', JSON.stringify(newscastConfigExtended))
      
      // Mostrar confirmación detallada
      const totalNoticias = fuentesValidas.reduce((total, f) => total + Number(f.cantidad), 0)
      const categoriasSeleccionadas = plantilla.categorias.join(', ')
      
      await Swal.fire({
        icon: 'info',
        title: 'Iniciando generación de noticiero',
        html: `
          <div style="text-align:left">
            <p><strong>Plantilla:</strong> ${plantilla.nombre_plantilla}</p>
            <p><strong>Región:</strong> ${plantilla.region}</p>
            <p><strong>Radio:</strong> ${plantilla.radio}</p>
            <p><strong>Duración:</strong> ${plantilla.duracion} minutos</p>
            <p><strong>Voz:</strong> ${plantilla.voz}</p>
            <p><strong>Categorías:</strong> ${categoriasSeleccionadas}</p>
            <p><strong>Fuentes:</strong> ${fuentesValidas.length}</p>
            <p><strong>Total noticias:</strong> ${totalNoticias}</p>
          </div>
        `,
        confirmButtonText: 'Continuar'
      })
      
      // Simular delay de procesamiento inicial
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Generar ID único para el timeline
      const timelineId = `timeline_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      
      // Redirigir al timeline de noticiero igual que en crear-noticiero
      router.push(`/timeline-noticiero/${timelineId}?source=plantilla&template=${plantilla.id}`)
      
    } catch (error) {
      console.error('❌ Error al generar noticiero:', error)
      await Swal.fire({ icon: 'error', title: 'Error al generar el noticiero', text: `${error instanceof Error ? error.message : 'Error desconocido'}` })
    }
  }

  const handleDeleteTemplate = async (templateId: string | number) => {
    const result = await Swal.fire({
      title: 'Eliminar plantilla',
      text: '¿Estás seguro de que deseas eliminar esta plantilla?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    })
    
    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('plantillas')
          .delete()
          .eq('id', templateId)

        if (error) {
          console.error('Error al eliminar plantilla:', error.message)
          await Swal.fire({ icon: 'error', title: 'Error al eliminar la plantilla', text: 'Por favor intente nuevamente.' })
          return
        }

        // Recargar plantillas
        await cargarPlantillas()
        await Swal.fire({ icon: 'success', title: 'Plantilla eliminada', text: 'Plantilla eliminada exitosamente' })
      } catch (error) {
        console.error('Error al conectar con Supabase:', error)
        await Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Por favor intente nuevamente.' })
      }
    }
  }

  const currentRadios = radiosByRegion[selectedRegion as keyof typeof radiosByRegion] || radiosByRegion['Arica y Parinacota']

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Perfiles y Plantillas
          </h1>
          
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            if (open) {
              // Limpiar formulario al abrir modal de nueva plantilla
              limpiarFormulario()
            }
            setIsModalOpen(open)
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Crear Nuevo
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="flex flex-row items-center justify-between">
                <DialogTitle className="text-lg font-bold">Crear Nueva Plantilla</DialogTitle>
                <DialogClose asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={limpiarFormulario}>
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Nombre de la Plantilla */}
                <div className="space-y-2">
                  <Label htmlFor="template-name" className="text-sm font-medium text-gray-700">
                    Nombre de la Plantilla
                  </Label>
                  <Input
                    id="template-name"
                    placeholder="Ej: Noticiero Matinal"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Selección de Emisora */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Selección de Emisora</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Región
                        </Label>
                        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {chileanRegions.map(region => (
                              <SelectItem key={region} value={region}>
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Radio
                        </Label>
                        <Select value={selectedRadio} onValueChange={setSelectedRadio}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currentRadios.map(radio => (
                              <SelectItem key={radio} value={radio}>
                                {radio}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Formato del Noticiero */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Formato del Noticiero</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">
                          Duración Total ({duration[0]} min)
                        </Label>
                        <Slider
                          value={duration}
                          onValueChange={setDuration}
                          min={5}
                          max={60}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Frases Publicitarias
                        </Label>
                        <div className="text-2xl font-bold text-gray-900">{adPhrases}</div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Publicidad cada...
                        </Label>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-gray-900">{adFrequency}</span>
                          <span className="text-sm text-gray-600">noticias</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categorías */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Categorías</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedCategories.map(category => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={category.id}
                          checked={category.checked}
                          onCheckedChange={(checked) => 
                            handleCategoryChange(category.id, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={category.id}
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          {category.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voz y Tono */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900">Voz y Tono</h3>
                    <Star className="h-4 w-4 text-amber-500" />
                  </div>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger className="max-w-xs">
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

                {/* Fuentes Sugeridas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Fuentes de Noticias Sugeridas</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Selecciona las fuentes de noticias para {selectedRegion || 'la región seleccionada'} y especifica cuántas noticias obtener de cada una.
                  </p>
                  
                  {loadingFuentes ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2 text-sm">Cargando fuentes...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fuentes
                        .filter(fuente => fuente.nombre === selectedRegion)
                        .map((fuente) => {
                          const isSelected = selectedSources.includes(fuente.nombre_fuente)
                          const newsCount = sourceNewsCount[fuente.nombre_fuente] || 3
                          
                          return (
                            <div 
                              key={fuente.id}
                              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                              onClick={() => handleSourceSelect(fuente.nombre_fuente)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900 text-sm">{fuente.nombre_fuente}</h4>
                                    <p className="text-xs text-gray-500">{fuente.url}</p>
                                  </div>
                                </div>
                                
                                {isSelected && (
                                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-sm text-gray-600">Noticias:</span>
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={() => handleNewsCountChange(fuente.nombre_fuente, newsCount - 1)}
                                        className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-sm"
                                        disabled={newsCount <= 1}
                                      >
                                        -
                                      </button>
                                      <span className="w-8 text-center text-sm font-medium">{newsCount}</span>
                                      <button
                                        onClick={() => handleNewsCountChange(fuente.nombre_fuente, newsCount + 1)}
                                        className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-sm"
                                        disabled={newsCount >= 10}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })
                      }
                      
                      {fuentes.filter(fuente => fuente.nombre === selectedRegion).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No hay fuentes disponibles para {selectedRegion || 'esta región'}.</p>
                          <p className="text-sm">Agrega fuentes en la sección "Activos".</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedSources.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Fuentes seleccionadas:</strong> {selectedSources.length} | 
                        <strong>Total de noticias:</strong> {selectedSources.reduce((total, source) => total + (sourceNewsCount[source] || 0), 0)}
                      </p>

                    </div>
                  )}
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-4">
                  <DialogClose asChild>
                    <Button variant="outline">
                      Cerrar
                    </Button>
                  </DialogClose>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSaveTemplate}
                  >
                    Guardar Plantilla
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal de Edición */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="flex flex-row items-center justify-between">
                <DialogTitle className="text-lg font-bold">Editar Plantilla</DialogTitle>
                <DialogClose asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Nombre de la Plantilla */}
                <div className="space-y-2">
                  <Label htmlFor="edit-template-name" className="text-sm font-medium text-gray-700">
                    Nombre de la Plantilla
                  </Label>
                  <Input
                    id="edit-template-name"
                    placeholder="Ej: Noticiero Matinal"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Selección de Emisora */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Selección de Emisora</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Región
                        </Label>
                        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {chileanRegions.map(region => (
                              <SelectItem key={region} value={region}>
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Radio
                        </Label>
                        <Select value={selectedRadio} onValueChange={setSelectedRadio}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currentRadios.map(radio => (
                              <SelectItem key={radio} value={radio}>
                                {radio}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Formato del Noticiero */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Formato del Noticiero</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">
                          Duración Total ({duration[0]} min)
                        </Label>
                        <Slider
                          value={duration}
                          onValueChange={setDuration}
                          min={5}
                          max={60}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Frases Publicitarias
                        </Label>
                        <div className="text-2xl font-bold text-gray-900">{adPhrases}</div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Publicidad cada...
                        </Label>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-gray-900">{adFrequency}</span>
                          <span className="text-sm text-gray-600">noticias</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categorías */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Categorías</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedCategories.map(category => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${category.id}`}
                          checked={category.checked}
                          onCheckedChange={(checked) => 
                            handleCategoryChange(category.id, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={`edit-${category.id}`}
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          {category.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voz y Tono */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900">Voz y Tono</h3>
                    <Star className="h-4 w-4 text-amber-500" />
                  </div>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger className="max-w-xs">
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

                {/* Fuentes Sugeridas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Fuentes de Noticias Sugeridas</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Selecciona las fuentes de noticias para {selectedRegion || 'la región seleccionada'} y especifica cuántas noticias obtener de cada una.
                  </p>
                  
                  {loadingFuentes ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2 text-sm">Cargando fuentes...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fuentes
                        .filter(fuente => fuente.nombre === selectedRegion)
                        .map((fuente) => {
                          const isSelected = selectedSources.includes(fuente.nombre_fuente)
                          const newsCount = sourceNewsCount[fuente.nombre_fuente] || 3
                          
                          return (
                            <div 
                              key={fuente.id}
                              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                              onClick={() => handleSourceSelect(fuente.nombre_fuente)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900 text-sm">{fuente.nombre_fuente}</h4>
                                    <p className="text-xs text-gray-500">{fuente.url}</p>
                                  </div>
                                </div>
                                
                                {isSelected && (
                                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-sm text-gray-600">Noticias:</span>
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={() => handleNewsCountChange(fuente.nombre_fuente, newsCount - 1)}
                                        className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-sm"
                                        disabled={newsCount <= 1}
                                      >
                                        -
                                      </button>
                                      <span className="w-8 text-center text-sm font-medium">{newsCount}</span>
                                      <button
                                        onClick={() => handleNewsCountChange(fuente.nombre_fuente, newsCount + 1)}
                                        className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-sm"
                                        disabled={newsCount >= 10}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })
                      }
                      
                      {fuentes.filter(fuente => fuente.nombre === selectedRegion).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No hay fuentes disponibles para {selectedRegion || 'esta región'}.</p>
                          <p className="text-sm">Agrega fuentes en la sección "Activos".</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedSources.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Fuentes seleccionadas:</strong> {selectedSources.length} | 
                        <strong>Total de noticias:</strong> {selectedSources.reduce((total, source) => total + (sourceNewsCount[source] || 0), 0)}
                      </p>

                    </div>
                  )}
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-4">
                  <DialogClose asChild>
                    <Button variant="outline">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleUpdateTemplate}
                  >
                    Actualizar Plantilla
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Plantillas */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Cargando plantillas...</p>
            </div>
          ) : plantillasSupabase.length > 0 ? (
            plantillasSupabase.map(plantilla => (
              <Card key={plantilla.id} className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {plantilla.nombre_plantilla}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {plantilla.radio} - {plantilla.region}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Duración: {plantilla.duracion} min</span>
                        <span>Voz: {plantilla.voz}</span>
                        {plantilla.categorias && plantilla.categorias.length > 0 && (
                          <span>Categorías: {plantilla.categorias.join(', ')}</span>
                        )}
                        {(() => {
                          // Validar y procesar cantidad_fuentes de manera robusta
                          const fuentesArray = Array.isArray(plantilla.cantidad_fuentes) 
                            ? plantilla.cantidad_fuentes.filter(f => f && typeof f === 'object' && f.nombre_fuente && f.cantidad)
                            : []
                          
                          const totalNoticias = fuentesArray.reduce((total, fuente) => {
                            const cantidad = Number(fuente.cantidad) || 0
                            return total + cantidad
                          }, 0)
                          
                          return fuentesArray.length > 0 ? (
                            <span>
                              Fuentes: {fuentesArray.length} configuradas ({totalNoticias} noticias)
                            </span>
                          ) : (
                            <span className="text-orange-500">Sin fuentes configuradas</span>
                          )
                        })()}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          // Guardar configuración en localStorage como hace handleGenerateNews
                          // ACTUALIZADO: Esta función ahora genera y navega al noticiero como crear-noticiero
                          console.log('=== CONFIGURACIÓN DE PLANTILLA PARA GENERAR ===')
                          console.log('Plantilla seleccionada:', plantilla.nombre_plantilla)
                          
                          // Validar y procesar cantidad_fuentes
                          const fuentesValidas = Array.isArray(plantilla.cantidad_fuentes) 
                            ? plantilla.cantidad_fuentes.filter(f => f && typeof f === 'object' && f.nombre_fuente && f.cantidad)
                            : []
                          
                          // Crear arrays de fuentes seleccionadas y cantidades como en crear-noticiero
                          const selectedSources = fuentesValidas.map(f => f.nombre_fuente)
                          const sourceNewsCount = fuentesValidas.reduce((acc, item) => {
                            acc[item.nombre_fuente] = item.cantidad
                            return acc
                          }, {} as {[key: string]: number})
                          
                          console.log('=== FUENTES SELECCIONADAS ===')
                          console.log('Fuentes:', selectedSources)
                          console.log('Cantidad de fuentes seleccionadas:', selectedSources.length)
                          console.log('Detalle de cantidades por fuente:')
                          fuentesValidas.forEach(fuente => {
                            console.log(`  - ${fuente.nombre_fuente}: ${fuente.cantidad} noticias`)
                          })
                          console.log('Total de noticias a obtener:', 
                            fuentesValidas.reduce((total, fuente) => total + Number(fuente.cantidad), 0)
                          )
                          console.log('=============================')
                          
                          // Guardar configuración en localStorage (formato similar a crear-noticiero)
                          const configData = {
                            // Información básica de la plantilla
                            templateId: plantilla.id,
                            templateName: plantilla.nombre_plantilla,
                            region: plantilla.region,
                            radio: plantilla.radio,
                            duration: [plantilla.duracion],
                            voice: plantilla.voz,
                            
                            // Categorías (convertir de string[] a formato de categorías)
                            selectedCategories: [
                              { id: 'regionales', label: 'Regionales', checked: plantilla.categorias.includes('Regionales') },
                              { id: 'nacionales', label: 'Nacionales', checked: plantilla.categorias.includes('Nacionales') },
                              { id: 'deportes', label: 'Deportes', checked: plantilla.categorias.includes('Deportes') },
                              { id: 'economia', label: 'Economía', checked: plantilla.categorias.includes('Economía') },
                              { id: 'mundo', label: 'Mundo', checked: plantilla.categorias.includes('Mundo') },
                              { id: 'tendencias', label: 'Tendencias', checked: plantilla.categorias.includes('Tendencias') },
                              { id: 'farandula', label: 'Farandula', checked: plantilla.categorias.includes('Farandula') }
                            ],
                            
                            // Fuentes y cantidades
                            selectedSources: selectedSources,
                            sourceNewsCount: sourceNewsCount,
                            
                            // Configuración adicional (valores por defecto de crear-noticiero)
                            intelligentCuration: true,
                            adFrequency: 3,
                            adCount: 3,
                            includeTimeWeather: true,
                            newsTime: '08:00',
                            
                            // Metadatos
                            generatedAt: new Date().toISOString(),
                            source: 'plantilla',
                            sourceId: plantilla.id
                          }
                          
                          // Guardar en localStorage con la misma clave que usa crear-noticiero
                          try {
                            // Guardar en localStorage con el formato específico solicitado
                            const newscastData = {
                              region: plantilla.region,
                              radio: plantilla.radio,
                              selectedSources: selectedSources,
                              sourceNewsCount: sourceNewsCount,
                              timestamp: Date.now()
                            }
                            
                            localStorage.setItem('newscast_search_config', JSON.stringify(newscastData))
                            localStorage.setItem('vira_last_template_used', plantilla.id)
                            
                            console.log('📋 DATOS GUARDADOS EN LOCALSTORAGE (FORMATO ESPECÍFICO):')
                            console.log('================================================')
                            console.log(JSON.stringify(newscastData, null, 2))
                            console.log('================================================')
                            console.log('Configuración completa guardada en localStorage:', configData)
                            
                            await Swal.fire({
                              icon: 'success',
                              title: 'Configuración cargada',
                              html: `
                                <div style="text-align:left">
                                  <p><strong>Plantilla:</strong> "${plantilla.nombre_plantilla}"</p>
                                  <p><strong>Región:</strong> ${plantilla.region}</p>
                                  <p><strong>Radio:</strong> ${plantilla.radio}</p>
                                  <p><strong>Duración:</strong> ${plantilla.duracion} minutos</p>
                                  <p><strong>Voz:</strong> ${plantilla.voz}</p>
                                  <p><strong>Fuentes configuradas:</strong> ${selectedSources.length}</p>
                                  <p><strong>Total noticias:</strong> ${fuentesValidas.reduce((total, fuente) => total + Number(fuente.cantidad), 0)}</p>
                                </div>
                              `,
                              confirmButtonText: 'Continuar'
                            })
                            
                            // Generar ID único para el timeline como en crear-noticiero
                            const timelineId = `timeline_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
                            
                            // Simular delay y navegar al timeline
                            setTimeout(() => {
                              router.push(`/timeline-noticiero/${timelineId}?source=plantilla&template=${plantilla.id}`)
                            }, 1500)
                            
                          } catch (error) {
                            console.error('Error al guardar en localStorage:', error)
                            await Swal.fire({ icon: 'error', title: 'Error al guardar la configuración', text: 'Por favor intenta nuevamente.' })
                          }
                        }}
                        className="h-8 w-8 p-0 hover:bg-green-50"
                        title="Generar noticiero con esta plantilla"
                      >
                        <Play className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewTemplate(plantilla)}
                        className="h-8 w-8 p-0 hover:bg-blue-50"
                        title="Ver datos en consola"
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTemplate(plantilla)}
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        title="Editar plantilla"
                      >
                        <Edit className="h-4 w-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(plantilla.id)}
                        className="h-8 w-8 p-0 hover:bg-red-50"
                        title="Eliminar plantilla"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Plus className="h-12 w-12 mx-auto mb-4" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay plantillas creadas
              </h3>
              <p className="text-gray-500 mb-6">
                Crea tu primera plantilla para comenzar a generar noticieros personalizados.
              </p>
              <Button 
                onClick={() => {
                  limpiarFormulario()
                  setIsModalOpen(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Plantilla
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
