'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TimelineNoticieroPage() {
  const router = useRouter()

  useEffect(() => {
    // Extraer configuración de localStorage desde la página detallada
    const extractLocalStorageConfig = () => {
      try {
        // Buscar la configuración guardada por la página detallada
        const savedConfig = localStorage.getItem('newscast_search_config')
        
        if (savedConfig) {
          const config = JSON.parse(savedConfig)
          console.log('📋 Configuración extraída del localStorage:', config)
          
          // Usar la región como ID para el timeline-noticiero
          const regionId = config.region || 'default'
          const redirectUrl = `/timeline-noticiero/${regionId}`
          
          console.log(`🔄 Redirigiendo a: ${redirectUrl}`)
          router.push(redirectUrl)
        } else {
          // Si no hay configuración guardada, usar ID por defecto
          console.log('❌ No se encontró configuración en localStorage')
          router.push('/timeline-noticiero/default')
        }
      } catch (error) {
        console.error('Error al extraer configuración del localStorage:', error)
        router.push('/timeline-noticiero/default')
      }
    }

    // Ejecutar la extracción inmediatamente
    extractLocalStorageConfig()
  }, [router])

  // Mostrar una pantalla de carga mientras se redirige
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando configuración...</p>
      </div>
    </div>
  )
}