
#!/bin/bash

# ===================================================================
# HEALTH CHECK SCRIPT PARA VIRA
# ===================================================================
# Este script verifica el estado de todos los componentes de VIRA:
# - Aplicación web
# - Base de datos  
# - APIs externas
# - Servicios de almacenamiento
# - Performance general
# 
# Uso:
#   ./health-check.sh
#   ./health-check.sh --verbose
#   ./health-check.sh --json
# ===================================================================

set -e

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VERBOSE=false
JSON_OUTPUT=false
HEALTH_SCORE=0
MAX_SCORE=100

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Arrays para resultados
declare -a CHECKS_PASSED=()
declare -a CHECKS_FAILED=()
declare -a CHECKS_WARNING=()

# Funciones de log
log_info() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${GREEN}[✓]${NC} $1"
    fi
    CHECKS_PASSED+=("$1")
}

log_warning() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${YELLOW}[⚠]${NC} $1"
    fi
    CHECKS_WARNING+=("$1")
}

log_error() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${RED}[✗]${NC} $1"
    fi
    CHECKS_FAILED+=("$1")
}

log_verbose() {
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
        echo -e "${PURPLE}[DEBUG]${NC} $1"
    fi
}

# Parse argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --json|-j)
            JSON_OUTPUT=true
            shift
            ;;
        --help|-h)
            cat << EOF
VIRA Health Check Script

Uso: $0 [OPCIONES]

OPCIONES:
    --verbose, -v    Output detallado
    --json, -j      Output en formato JSON
    --help, -h      Mostrar esta ayuda

EJEMPLOS:
    $0              # Health check básico
    $0 --verbose    # Con información detallada
    $0 --json       # Output para scripts/monitoreo
    
EOF
            exit 0
            ;;
        *)
            log_error "Opción desconocida: $1"
            exit 1
            ;;
    esac
done

# Cargar variables de entorno
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
    log_verbose "Variables de entorno cargadas desde .env"
fi

# Función para hacer requests HTTP con timeout
http_request() {
    local url=$1
    local timeout=${2:-10}
    local headers=${3:-""}
    
    if [ -n "$headers" ]; then
        curl -s -w "%{http_code},%{time_total}" -m "$timeout" -H "$headers" "$url" 2>/dev/null || echo "000,999"
    else
        curl -s -w "%{http_code},%{time_total}" -m "$timeout" "$url" 2>/dev/null || echo "000,999"
    fi
}

# 1. VERIFICAR APLICACIÓN WEB
check_web_application() {
    log_info "Verificando aplicación web..."
    
    local app_url="${NEXTAUTH_URL:-http://localhost:3000}"
    local result=$(http_request "$app_url" 10)
    local status_code=$(echo "$result" | cut -d',' -f1)
    local response_time=$(echo "$result" | cut -d',' -f2)
    
    if [ "$status_code" = "200" ] || [ "$status_code" = "302" ]; then
        log_success "Aplicación web respondiendo (${status_code}) en ${response_time}s"
        HEALTH_SCORE=$((HEALTH_SCORE + 20))
    else
        log_error "Aplicación web no responde (HTTP $status_code)"
        return 1
    fi
    
    # Verificar endpoints críticos
    local health_result=$(http_request "$app_url/api/health" 5)
    local health_status=$(echo "$health_result" | cut -d',' -f1)
    
    if [ "$health_status" = "200" ]; then
        log_success "Health endpoint funcionando"
        HEALTH_SCORE=$((HEALTH_SCORE + 10))
    else
        log_warning "Health endpoint no disponible"
    fi
    
    log_verbose "App URL: $app_url"
    log_verbose "Response time: ${response_time}s"
}

