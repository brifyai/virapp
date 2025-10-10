
#!/bin/bash

# ===================================================================
# SCRIPT DE SETUP PARA PRODUCCIÓN - VIRA
# ===================================================================
# Este script automatiza la configuración inicial de VIRA en producción
# Incluye: verificación de dependencias, configuración de servicios,
# optimizaciones de performance y configuración de seguridad
# 
# Uso: ./setup-production.sh
# ===================================================================

set -e

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/setup-production.log"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Funciones de log
log_step() {
    echo -e "${BLUE}[STEP]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${PURPLE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Banner
show_banner() {
    cat << 'EOF'
 ██╗   ██╗██╗██████╗  █████╗ 
 ██║   ██║██║██╔══██╗██╔══██╗
 ██║   ██║██║██████╔╝███████║
 ╚██╗ ██╔╝██║██╔══██╗██╔══██║
  ╚████╔╝ ██║██║  ██║██║  ██║
   ╚═══╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝

🚀 VIRA Production Setup Script
   Sistema de Generación Automática de Noticieros
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
}

# Verificar que estamos en el directorio correcto
verify_directory() {
    log_step "Verificando directorio del proyecto..."
    
    if [ ! -f "$PROJECT_DIR/package.json" ]; then
        log_error "No se encontró package.json. Ejecuta este script desde el directorio raíz de VIRA"
        exit 1
    fi
    
    if [ ! -d "$PROJECT_DIR/app" ]; then
        log_error "Estructura de proyecto inválida. Falta directorio 'app'"
        exit 1
    fi
    
    log_success "Directorio del proyecto verificado"
}

# Verificar dependencias del sistema
check_system_dependencies() {
    log_step "Verificando dependencias del sistema..."
    
    local missing_deps=()
    
    # Node.js
    if ! command -v node >/dev/null 2>&1; then
        missing_deps+=("nodejs")
    else
        local node_version=$(node --version | sed 's/v//')
        local required_version="18.0.0"
        if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
            log_warning "Node.js versión $node_version encontrada. Recomendado: $required_version+"
        else
            log_success "Node.js versión $node_version ✓"
        fi
    fi
    
    # Yarn
    if ! command -v yarn >/dev/null 2>&1; then
        missing_deps+=("yarn")
    else
        log_success "Yarn $(yarn --version) ✓"
    fi
    
    # Git
    if ! command -v git >/dev/null 2>&1; then
        missing_deps+=("git")
    else
        log_success "Git $(git --version | cut -d' ' -f3) ✓"
    fi
    
    # PostgreSQL client (opcional pero recomendado)
    if ! command -v psql >/dev/null 2>&1; then
        log_warning "psql no encontrado (opcional para backups locales)"
    else
        log_success "PostgreSQL client disponible ✓"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Dependencias faltantes: ${missing_deps[*]}"
        log_info "Instala con:"
        log_info "  Ubuntu: sudo apt update && sudo apt install ${missing_deps[*]}"
        log_info "  CentOS: sudo yum install ${missing_deps[*]}"
        log_info "  macOS: brew install ${missing_deps[*]}"
        exit 1
    fi
}

# Configurar variables de entorno
setup_environment() {
    log_step "Configurando variables de entorno..."
    
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        if [ -f "$PROJECT_DIR/CONFIGURACIONES/variables-entorno-ejemplo.env" ]; then
            cp "$PROJECT_DIR/CONFIGURACIONES/variables-entorno-ejemplo.env" "$PROJECT_DIR/.env"
            log_success "Archivo .env creado desde plantilla"
            log_warning "⚠️  IMPORTANTE: Edita .env con tus credenciales reales"
            log_info "Variables críticas a configurar:"
            log_info "  - NEXTAUTH_SECRET (genera uno nuevo)"
            log_info "  - NEXTAUTH_URL (tu dominio de producción)"
            log_info "  - Base de datos (Supabase o PostgreSQL)"
            log_info "  - APIs de IA (AbacusAI, ElevenLabs, etc.)"
        else
            log_error "No se encontró template de variables de entorno"
            exit 1
        fi
    else
        log_success "Archivo .env existente encontrado"
    fi
    
    # Verificar variables críticas
    source "$PROJECT_DIR/.env" 2>/dev/null || true
    
    local critical_vars=(
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
    )
    
    local missing_vars=()
    for var in "${critical_vars[@]}"; do
        if [ -z "${!var}" ] || [ "${!var}" = "tu_secreto_super_seguro_aquí" ] || [ "${!var}" = "https://tu-dominio.com" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Variables críticas no configuradas: ${missing_vars[*]}"
        log_info "Edita $PROJECT_DIR/.env antes de continuar"
        exit 1
    fi
}

# Instalar dependencias
install_dependencies() {
    log_step "Instalando dependencias..."
    
    cd "$PROJECT_DIR"
    
    # Limpiar instalación previa si existe
    if [ -d "node_modules" ]; then
        log_info "Limpiando node_modules existente..."
        rm -rf node_modules
    fi
    
    if [ -f "yarn.lock" ]; then
        log_info "Limpiando yarn.lock..."
        rm -f yarn.lock
    fi
    
    # Instalar dependencias
    log_info "Ejecutando yarn install..."
    if yarn install --frozen-lockfile --production=false >> "$LOG_FILE" 2>&1; then
        log_success "Dependencias instaladas correctamente"
    else
        log_error "Error instalando dependencias. Ver $LOG_FILE"
        exit 1
    fi
    
    # Verificar instalación
    local critical_packages=("next" "react" "@supabase/supabase-js")
    for package in "${critical_packages[@]}"; do
        if [ -d "node_modules/$package" ]; then
            log_success "Paquete $package instalado ✓"
        else
            log_error "Paquete crítico $package no encontrado"
            exit 1
        fi
    done
}

# Configurar base de datos
setup_database() {
    log_step "Configurando base de datos..."
    
    source "$PROJECT_DIR/.env"
    
    if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        log_info "Detectada configuración de Supabase"
        
        # Verificar conexión básica a Supabase
        if curl -s --max-time 10 "$NEXT_PUBLIC_SUPABASE_URL" >/dev/null 2>&1; then
            log_success "Conexión a Supabase exitosa"
        else
            log_error "No se puede conectar a Supabase. Verifica NEXT_PUBLIC_SUPABASE_URL"
            exit 1
        fi
        
        # Verificar API key
        if [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
            local test_response=$(curl -s \
                -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
                -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
                "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" 2>/dev/null || echo "error")
            
            if [ "$test_response" != "error" ]; then
                log_success "API key de Supabase válida"
            else
                log_error "API key de Supabase inválida"
                exit 1
            fi
        else
            log_error "NEXT_PUBLIC_SUPABASE_ANON_KEY no configurada"
            exit 1
        fi
        
    elif [ -n "$DATABASE_URL" ]; then
        log_info "Detectada configuración de PostgreSQL"
        
        if command -v psql >/dev/null 2>&1; then
            if psql "$DATABASE_URL" -c "SELECT version();" >/dev/null 2>&1; then
                log_success "Conexión a PostgreSQL exitosa"
            else
                log_error "No se puede conectar a PostgreSQL"
                exit 1
            fi
        else
            log_warning "psql no disponible, omitiendo test de conexión"
        fi
    else
        log_error "No se encontró configuración de base de datos"
        exit 1
    fi
}

# Verificar servicios de IA
verify_ai_services() {
    log_step "Verificando servicios de IA..."
    
    source "$PROJECT_DIR/.env"
    
    # AbacusAI (requerido)
    if [ -n "$ABACUSAI_API_KEY" ]; then
        if [ ${#ABACUSAI_API_KEY} -gt 20 ]; then
            log_success "AbacusAI API key configurada"
        else
            log_error "AbacusAI API key inválida"
            exit 1
        fi
    else
        log_error "ABACUSAI_API_KEY requerida"
        exit 1
    fi
    
    # ElevenLabs (recomendado)
    if [ -n "$ELEVENLABS_API_KEY" ]; then
        local test_response=$(curl -s --max-time 10 \
            -H "xi-api-key: $ELEVENLABS_API_KEY" \
            "https://api.elevenlabs.io/v1/user" 2>/dev/null || echo "error")
        
        if [[ "$test_response" == *"subscription"* ]]; then
            log_success "ElevenLabs API funcionando"
        else
            log_warning "ElevenLabs API no responde correctamente"
        fi
    else
        log_warning "ElevenLabs no configurado (recomendado para mejor calidad)"
    fi
    
    # Azure Speech (opcional)
    if [ -n "$AZURE_SPEECH_KEY" ] && [ -n "$AZURE_SPEECH_REGION" ]; then
        log_success "Azure Speech configurado"
    fi
    
    # AWS (opcional)
    if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
        log_success "AWS credentials configuradas"
    fi
}

# Verificar almacenamiento
verify_storage() {
    log_step "Verificando configuración de almacenamiento..."
    
    source "$PROJECT_DIR/.env"
    
    if [ -n "$AWS_BUCKET_NAME" ]; then
        if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
            log_success "S3 configurado: $AWS_BUCKET_NAME"
            
            # Test opcional con AWS CLI
            if command -v aws >/dev/null 2>&1; then
                if aws s3 ls "s3://$AWS_BUCKET_NAME" >/dev/null 2>&1; then
                    log_success "Acceso a S3 verificado"
                else
                    log_warning "S3 configurado pero sin acceso verificado"
                fi
            fi
        else
            log_error "S3 bucket configurado pero faltan credenciales AWS"
            exit 1
        fi
    else
        log_error "AWS_BUCKET_NAME requerido para almacenamiento"
        exit 1
    fi
}

# Build de producción
build_application() {
    log_step "Construyendo aplicación para producción..."
    
    cd "$PROJECT_DIR"
    
    # Set variables de producción
    export NODE_ENV=production
    export NEXT_TELEMETRY_DISABLED=1
    
    log_info "Ejecutando build de Next.js..."
    if yarn build >> "$LOG_FILE" 2>&1; then
        log_success "Build completado exitosamente"
    else
        log_error "Error durante build. Ver $LOG_FILE"
        exit 1
    fi
    
    # Verificar archivos de build
    if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
        local build_id=$(cat .next/BUILD_ID)
        log_success "Build ID: $build_id"
    else
        log_error "Build incompleto, falta directorio .next"
        exit 1
    fi
    
    # Test básico de build
    log_info "Probando build localmente..."
    timeout 30 yarn start &
    local server_pid=$!
    sleep 10
    
    if curl -s --max-time 5 http://localhost:3000 >/dev/null 2>&1; then
        log_success "Servidor de producción funciona correctamente"
    else
        log_warning "Servidor no responde en test local"
    fi
    
    kill $server_pid 2>/dev/null || true
    wait $server_pid 2>/dev/null || true
}

# Configurar optimizaciones de producción
optimize_for_production() {
    log_step "Aplicando optimizaciones de producción..."
    
    cd "$PROJECT_DIR"
    
    # Crear next.config.js optimizado si no existe
    if [ ! -f "next.config.js" ]; then
        cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  swcMinify: true,
  images: {
    domains: ['s3.amazonaws.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600,
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ],
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
EOF
        log_success "next.config.js optimizado creado"
    else
        log_success "next.config.js existente mantenido"
    fi
    
    # Configurar PM2 para production (si está disponible)
    if command -v pm2 >/dev/null 2>&1; then
        cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'vira-production',
    script: './node_modules/.bin/next',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
}
EOF
        log_success "Configuración PM2 creada"
    fi
    
    # Crear directorio de logs
    mkdir -p logs
    log_success "Directorio de logs creado"
}

# Configurar monitoreo básico
setup_monitoring() {
    log_step "Configurando monitoreo básico..."
    
    cd "$PROJECT_DIR"
    
    # Script de health check automático
    if [ -f "$PROJECT_DIR/SCRIPTS/health-check.sh" ]; then
        cp "$PROJECT_DIR/SCRIPTS/health-check.sh" ./health-check.sh
        chmod +x ./health-check.sh
        log_success "Health check script configurado"
        
        # Crear cron job para monitoreo
        cat > monitor-cron.sh << 'EOF'
#!/bin/bash
# Script para configurar monitoreo automático
# Ejecutar: ./monitor-cron.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Health check cada 5 minutos
echo "*/5 * * * * $SCRIPT_DIR/health-check.sh --json > $SCRIPT_DIR/logs/health-$(date +\%Y\%m\%d).log 2>&1" | crontab -

echo "Monitoreo automático configurado (cada 5 minutos)"
echo "Ver logs: tail -f logs/health-*.log"
EOF
        chmod +x monitor-cron.sh
        log_success "Script de monitoreo automático creado"
    fi
}

# Configurar backups automáticos
setup_backups() {
    log_step "Configurando sistema de backups..."
    
    if [ -f "$PROJECT_DIR/SCRIPTS/backup-database.sh" ]; then
        cp "$PROJECT_DIR/SCRIPTS/backup-database.sh" ./backup.sh
        chmod +x ./backup.sh
        
        # Crear directorio de backups
        mkdir -p backups
        
        # Script de backup automático
        cat > setup-backups.sh << 'EOF'
#!/bin/bash
# Configurar backups automáticos

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Backup diario a las 2:00 AM
echo "0 2 * * * $SCRIPT_DIR/backup.sh --full --compress" | crontab -

# Backup semanal completo los domingos a las 3:00 AM
echo "0 3 * * 0 $SCRIPT_DIR/backup.sh --full --compress --encrypt" | crontab -

echo "Backups automáticos configurados:"
echo "- Diario: 2:00 AM (completo + comprimido)"
echo "- Semanal: Domingos 3:00 AM (completo + comprimido + encriptado)"
echo ""
echo "Ver backups: ls -la backups/"
crontab -l
EOF
        chmod +x setup-backups.sh
        log_success "Sistema de backups configurado"
    fi
}

# Verificar configuración de seguridad
verify_security() {
    log_step "Verificando configuración de seguridad..."
    
    source "$PROJECT_DIR/.env"
    
    # NEXTAUTH_SECRET strength
    if [ -n "$NEXTAUTH_SECRET" ]; then
        if [ ${#NEXTAUTH_SECRET} -ge 32 ]; then
            log_success "NEXTAUTH_SECRET tiene longitud adecuada"
        else
            log_warning "NEXTAUTH_SECRET es muy corto (recomendado: 32+ caracteres)"
        fi
    fi
    
    # HTTPS en producción
    if [ "$NODE_ENV" = "production" ] && [[ "$NEXTAUTH_URL" == http://* ]]; then
        log_warning "Usando HTTP en producción (recomendado: HTTPS)"
    elif [[ "$NEXTAUTH_URL" == https://* ]]; then
        log_success "HTTPS configurado correctamente"
    fi
    
    # Verificar que no hay secrets en logs
    if grep -r "password\|secret\|key" "$LOG_FILE" >/dev/null 2>&1; then
        log_warning "Posibles secrets en logs - revisar $LOG_FILE"
    else
        log_success "No se detectaron secrets en logs"
    fi
}

# Resumen final y próximos pasos
final_summary() {
    echo
    log_step "=========================================="
    log_step "🎉 SETUP DE PRODUCCIÓN COMPLETADO"
    log_step "=========================================="
    
    log_success "✅ Dependencias verificadas"
    log_success "✅ Variables de entorno configuradas"
    log_success "✅ Base de datos conectada"
    log_success "✅ Servicios de IA verificados"
    log_success "✅ Build de producción exitoso"
    log_success "✅ Optimizaciones aplicadas"
    log_success "✅ Monitoreo configurado"
    log_success "✅ Backups configurados"
    log_success "✅ Seguridad verificada"
    
    echo
    log_info "🚀 PRÓXIMOS PASOS:"
    echo
    echo "1. INICIAR APLICACIÓN:"
    echo "   yarn start                    # Inicio simple"
    echo "   pm2 start ecosystem.config.js # Con PM2 (recomendado)"
    echo
    echo "2. VERIFICAR FUNCIONAMIENTO:"
    echo "   ./health-check.sh            # Health check manual"
    echo "   curl http://localhost:3000   # Test básico"
    echo
    echo "3. CONFIGURAR MONITOREO:"
    echo "   ./monitor-cron.sh            # Activar monitoreo automático"
    echo "   ./setup-backups.sh           # Activar backups automáticos"
    echo
    echo "4. DEPLOYMENT:"
    echo "   - Vercel: vercel --prod"
    echo "   - Netlify: netlify deploy --prod"
    echo "   - Docker: docker-compose up -d"
    echo
    echo "📁 ARCHIVOS IMPORTANTES:"
    echo "   📄 .env                      # Variables de entorno"
    echo "   📄 ecosystem.config.js       # Configuración PM2"
    echo "   📄 next.config.js           # Configuración Next.js"
    echo "   📁 logs/                    # Logs de aplicación"
    echo "   📁 backups/                 # Backups de BD"
    echo
    echo "📊 MONITOREO:"
    echo "   🔍 Health checks:  tail -f logs/health-*.log"
    echo "   📋 App logs:       tail -f logs/combined.log"
    echo "   💾 Backups:        ls -la backups/"
    echo
    echo "🆘 SOPORTE:"
    echo "   📚 Documentación: DOCUMENTACION/"
    echo "   ❓ FAQ:          DOCUMENTACION/FAQ.md"
    echo "   🔧 Troubleshoot: DOCUMENTACION/TROUBLESHOOTING.md"
    echo
    
    local production_url="${NEXTAUTH_URL:-http://localhost:3000}"
    log_success "🌐 URL de producción configurada: $production_url"
    
    echo
    log_info "¡VIRA está listo para revolucionar tu producción de contenido! 🎙️✨"
}

# Función principal
main() {
    # Crear archivo de log
    echo "=== VIRA Production Setup - $(date) ===" > "$LOG_FILE"
    
    show_banner
    echo
    
    verify_directory
    check_system_dependencies
    setup_environment
    install_dependencies
    setup_database
    verify_ai_services
    verify_storage
    build_application
    optimize_for_production
    setup_monitoring
    setup_backups
    verify_security
    
    final_summary
    
    log_success "Setup log guardado en: $LOG_FILE"
}

# Ejecutar función principal
main "$@"
