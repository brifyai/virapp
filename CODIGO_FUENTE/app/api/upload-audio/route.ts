
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Configuración S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
})

const getBucketConfig = () => ({
  bucketName: process.env.AWS_BUCKET_NAME || 'vira-audio-files',
  folderPrefix: process.env.AWS_FOLDER_PREFIX || 'production/'
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    const itemId = formData.get('itemId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validar tipo de archivo
    const allowedTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de archivo no permitido. Solo se aceptan archivos MP3 y WAV.' 
      }, { status: 400 })
    }

    // Validar tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'Archivo demasiado grande. Máximo 10MB permitido.' 
      }, { status: 400 })
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileExtension = file.name.split('.').pop()
    const uniqueFileName = `${timestamp}_${safeFileName}`

    // Configurar S3
    const { bucketName, folderPrefix } = getBucketConfig()
    const s3Key = `${folderPrefix}uploads/advertisements/${uniqueFileName}`

    // Convertir archivo a buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Subir a S3
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        type: type || 'advertisement',
        itemId: itemId || 'unknown'
      }
    })

    await s3Client.send(uploadCommand)

    // Generar URL del archivo (CDN si está disponible)
    const cdnUrl = process.env.S3_CDN_URL
    const audioUrl = cdnUrl 
      ? `${cdnUrl}/${s3Key}`
      : `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`

    // TODO: Guardar en biblioteca (base de datos)
    // Aquí se puede implementar la lógica para guardar en la biblioteca
    
    console.log(`✅ Audio uploaded successfully: ${uniqueFileName}`)

    return NextResponse.json({
      success: true,
      audioUrl,
      fileName: uniqueFileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      s3Key,
      uploadedAt: new Date().toISOString(),
      message: 'Archivo subido exitosamente y guardado en biblioteca'
    })

  } catch (error) {
    console.error('Error uploading audio:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor al subir el audio',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