# 2. VERIFICAR BASE DE DATOS
check_database() {
    log_info "Verificando conexión a base de datos..."
    
    if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        # Supabase
        local supabase_health=$(http_request "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" 5 "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY")
        local status_code=$(echo "$supabase_health" | cut -d',' -f1)
        
        if [ "$status_code" = "200" ] || [ "$status_code" = "404" ]; then
            log_success "Base de datos Supabase accesible"
            HEALTH_SCORE=$((HEALTH_SCORE + 15))
            
            # Test query simple
            local query_result=$(http_request "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/users?limit=1" 5 "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY")
            local query_status=$(echo "$query_result" | cut -d',' -f1)
            
            if [ "$query_status" = "200" ] || [ "$query_status" = "401" ]; then
                log_success "Queries de base de datos funcionando"
                HEALTH_SCORE=$((HEALTH_SCORE + 5))
            else
                log_warning "Queries de base de datos con problemas"
            fi
        else
            log_error "Base de datos Supabase no accesible"
        fi
        
        log_verbose "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
        
    elif [ -n "$DATABASE_URL" ]; then
        # PostgreSQL local
        if command -v psql >/dev/null 2>&1; then
            if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
                log_success "Base de datos PostgreSQL accesible"
                HEALTH_SCORE=$((HEALTH_SCORE + 20))
            else
                log_error "Base de datos PostgreSQL no accesible"
            fi
        else
            log_warning "psql no disponible para verificar PostgreSQL"
        fi
        
        log_verbose "Database URL configurada"
    else
        log_error "No hay configuración de base de datos"
    fi
}

