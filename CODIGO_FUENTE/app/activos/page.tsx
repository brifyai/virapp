
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, Upload, Globe, Mic, UserCheck, Radio } from 'lucide-react'

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

// Interfaz para las fuentes de noticias (usando estructura de fuentes_final)
interface NewsSource {
  id: string
  nombre: string
  nombre_fuente: string
  url: string
}

// Interfaz para las radios
interface Radio {
  id: string
  nombre: string
  frecuencia: string
  region: string
  url?: string
}



export default function ActivosPage() {
  const [activeTab, setActiveTab] = useState('fuentes-noticias')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [newsSources, setNewsSources] = useState<NewsSource[]>([])
  const [loading, setLoading] = useState(true)
  const [newSourceName, setNewSourceName] = useState('')
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [addingSource, setAddingSource] = useState(false)
  
  // Estados para Voz de Marca
  const [brandVoiceScript, setBrandVoiceScript] = useState('')
  const [isTrainingBrandVoice, setIsTrainingBrandVoice] = useState(false)
  
  // Estados para Clonación de Voz
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isTrainingVoiceClone, setIsTrainingVoiceClone] = useState(false)
  
  // Estados para Radios
  const [radios, setRadios] = useState<Radio[]>([])
  const [loadingRadios, setLoadingRadios] = useState(true)
  const [newRadioName, setNewRadioName] = useState('')
  const [newRadioFrequency, setNewRadioFrequency] = useState('')
  const [newRadioRegion, setNewRadioRegion] = useState('')
  const [newRadioUrl, setNewRadioUrl] = useState('')
  const [addingRadio, setAddingRadio] = useState(false)
  const [selectedRadioRegion, setSelectedRadioRegion] = useState<string>('todas')



  // Función para obtener fuentes de noticias desde Supabase
  useEffect(() => {
    async function obtenerFuentes() {
      setLoading(true)
      try {
        // Obtener datos de fuentes_final
        const { data: fuentes, error } = await supabase
          .from('fuentes_final')
          .select('*')
          .order('nombre', { ascending: true })
        
        if (error) {
          console.error('Error al obtener fuentes:', error.message)
          setNewsSources([])
        } else {
          setNewsSources(fuentes || [])
          // Establecer región por defecto si hay datos
          if (fuentes && fuentes.length > 0 && !selectedRegion) {
            const regiones = [...new Set(fuentes.map(f => f.nombre))]
            setSelectedRegion(regiones[0])
          }
        }
      } catch (error) {
        console.error('Error al conectar con Supabase:', error)
        setNewsSources([])
      } finally {
        setLoading(false)
      }
    }
    
    obtenerFuentes()
  }, [])

  // Función para cargar radios cuando se selecciona la pestaña
  const cargarRadios = async () => {
    setLoadingRadios(true)
    try {
      // Obtener datos de radios
      const { data: radioData, error } = await supabase
        .from('radios')
        .select('*')
        .order('nombre', { ascending: true })
      
      if (error) {
        console.error('Error al obtener radios:', error.message)
        setRadios([])
      } else {
        console.log('Radios cargadas:', radioData)
        setRadios(radioData || [])
      }
    } catch (error) {
      console.error('Error al conectar con Supabase:', error)
      setRadios([])
    } finally {
      setLoadingRadios(false)
    }
  }

  // Efecto para cargar radios cuando cambia la pestaña activa
  useEffect(() => {
    if (activeTab === 'radios') {
      cargarRadios()
    }
  }, [activeTab])

  // Función para insertar una radio en Supabase
  const insertarRadio = async (radioData: { nombre: string, frecuencia: string, region: string, url?: string | null }) => {
    try {
      const { data, error } = await supabase
        .from('radios')
        .insert([radioData])
        .select()
      
      if (error) {
        console.error('Error al insertar radio:', error.message)
        return { success: false, error: error.message }
      }
      
      return { success: true, data }
    } catch (error) {
      console.error('Error al conectar con Supabase:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  // Función para agregar una nueva radio
  const handleAddRadio = async () => {
    if (!newRadioName.trim() || !newRadioFrequency.trim() || !newRadioRegion.trim()) {
      alert('Por favor complete los campos obligatorios: Nombre, Frecuencia y Región')
      return
    }

    // Crear objeto con los nuevos datos
    const newRadioData = { 
      nombre: newRadioName.trim(), 
      frecuencia: newRadioFrequency.trim(),
      region: newRadioRegion.trim(),
      url: newRadioUrl.trim() || null
    }
    
    // Mostrar los datos en la consola
    console.log('Agregando nueva radio:', newRadioData)

    setAddingRadio(true)
    try {
      // Usar la función insertarRadio para crear el registro
      const result = await insertarRadio(newRadioData)
      
      if (!result.success) {
        throw result.error
      }

      // Actualizar estado local
      const { data: updatedData, error: fetchError } = await supabase
        .from('radios')
        .select('*')
        .order('nombre', { ascending: true })
      
      if (!fetchError) {
        setRadios(updatedData || [])
      }

      // Limpiar formulario
      setNewRadioName('')
      setNewRadioFrequency('')
      setNewRadioRegion('')
      setNewRadioUrl('')
      alert('Radio agregada exitosamente')
    } catch (error) {
      console.error('Error al agregar radio:', error)
      alert('Error al agregar la radio. Por favor intente nuevamente.')
    } finally {
      setAddingRadio(false)
    }
  }

  // Función para eliminar una radio
  const eliminarRadio = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta radio?')) {
      try {
        const { error } = await supabase
          .from('radios')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Error al eliminar radio:', error.message)
          alert(`Error al eliminar la radio: ${error.message}`)
          return
        }

        // Actualizar el estado local
        setRadios((prev: Radio[]) => prev.filter(radio => radio.id !== id))
        alert('Radio eliminada exitosamente')
      } catch (error) {
        console.error('Error al eliminar radio:', error)
        alert('Error inesperado al eliminar la radio. Por favor intente nuevamente.')
      }
    }
  }

  // Funciones para Fuentes de Noticias
  const handleAddSource = async () => {
    if (!selectedRegion) {
      alert('Por favor seleccione una región')
      return
    }

    if (!newSourceName.trim() || !newSourceUrl.trim()) {
      alert('Por favor complete todos los campos')
      return
    }

    if (!newSourceUrl.includes('http')) {
      alert('Por favor ingrese una URL válida (debe incluir http:// o https://)')
      return
    }

    // Crear objeto con los nuevos datos
    const newSourceData = { 
      nombre: selectedRegion, 
      nombre_fuente: newSourceName.trim(), 
      url: newSourceUrl.trim() 
    }
    
    // Mostrar los datos en la consola
    console.log('Agregando nueva fuente de noticias:', newSourceData)

    setAddingSource(true)
    try {
      // Crear nuevo registro en fuentes_final
      const { error: insertError } = await supabase
        .from('fuentes_final')
        .insert(newSourceData)

      if (insertError) {
        throw insertError
      }

      // Actualizar estado local
      const { data: updatedData, error: fetchError } = await supabase
        .from('fuentes_final')
        .select('*')
        .order('nombre', { ascending: true })
      
      if (!fetchError) {
        setNewsSources(updatedData || [])
      }

      setNewSourceName('')
      setNewSourceUrl('')
      alert('Fuente agregada exitosamente')
    } catch (error) {
      console.error('Error al agregar fuente:', error)
      alert('Error al agregar la fuente. Por favor intente nuevamente.')
    } finally {
      setAddingSource(false)
    }
  }



  // Función para Voz de Marca
  const handleTrainBrandVoice = async () => {
    if (!brandVoiceScript.trim()) {
      alert('Por favor ingrese transcripciones para entrenar la voz')
      return
    }

    // Mostrar los datos en la consola
    console.log('Entrenando voz de marca con el texto:', brandVoiceScript)

    setIsTrainingBrandVoice(true)
    try {
      // Simular entrenamiento
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert('Entrenamiento de voz de marca iniciado. Te notificaremos por correo cuando esté listo.')
      setBrandVoiceScript('')
    } catch (error) {
      alert('Error al iniciar el entrenamiento')
    } finally {
      setIsTrainingBrandVoice(false)
    }
  }

  // Funciones para Clonación de Voz
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const audioFiles = Array.from(files).filter(file => 
        file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav')
      )
      
      if (audioFiles.length === 0) {
        alert('Por favor seleccione archivos de audio válidos (.mp3, .wav)')
        return
      }

      setUploadedFiles(prev => [...prev, ...audioFiles])
    }
  }

  const handleTrainVoiceClone = async () => {
    if (uploadedFiles.length === 0) {
      alert('Por favor suba al menos un archivo de audio')
      return
    }

    // Mostrar los datos en la consola
    console.log('Clonando voz con archivos:', uploadedFiles.map(file => file.name))

    setIsTrainingVoiceClone(true)
    try {
      // Simular entrenamiento
      await new Promise(resolve => setTimeout(resolve, 3000))
      alert('Clonación de voz iniciada. Este proceso puede tardar hasta 24 horas. Te notificaremos por correo cuando esté lista.')
      setUploadedFiles([])
    } catch (error) {
      alert('Error al iniciar la clonación de voz')
    } finally {
      setIsTrainingVoiceClone(false)
    }
  }

  // Obtener fuentes de la región seleccionada
  const getCurrentSources = () => {
    if (!selectedRegion) return []
    
    return newsSources
      .filter(source => source.nombre === selectedRegion)
      .map((source, index) => ({
        id: source.id,
        name: source.nombre_fuente,
        url: source.url,
        index
      }))
  }
  
  const currentSources = getCurrentSources()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Gestionar Activos de la Radio
          </h1>
        </div>

        {/* Tabs */}
        <Card className="bg-white">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 bg-gray-50 p-1 rounded-none">
                <TabsTrigger 
                  value="fuentes-noticias"
                  className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Fuentes de Noticias
                </TabsTrigger>
                <TabsTrigger 
                  value="radios"
                  className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                >
                  <Radio className="h-4 w-4 mr-2" />
                  Radios
                </TabsTrigger>
                <TabsTrigger 
                  value="voz-marca"
                  className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Voz de Marca (IA)
                </TabsTrigger>
                <TabsTrigger 
                  value="clonacion-voz"
                  className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Clonación de Voz
                </TabsTrigger>
              </TabsList>

              {/* Tab Content: Fuentes de Noticias */}
              <TabsContent value="fuentes-noticias" className="p-6">
                <div className="space-y-6">
                  {/* Selector de Región */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Seleccionar Región
                    </Label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger className="max-w-xs">
                        <SelectValue placeholder="Selecciona una región" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Regiones con fuentes */}
                        {Array.from(new Set(newsSources.map(item => item.nombre))).map(region => {
                          const sourceCount = newsSources.filter(item => item.nombre === region).length
                          return (
                            <SelectItem key={region} value={region}>
                              {region} ({sourceCount} fuentes)
                            </SelectItem>
                          )
                        })}
                        
                        {/* Separador si hay regiones sin fuentes */}
                        {newsSources.length > 0 && chileanRegions.some(region => 
                          !newsSources.find(item => item.nombre === region)
                        ) && (
                          <div className="px-2 py-1 text-xs text-gray-500 border-t">
                            Regiones sin fuentes:
                          </div>
                        )}
                        
                        {/* Regiones sin fuentes */}
                        {chileanRegions.filter(region => 
                          !newsSources.find(item => item.nombre === region)
                        ).map(region => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lista de Fuentes */}
                  {selectedRegion && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Fuentes para {selectedRegion}
                      </h3>
                      
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-gray-500 mt-2">Cargando fuentes...</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {currentSources.length > 0 ? (
                            currentSources.map((source, index) => (
                              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                <div>
                                  <h4 className="font-medium text-gray-900">{source.name}</h4>
                                  <a 
                                    href={source.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 text-sm hover:underline"
                                  >
                                    {source.url}
                                  </a>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('¿Estás seguro de que deseas eliminar esta fuente?')) {
                                      supabase
                                        .from('fuentes_final')
                                        .delete()
                                        .eq('id', source.id)
                                        .then(({ error }) => {
                                          if (error) {
                                            alert(`Error al eliminar la fuente: ${error.message}`)
                                          } else {
                                            setNewsSources(prev => prev.filter(s => s.id !== source.id))
                                            alert('Fuente eliminada exitosamente')
                                          }
                                        })
                                    }
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                              <p>No hay fuentes configuradas para esta región.</p>
                              <p className="text-sm">Agrega la primera fuente usando el formulario de abajo.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Agregar Nueva Fuente */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Agregar Nueva Fuente{selectedRegion ? ` a ${selectedRegion}` : ''}
                    </h3>
                    
                    {!selectedRegion && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-yellow-800 text-sm">
                          Por favor selecciona una región antes de agregar una fuente.
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Nombre del Medio
                        </Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Ej: El Mercurio"
                            value={newSourceName}
                            onChange={(e) => setNewSourceName(e.target.value)}
                            className="pl-10"
                            disabled={!selectedRegion}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          URL del Sitio Web
                        </Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400">🔗</div>
                          <Input
                            placeholder="https://..."
                            value={newSourceUrl}
                            onChange={(e) => setNewSourceUrl(e.target.value)}
                            className="pl-10"
                            disabled={!selectedRegion}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Button 
                        onClick={handleAddSource} 
                        disabled={!selectedRegion || addingSource}
                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                      >
                        {addingSource ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Agregando...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Fuente
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>



              {/* Tab Content: Radios */}
              <TabsContent value="radios" className="p-6">
                <div className="space-y-6">
                  {/* Selector de Región para Radios */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Filtrar por Región
                    </Label>
                    <Select value={selectedRadioRegion} onValueChange={setSelectedRadioRegion}>
                      <SelectTrigger className="max-w-xs">
                        <SelectValue placeholder="Todas las regiones" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas las regiones</SelectItem>
                        {chileanRegions.map(region => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Lista de Radios */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Radios Registradas
                    </h3>
                    
                    {loadingRadios ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">Cargando radios...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {radios.length > 0 ? (
                          radios
                            .filter(radio => selectedRadioRegion === "todas" || !selectedRadioRegion || radio.region === selectedRadioRegion)
                            .map((radio) => (
                            <div key={radio.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <div>
                                <h4 className="font-medium text-gray-900">{radio.nombre}</h4>
                                <div className="text-sm text-gray-500">
                                  <span className="font-medium">{radio.frecuencia}</span> - {radio.region}
                                </div>
                                {radio.url && (
                                  <a 
                                    href={radio.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 text-sm hover:underline"
                                  >
                                    URL
                                  </a>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => eliminarRadio(radio.id)}
                                className="h-8 w-8 p-0 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Radio className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No hay radios configuradas.</p>
                            <p className="text-sm">Agrega la primera radio usando el formulario de abajo.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Agregar Nueva Radio */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Agregar Nueva Radio
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Nombre de la Radio *
                        </Label>
                        <div className="relative">
                          <Radio className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Ej: Radio Biobío"
                            value={newRadioName}
                            onChange={(e) => setNewRadioName(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Frecuencia *
                        </Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400">📻</div>
                          <Input
                            placeholder="Ej: 99.7 FM"
                            value={newRadioFrequency}
                            onChange={(e) => setNewRadioFrequency(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Región *
                        </Label>
                        <Select value={newRadioRegion} onValueChange={setNewRadioRegion}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una región" />
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
                          URL (opcional)
                        </Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400">🔗</div>
                          <Input
                            placeholder="https://..."
                            value={newRadioUrl}
                            onChange={(e) => setNewRadioUrl(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Button 
                        onClick={handleAddRadio} 
                        disabled={addingRadio}
                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                      >
                        {addingRadio ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Agregando...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Radio
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab Content: Voz de Marca */}
              <TabsContent value="voz-marca" className="p-6">
                <div className="space-y-6">
                  {/* Banner Informativo */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Mic className="h-5 w-5 text-emerald-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-emerald-800 mb-1">
                          Entrena tu Voz de Marca
                        </h3>
                        <p className="text-sm text-emerald-700">
                          Pega transcripciones de tus programas para que la IA aprenda el tono y estilo de tu radio. 
                          Al reescribir noticias, usará un lenguaje similar al tuyo.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Textarea para transcripciones */}
                  <div>
                    <Textarea
                      placeholder="Pega aquí ejemplos de guiones o transcripciones de tu radio..."
                      value={brandVoiceScript}
                      onChange={(e) => setBrandVoiceScript(e.target.value)}
                      className="min-h-96 text-sm"
                    />
                  </div>

                  {/* Botón Entrenar */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleTrainBrandVoice}
                      disabled={isTrainingBrandVoice}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      {isTrainingBrandVoice ? 'Entrenando...' : 'Entrenar Voz de Marca'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Tab Content: Clonación de Voz */}
              <TabsContent value="clonacion-voz" className="p-6">
                <div className="space-y-6">
                  {/* Banner Informativo */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <UserCheck className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-purple-800 mb-1">
                          Clonación de Voz
                        </h3>
                        <p className="text-sm text-purple-700">
                          Sube al menos 5 minutos de audio claro y sin música de fondo de la voz de tu locutor 
                          para crear un clon de alta fidelidad. Este proceso puede tardar hasta 24 horas.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 1. Subir Muestras de Audio */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        1. Subir Muestras de Audio
                      </h3>
                      
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                        <div className="space-y-4">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div>
                            <p className="text-gray-600 mb-2">
                              Arrastra y suelta archivos de audio aquí
                            </p>
                            <input
                              type="file"
                              multiple
                              accept="audio/*,.mp3,.wav"
                              onChange={handleFileUpload}
                              className="hidden"
                              id="audio-upload"
                            />
                            <label htmlFor="audio-upload">
                              <Button variant="outline" className="cursor-pointer" asChild>
                                <span>O selecciona archivos</span>
                              </Button>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Lista de archivos subidos */}
                      {uploadedFiles.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-700 mb-2">
                            Archivos subidos ({uploadedFiles.length})
                          </h4>
                          <div className="space-y-2">
                            {uploadedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                                  className="h-6 w-6 p-0"
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. Iniciar Entrenamiento */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        2. Iniciar Entrenamiento
                      </h3>
                      
                      <p className="text-gray-600 mb-6">
                        Una vez subidas las muestras, puedes iniciar el proceso de entrenamiento. 
                        Te notificaremos por correo cuando tu voz clonada esté lista.
                      </p>
                      
                      <Button 
                        onClick={handleTrainVoiceClone}
                        disabled={isTrainingVoiceClone || uploadedFiles.length === 0}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        {isTrainingVoiceClone ? 'Entrenando...' : 'Entrenar Voz Clonada'}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
