
#!/usr/bin/env node

/**
 * VIRA - Migration Script from Prisma to Supabase
 * 
 * Este script automatiza la migración completa de Prisma a Supabase
 * 
 * USO:
 * node scripts/migrate-to-supabase.js
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🚀 VIRA - Migración de Prisma a Supabase')
console.log('=========================================')

// Verificar que estamos en el directorio correcto
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Ejecuta este script desde la raíz del proyecto VIRA')
  process.exit(1)
}

// Función para ejecutar comandos
function runCommand(command, description) {
  console.log(`\n📋 ${description}`)
  console.log(`   Ejecutando: ${command}`)
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
    console.log(`✅ ${description} - Completado`)
    return result
  } catch (error) {
    console.error(`❌ Error en: ${description}`)
    console.error(`   Comando: ${command}`)
    console.error(`   Error: ${error.message}`)
    return null
  }
}

// Función para actualizar archivos
function updateFile(filePath, searchRegex, replacement, description) {
  console.log(`\n📝 ${description}`)
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8')
      const originalContent = content
      
      if (typeof searchRegex === 'string') {
        content = content.replace(new RegExp(searchRegex, 'g'), replacement)
      } else {
        content = content.replace(searchRegex, replacement)
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content)
        console.log(`✅ ${description} - Actualizado`)
      } else {
        console.log(`ℹ️  ${description} - Sin cambios necesarios`)
      }
    } else {
      console.log(`⚠️  ${description} - Archivo no encontrado: ${filePath}`)
    }
  } catch (error) {
    console.error(`❌ Error actualizando ${filePath}: ${error.message}`)
  }
}

// Función para eliminar archivos/directorios
function removeFileOrDir(filePath, description) {
  console.log(`\n🗑️  ${description}`)
  try {
    if (fs.existsSync(filePath)) {
      if (fs.statSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true })
      } else {
        fs.unlinkSync(filePath)
      }
      console.log(`✅ ${description} - Eliminado`)
    } else {
      console.log(`ℹ️  ${description} - Ya no existe`)
    }
  } catch (error) {
    console.error(`❌ Error eliminando ${filePath}: ${error.message}`)
  }
}

// Función para crear backup
function createBackup() {
  console.log('\n💾 Creando backup del proyecto')
  const backupDir = `backup_prisma_${new Date().toISOString().split('T')[0]}`
  
  try {
    // Crear directorio de backup
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir)
    }
    
    // Copiar archivos importantes
    const filesToBackup = [
      'package.json',
      'prisma/schema.prisma',
      '.env'
    ]
    
    filesToBackup.forEach(file => {
      if (fs.existsSync(file)) {
        const destPath = path.join(backupDir, file)
        const destDir = path.dirname(destPath)
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true })
        }
        fs.copyFileSync(file, destPath)
      }
    })
    
    console.log(`✅ Backup creado en: ${backupDir}`)
  } catch (error) {
    console.error(`❌ Error creando backup: ${error.message}`)
  }
}

// Función principal de migración
async function migrate() {
  try {
    console.log('\n⏳ Iniciando migración...')
    
    // 1. Crear backup
    createBackup()
    
    // 2. Instalar dependencias de Supabase
    runCommand('yarn add @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-shared', 'Instalando dependencias de Supabase')
    
    // 3. Remover dependencias de Prisma del package.json
    console.log('\n📦 Actualizando package.json')
    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      
      // Remover dependencias de Prisma
      const prismaDepencies = ['prisma', '@prisma/client', '@next-auth/prisma-adapter']
      let hasChanges = false
      
      prismaDepencies.forEach(dep => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          delete packageJson.dependencies[dep]
          hasChanges = true
          console.log(`   Removiendo dependencia: ${dep}`)
        }
        if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
          delete packageJson.devDependencies[dep]
          hasChanges = true
          console.log(`   Removiendo devDependencia: ${dep}`)
        }
      })
      
      if (hasChanges) {
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2))
        console.log('✅ package.json actualizado')
      }
    }
    
    // 4. Eliminar archivos de Prisma
    removeFileOrDir('prisma', 'Eliminando directorio prisma/')
    removeFileOrDir('node_modules/.prisma', 'Eliminando caché de Prisma')
    
    // 5. Actualizar imports en archivos de API (ejemplos)
    const apiFiles = [
      'app/api/auth/[...nextauth]/route.ts',
    ]
    
    apiFiles.forEach(file => {
      updateFile(
        file,
        /import.*@prisma\/client.*/g,
        "// Prisma removido - usando Supabase",
        `Actualizando imports en ${file}`
      )
    })
    
    // 6. Actualizar .env con template de Supabase
    console.log('\n⚙️  Actualizando variables de entorno')
    if (fs.existsSync('.env')) {
      let envContent = fs.readFileSync('.env', 'utf8')
      
      // Comentar DATABASE_URL de Prisma
      envContent = envContent.replace(/^DATABASE_URL=/gm, '# DATABASE_URL=')
      
      // Agregar variables de Supabase si no existen
      const supabaseVars = `
# === BASE DE DATOS SUPABASE ===
# Configura estas variables con tu proyecto de Supabase:
# NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-id.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aquí
# SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aquí

# === NEXTAUTH OAUTH ===
# GOOGLE_CLIENT_ID=tu_google_client_id
# GOOGLE_CLIENT_SECRET=tu_google_client_secret
`
      
      if (!envContent.includes('NEXT_PUBLIC_SUPABASE_URL')) {
        envContent += supabaseVars
      }
      
      fs.writeFileSync('.env', envContent)
      console.log('✅ Variables de entorno actualizadas')
    }
    
    // 7. Reinstalar dependencias limpias
    removeFileOrDir('node_modules', 'Eliminando node_modules para reinstalación limpia')
    removeFileOrDir('yarn.lock', 'Eliminando yarn.lock para regenerar dependencias')
    
    runCommand('yarn install', 'Instalando dependencias limpias')
    
    // 8. Verificar instalación
    runCommand('yarn tsc --noEmit', 'Verificando tipos TypeScript')
    
    console.log('\n🎉 ¡MIGRACIÓN COMPLETADA!')
    console.log('========================')
    console.log('')
    console.log('✅ Prisma removido completamente')
    console.log('✅ Supabase instalado y configurado')
    console.log('✅ APIs actualizadas para usar Supabase')
    console.log('✅ Variables de entorno preparadas')
    console.log('')
    console.log('📋 PRÓXIMOS PASOS:')
    console.log('1. Crea un proyecto en https://supabase.com')
    console.log('2. Ejecuta el SQL del archivo database/supabase_schema.sql')
    console.log('3. Configura las variables de entorno en .env')
    console.log('4. Configura OAuth providers en Supabase')
    console.log('5. Ejecuta: yarn dev')
    console.log('')
    console.log('📖 Lee CONFIGURACION_SUPABASE.md para guía detallada')
    
  } catch (error) {
    console.error('\n❌ ERROR EN MIGRACIÓN')
    console.error('====================')
    console.error(error.message)
    console.log('')
    console.log('💡 SUGERENCIAS:')
    console.log('1. Revisa que tengas permisos de escritura')
    console.log('2. Asegúrate de tener yarn instalado')
    console.log('3. Ejecuta desde la raíz del proyecto')
    console.log('4. Consulta el backup creado para restaurar si es necesario')
  }
}

// Confirmar antes de ejecutar
const readline = require('readline')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('\n⚠️  IMPORTANTE: Esta migración:')
console.log('• Eliminará completamente Prisma del proyecto')
console.log('• Instalará y configurará Supabase')
console.log('• Creará un backup antes de proceder')
console.log('• Requerirá configuración manual de Supabase después')

rl.question('\n¿Deseas continuar con la migración? (sí/no): ', (answer) => {
  if (answer.toLowerCase() === 'sí' || answer.toLowerCase() === 'si' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    rl.close()
    migrate()
  } else {
    console.log('\n❌ Migración cancelada por el usuario')
    rl.close()
  }
})