# 3. VERIFICAR SERVICIOS DE IA
check_ai_services() {
    log_info "Verificando servicios de IA..."
    
    local ai_score=0
    local total_ai_services=0
    
    # AbacusAI
    if [ -n "$ABACUSAI_API_KEY" ]; then
        total_ai_services=$((total_ai_services + 1))
        # AbacusAI no tiene endpoint público de health, pero verificamos la key
        if [ ${#ABACUSAI_API_KEY} -gt 20 ]; then
            log_success "AbacusAI API key configurada"
            ai_score=$((ai_score + 1))
        else
            log_warning "AbacusAI API key parece inválida"
        fi
        log_verbose "AbacusAI key length: ${#ABACUSAI_API_KEY}"
    fi
    
    # ElevenLabs
    if [ -n "$ELEVENLABS_API_KEY" ]; then
        total_ai_services=$((total_ai_services + 1))
        local elevenlabs_result=$(http_request "https://api.elevenlabs.io/v1/user" 5 "xi-api-key: $ELEVENLABS_API_KEY")
        local status_code=$(echo "$elevenlabs_result" | cut -d',' -f1)
        
        if [ "$status_code" = "200" ]; then
            log_success "ElevenLabs API funcionando"
            ai_score=$((ai_score + 1))
        else
            log_warning "ElevenLabs API no responde (HTTP $status_code)"
        fi
        log_verbose "ElevenLabs status: $status_code"
    fi
    
    # OpenAI (opcional)
    if [ -n "$OPENAI_API_KEY" ]; then
        total_ai_services=$((total_ai_services + 1))
        local openai_result=$(http_request "https://api.openai.com/v1/models" 5 "Authorization: Bearer $OPENAI_API_KEY")
        local status_code=$(echo "$openai_result" | cut -d',' -f1)
        
        if [ "$status_code" = "200" ]; then
            log_success "OpenAI API funcionando"
            ai_score=$((ai_score + 1))
        else
            log_warning "OpenAI API no responde (HTTP $status_code)"
        fi
    fi
    
    # Azure Speech (opcional)
    if [ -n "$AZURE_SPEECH_KEY" ]; then
        total_ai_services=$((total_ai_services + 1))
        if [ ${#AZURE_SPEECH_KEY} -gt 20 ] && [ -n "$AZURE_SPEECH_REGION" ]; then
            log_success "Azure Speech configurado"
            ai_score=$((ai_score + 1))
        else
            log_warning "Azure Speech configuración incompleta"
        fi
    fi
    
    # AWS Polly (opcional)
    if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
        total_ai_services=$((total_ai_services + 1))
        if [ ${#AWS_ACCESS_KEY_ID} -gt 15 ] && [ ${#AWS_SECRET_ACCESS_KEY} -gt 30 ]; then
            log_success "AWS credentials configuradas"
            ai_score=$((ai_score + 1))
        else
            log_warning "AWS credentials parecen inválidas"
        fi
    fi
    
    # Calcular score proporcional
    if [ $total_ai_services -gt 0 ]; then
        local ai_percentage=$((ai_score * 100 / total_ai_services))
        HEALTH_SCORE=$((HEALTH_SCORE + ai_percentage * 20 / 100))
        log_verbose "AI Services score: $ai_score/$total_ai_services ($ai_percentage%)"
    else
        log_error "No hay servicios de IA configurados"
    fi
}

# 4. VERIFICAR ALMACENAMIENTO
check_storage() {
    log_info "Verificando almacenamiento..."
    
    if [ -n "$AWS_BUCKET_NAME" ] && [ -n "$AWS_ACCESS_KEY_ID" ]; then
        # Verificar acceso a S3
        if command -v aws >/dev/null 2>&1; then
            if aws s3 ls "s3://$AWS_BUCKET_NAME" >/dev/null 2>&1; then
                log_success "S3 bucket accesible"
                HEALTH_SCORE=$((HEALTH_SCORE + 10))
            else
                log_warning "S3 bucket no accesible o sin permisos"
            fi
        else
            # Sin AWS CLI, verificar configuración básica
            if [ ${#AWS_ACCESS_KEY_ID} -gt 15 ] && [ ${#AWS_SECRET_ACCESS_KEY} -gt 30 ]; then
                log_success "AWS credentials configuradas para S3"
                HEALTH_SCORE=$((HEALTH_SCORE + 5))
            else
                log_warning "AWS credentials inválidas"
            fi
        fi
        
        log_verbose "S3 Bucket: $AWS_BUCKET_NAME"
        log_verbose "AWS Region: ${AWS_REGION:-us-east-1}"
    else
        log_warning "Almacenamiento S3 no configurado"
    fi
}

# 5. VERIFICAR INTEGRACIONES SOCIALES
check_social_integrations() {
    log_info "Verificando integraciones sociales..."
    
    local integrations_count=0
    local working_integrations=0
    
    # Twitter/X
    if [ -n "$TWITTER_BEARER_TOKEN" ]; then
        integrations_count=$((integrations_count + 1))
        local twitter_result=$(http_request "https://api.twitter.com/2/users/me" 5 "Authorization: Bearer $TWITTER_BEARER_TOKEN")
        local status_code=$(echo "$twitter_result" | cut -d',' -f1)
        
        if [ "$status_code" = "200" ]; then
            log_success "Twitter API funcionando"
            working_integrations=$((working_integrations + 1))
        else
            log_warning "Twitter API no responde (HTTP $status_code)"
        fi
    fi
    
    # Facebook
    if [ -n "$FACEBOOK_APP_ID" ] && [ -n "$FACEBOOK_APP_SECRET" ]; then
        integrations_count=$((integrations_count + 1))
        if [ ${#FACEBOOK_APP_ID} -gt 10 ] && [ ${#FACEBOOK_APP_SECRET} -gt 20 ]; then
            log_success "Facebook credentials configuradas"
            working_integrations=$((working_integrations + 1))
        else
            log_warning "Facebook credentials inválidas"
        fi
    fi
    
    # Instagram
    if [ -n "$INSTAGRAM_APP_ID" ] && [ -n "$INSTAGRAM_APP_SECRET" ]; then
        integrations_count=$((integrations_count + 1))
        log_success "Instagram credentials configuradas"
        working_integrations=$((working_integrations + 1))
    fi
    
    # Spotify
    if [ -n "$SPOTIFY_CLIENT_ID" ] && [ -n "$SPOTIFY_CLIENT_SECRET" ]; then
        integrations_count=$((integrations_count + 1))
        log_success "Spotify credentials configuradas"
        working_integrations=$((working_integrations + 1))
    fi
    
    if [ $integrations_count -gt 0 ]; then
        local integration_percentage=$((working_integrations * 100 / integrations_count))
        HEALTH_SCORE=$((HEALTH_SCORE + integration_percentage * 10 / 100))
        log_verbose "Social integrations: $working_integrations/$integrations_count ($integration_percentage%)"
    else
        log_warning "No hay integraciones sociales configuradas"
    fi
}

# 6. VERIFICAR PAGOS
check_payment_system() {
    log_info "Verificando sistema de pagos..."
    
    if [ -n "$MERCADOPAGO_ACCESS_TOKEN" ]; then
        local mp_result=$(http_request "https://api.mercadopago.com/users/me" 5 "Authorization: Bearer $MERCADOPAGO_ACCESS_TOKEN")
        local status_code=$(echo "$mp_result" | cut -d',' -f1)
        
        if [ "$status_code" = "200" ]; then
            log_success "MercadoPago API funcionando"
            HEALTH_SCORE=$((HEALTH_SCORE + 5))
            
            # Verificar ambiente
            if [ "$MERCADOPAGO_ENVIRONMENT" = "production" ]; then
                log_success "MercadoPago en modo PRODUCCIÓN"
            else
                log_warning "MercadoPago en modo SANDBOX"
            fi
        else
            log_warning "MercadoPago API no responde (HTTP $status_code)"
        fi
        
        log_verbose "MercadoPago environment: ${MERCADOPAGO_ENVIRONMENT:-sandbox}"
    else
        log_warning "Sistema de pagos no configurado"
    fi
}

# 7. VERIFICAR PERFORMANCE DEL SISTEMA
check_system_performance() {
    log_info "Verificando performance del sistema..."
    
    # Verificar espacio en disco
    local disk_usage=$(df -h "$PROJECT_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 80 ]; then
        log_success "Espacio en disco OK (${disk_usage}% usado)"
        HEALTH_SCORE=$((HEALTH_SCORE + 5))
    elif [ "$disk_usage" -lt 90 ]; then
        log_warning "Espacio en disco limitado (${disk_usage}% usado)"
    else
        log_error "Espacio en disco crítico (${disk_usage}% usado)"
    fi
    
    # Verificar memoria (si está disponible)
    if command -v free >/dev/null 2>&1; then
        local mem_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
        if (( $(echo "$mem_usage < 80" | bc -l) )); then
            log_success "Uso de memoria OK (${mem_usage}%)"
        else
            log_warning "Uso de memoria alto (${mem_usage}%)"
        fi
        log_verbose "Memory usage: ${mem_usage}%"
    fi
    
    # Verificar carga del sistema (si está disponible)
    if [ -f /proc/loadavg ]; then
        local load_avg=$(cat /proc/loadavg | cut -d' ' -f1)
        local cpu_count=$(nproc 2>/dev/null || echo "1")
        local load_percentage=$(echo "scale=1; $load_avg * 100 / $cpu_count" | bc 2>/dev/null || echo "0")
        
        if (( $(echo "$load_percentage < 70" | bc -l 2>/dev/null || echo "1") )); then
            log_success "Carga del sistema OK (${load_percentage}%)"
        else
            log_warning "Carga del sistema alta (${load_percentage}%)"
        fi
        log_verbose "Load average: $load_avg ($load_percentage%)"
    fi
}

# 8. VERIFICAR CONFIGURACIÓN
check_configuration() {
    log_info "Verificando configuración..."
    
    local config_issues=0
    
    # Verificar variables críticas
    critical_vars=(
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
    )
    
    for var in "${critical_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Variable crítica no configurada: $var"
            config_issues=$((config_issues + 1))
        else
            log_verbose "$var configurada"
        fi
    done
    
    # Verificar longitud de secrets
    if [ -n "$NEXTAUTH_SECRET" ] && [ ${#NEXTAUTH_SECRET} -lt 32 ]; then
        log_warning "NEXTAUTH_SECRET muy corto (recomendado: 32+ caracteres)"
        config_issues=$((config_issues + 1))
    fi
    
    # Verificar formato de URLs
    if [ -n "$NEXTAUTH_URL" ] && [[ ! "$NEXTAUTH_URL" =~ ^https?:// ]]; then
        log_error "NEXTAUTH_URL debe incluir protocolo (http:// o https://)"
        config_issues=$((config_issues + 1))
    fi
    
    # Verificar environment
    if [ "$NODE_ENV" = "production" ]; then
        log_success "Ejecutándose en modo PRODUCCIÓN"
        if [[ "$NEXTAUTH_URL" == *"localhost"* ]]; then
            log_warning "URL localhost en producción"
            config_issues=$((config_issues + 1))
        fi
    else
        log_warning "Ejecutándose en modo DESARROLLO"
    fi
    
    if [ $config_issues -eq 0 ]; then
        log_success "Configuración válida"
        HEALTH_SCORE=$((HEALTH_SCORE + 10))
    else
        log_warning "Encontrados $config_issues problemas de configuración"
        HEALTH_SCORE=$((HEALTH_SCORE + 5))
    fi
}

# Función para generar reporte JSON
generate_json_report() {
    local timestamp=$(date -Iseconds)
    local status="healthy"
    
    if [ $HEALTH_SCORE -lt 50 ]; then
        status="critical"
    elif [ $HEALTH_SCORE -lt 70 ]; then
        status="warning"
    fi
    
    cat << EOF
{
  "timestamp": "$timestamp",
  "overall_status": "$status",
  "health_score": $HEALTH_SCORE,
  "max_score": $MAX_SCORE,
  "checks_passed": $(printf '%s\n' "${CHECKS_PASSED[@]}" | jq -R . | jq -s .),
  "checks_failed": $(printf '%s\n' "${CHECKS_FAILED[@]}" | jq -R . | jq -s .),
  "checks_warning": $(printf '%s\n' "${CHECKS_WARNING[@]}" | jq -R . | jq -s .),
  "environment": {
    "node_env": "${NODE_ENV:-development}",
    "nextauth_url": "${NEXTAUTH_URL:-not_set}",
    "has_database": $([ -n "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -n "$DATABASE_URL" ] && echo "true" || echo "false"),
    "has_ai_services": $([ -n "$ABACUSAI_API_KEY" ] || [ -n "$ELEVENLABS_API_KEY" ] && echo "true" || echo "false")
  }
}
EOF
}

# Función para generar reporte de texto
generate_text_report() {
    echo
    echo "=== RESUMEN DE HEALTH CHECK ==="
    echo "Timestamp: $(date)"
    echo "Health Score: $HEALTH_SCORE/$MAX_SCORE"
    
    local status_emoji="🔴"
    local status_text="CRÍTICO"
    
    if [ $HEALTH_SCORE -ge 80 ]; then
        status_emoji="🟢"
        status_text="SALUDABLE"
    elif [ $HEALTH_SCORE -ge 60 ]; then
        status_emoji="🟡"
        status_text="ADVERTENCIA"
    fi
    
    echo "Estado General: $status_emoji $status_text"
    echo
    
    if [ ${#CHECKS_PASSED[@]} -gt 0 ]; then
        echo "✅ CHECKS EXITOSOS (${#CHECKS_PASSED[@]}):"
        printf '   • %s\n' "${CHECKS_PASSED[@]}"
        echo
    fi
    
    if [ ${#CHECKS_WARNING[@]} -gt 0 ]; then
        echo "⚠️  ADVERTENCIAS (${#CHECKS_WARNING[@]}):"
        printf '   • %s\n' "${CHECKS_WARNING[@]}"
        echo
    fi
    
    if [ ${#CHECKS_FAILED[@]} -gt 0 ]; then
        echo "❌ CHECKS FALLIDOS (${#CHECKS_FAILED[@]}):"
        printf '   • %s\n' "${CHECKS_FAILED[@]}"
        echo
    fi
    
    echo "=== RECOMENDACIONES ==="
    if [ $HEALTH_SCORE -lt 50 ]; then
        echo "🚨 Sistema en estado crítico:"
        echo "   • Revisar logs de aplicación inmediatamente"
        echo "   • Verificar servicios básicos (DB, APIs)"
        echo "   • Considerar reinicio de servicios"
    elif [ $HEALTH_SCORE -lt 70 ]; then
        echo "⚠️  Sistema necesita atención:"
        echo "   • Configurar servicios faltantes"
        echo "   • Revisar advertencias mostradas"
        echo "   • Monitorear performance"
    else
        echo "✅ Sistema funcionando correctamente"
        echo "   • Mantener monitoreo regular"
        echo "   • Revisar advertencias menores"
    fi
    
    echo
    echo "📊 Próximo health check recomendado:"
    if [ $HEALTH_SCORE -lt 50 ]; then
        echo "   • En 15 minutos (sistema crítico)"
    elif [ $HEALTH_SCORE -lt 70 ]; then
        echo "   • En 1 hora (problemas detectados)"
    else
        echo "   • En 24 horas (sistema estable)"
    fi
}

# Función principal
main() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo "🏥 VIRA Health Check - $(date)"
        echo "=========================================="
    fi
    
    # Ejecutar todos los checks
    check_web_application || true
    check_database || true
    check_ai_services || true
    check_storage || true
    check_social_integrations || true
    check_payment_system || true
    check_system_performance || true
    check_configuration || true
    
    # Generar reporte final
    if [ "$JSON_OUTPUT" = true ]; then
        generate_json_report
    else
        generate_text_report
    fi
    
    # Exit code basado en health score
    if [ $HEALTH_SCORE -lt 50 ]; then
        exit 2  # Critical
    elif [ $HEALTH_SCORE -lt 70 ]; then
        exit 1  # Warning  
    else
        exit 0  # OK
    fi
}

# Verificar dependencias
if [ "$JSON_OUTPUT" = true ] && ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq requerido para output JSON"
    echo "Instalar con: sudo apt-get install jq (Ubuntu) o brew install jq (macOS)"
    exit 1
fi

# Ejecutar función principal
main "$@"

