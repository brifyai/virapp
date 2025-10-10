
#!/bin/bash

# ===================================================================
# SCRIPT DE BACKUP AUTOMÁTICO PARA BASE DE DATOS VIRA
# ===================================================================
# Este script crea backups completos de la base de datos VIRA
# Puede ejecutarse manualmente o programarse con cron
# 
# Uso:
#   ./backup-database.sh
#   ./backup-database.sh --full  (backup completo con datos)
#   ./backup-database.sh --schema (solo estructura)
# ===================================================================

set -e  # Exit on any error

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para mostrar ayuda
show_help() {
    cat << EOF
VIRA Database Backup Script

Uso:
    $0 [OPCIONES]

OPCIONES:
    --help          Mostrar esta ayuda
    --full          Backup completo (estructura + datos) [DEFAULT]
    --schema        Solo estructura de base de datos
    --data          Solo datos (requiere estructura existente)
    --supabase      Backup específico para Supabase
    --local         Backup para PostgreSQL local
    --compress      Comprimir backup con gzip
    --encrypt       Encriptar backup (requiere gpg)

EJEMPLOS:
    $0                          # Backup completo por defecto
    $0 --schema --compress      # Solo estructura comprimida
    $0 --supabase --encrypt     # Backup Supabase encriptado
    
VARIABLES DE ENTORNO:
    DATABASE_URL                # URL completa de conexión
    SUPABASE_DB_PASSWORD       # Password específico Supabase
    BACKUP_ENCRYPTION_KEY      # Key para encriptación GPG
    
EOF
}

# Parse argumentos
BACKUP_TYPE="full"
COMPRESS=false
ENCRYPT=false
DB_TYPE="auto"

while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            exit 0
            ;;
        --full)
            BACKUP_TYPE="full"
            shift
            ;;
        --schema)
            BACKUP_TYPE="schema"
            shift
            ;;
        --data)
            BACKUP_TYPE="data"
            shift
            ;;
        --supabase)
            DB_TYPE="supabase"
            shift
            ;;
        --local)
            DB_TYPE="local"
            shift
            ;;
        --compress)
            COMPRESS=true
            shift
            ;;
        --encrypt)
            ENCRYPT=true
            shift
            ;;
        *)
            log_error "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Cargar variables de entorno
if [ -f "$PROJECT_DIR/.env" ]; then
    log_info "Cargando variables de entorno desde .env"
    source "$PROJECT_DIR/.env"
else
    log_warning "Archivo .env no encontrado, usando variables del sistema"
fi

# Detectar tipo de base de datos automáticamente
if [ "$DB_TYPE" = "auto" ]; then
    if [ ! -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        DB_TYPE="supabase"
        log_info "Detectado Supabase automáticamente"
    elif [ ! -z "$DATABASE_URL" ]; then
        DB_TYPE="local"
        log_info "Detectado PostgreSQL local automáticamente"
    else
        log_error "No se pudo detectar tipo de base de datos. Usa --supabase o --local"
        exit 1
    fi
fi

# Función para backup de Supabase
backup_supabase() {
    log_info "Iniciando backup de Supabase..."
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        log_error "NEXT_PUBLIC_SUPABASE_URL no configurada"
        exit 1
    fi
    
    # Extraer información de la URL de Supabase
    SUPABASE_PROJECT_ID=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's/https:\/\/([^.]+)\.supabase\.co/\1/')
    SUPABASE_HOST="db.${SUPABASE_PROJECT_ID}.supabase.co"
    SUPABASE_PORT="5432"
    SUPABASE_DB="postgres"
    SUPABASE_USER="postgres"
    
    if [ -z "$SUPABASE_DB_PASSWORD" ]; then
        log_error "SUPABASE_DB_PASSWORD no configurada"
        log_info "Obtén la password desde Supabase Dashboard > Settings > Database"
        exit 1
    fi
    
    # Construir comando pg_dump
    PGPASSWORD="$SUPABASE_DB_PASSWORD"
    export PGPASSWORD
    
    local backup_file="$BACKUP_DIR/vira_supabase_${BACKUP_TYPE}_${DATE}.sql"
    
    case $BACKUP_TYPE in
        "full")
            log_info "Creando backup completo (estructura + datos)..."
            pg_dump -h "$SUPABASE_HOST" -p "$SUPABASE_PORT" -U "$SUPABASE_USER" -d "$SUPABASE_DB" \
                --clean --create --if-exists \
                --schema=public \
                > "$backup_file"
            ;;
        "schema")
            log_info "Creando backup de estructura solamente..."
            pg_dump -h "$SUPABASE_HOST" -p "$SUPABASE_PORT" -U "$SUPABASE_USER" -d "$SUPABASE_DB" \
                --schema-only --clean --create --if-exists \
                --schema=public \
                > "$backup_file"
            ;;
        "data")
            log_info "Creando backup de datos solamente..."
            pg_dump -h "$SUPABASE_HOST" -p "$SUPABASE_PORT" -U "$SUPABASE_USER" -d "$SUPABASE_DB" \
                --data-only \
                --schema=public \
                > "$backup_file"
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        log_success "Backup de Supabase completado: $backup_file"
        echo "$backup_file"
    else
        log_error "Error creando backup de Supabase"
        exit 1
    fi
}

# Función para backup local
backup_local() {
    log_info "Iniciando backup de PostgreSQL local..."
    
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL no configurada"
        exit 1
    fi
    
    local backup_file="$BACKUP_DIR/vira_local_${BACKUP_TYPE}_${DATE}.sql"
    
    case $BACKUP_TYPE in
        "full")
            log_info "Creando backup completo (estructura + datos)..."
            pg_dump "$DATABASE_URL" \
                --clean --create --if-exists \
                > "$backup_file"
            ;;
        "schema")
            log_info "Creando backup de estructura solamente..."
            pg_dump "$DATABASE_URL" \
                --schema-only --clean --create --if-exists \
                > "$backup_file"
            ;;
        "data")
            log_info "Creando backup de datos solamente..."
            pg_dump "$DATABASE_URL" \
                --data-only \
                > "$backup_file"
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        log_success "Backup local completado: $backup_file"
        echo "$backup_file"
    else
        log_error "Error creando backup local"
        exit 1
    fi
}

# Función para comprimir backup
compress_backup() {
    local backup_file=$1
    log_info "Comprimiendo backup..."
    
    gzip "$backup_file"
    local compressed_file="${backup_file}.gz"
    
    if [ $? -eq 0 ]; then
        log_success "Backup comprimido: $compressed_file"
        echo "$compressed_file"
    else
        log_error "Error comprimiendo backup"
        exit 1
    fi
}

# Función para encriptar backup
encrypt_backup() {
    local backup_file=$1
    log_info "Encriptando backup..."
    
    if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
        log_error "BACKUP_ENCRYPTION_KEY no configurada"
        log_info "Genera una key con: gpg --gen-key"
        exit 1
    fi
    
    gpg --trust-model always --encrypt \
        --recipient "$BACKUP_ENCRYPTION_KEY" \
        --cipher-algo AES256 \
        --output "${backup_file}.gpg" \
        "$backup_file"
    
    if [ $? -eq 0 ]; then
        rm "$backup_file"  # Eliminar archivo sin encriptar
        log_success "Backup encriptado: ${backup_file}.gpg"
        echo "${backup_file}.gpg"
    else
        log_error "Error encriptando backup"
        exit 1
    fi
}

# Función para limpiar backups antiguos
cleanup_old_backups() {
    log_info "Limpiando backups más antiguos que $RETENTION_DAYS días..."
    
    find "$BACKUP_DIR" -name "vira_*.sql*" -mtime +$RETENTION_DAYS -delete
    
    if [ $? -eq 0 ]; then
        log_success "Limpieza de backups antiguos completada"
    else
        log_warning "Error durante limpieza de backups antiguos"
    fi
}

# Función para verificar backup
verify_backup() {
    local backup_file=$1
    log_info "Verificando integridad del backup..."
    
    if [[ "$backup_file" == *.gz ]]; then
        gzip -t "$backup_file"
    elif [[ "$backup_file" == *.gpg ]]; then
        gpg --list-packets "$backup_file" > /dev/null 2>&1
    else
        head -10 "$backup_file" | grep -q "PostgreSQL database dump" 2>/dev/null
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Backup verificado correctamente"
    else
        log_error "Backup parece estar corrupto"
        exit 1
    fi
}

# Función principal
main() {
    log_info "=== VIRA Database Backup Script ==="
    log_info "Fecha: $(date)"
    log_info "Tipo: $BACKUP_TYPE"
    log_info "Base de datos: $DB_TYPE"
    log_info "Comprimir: $COMPRESS"
    log_info "Encriptar: $ENCRYPT"
    echo
    
    # Verificar dependencias
    command -v pg_dump >/dev/null 2>&1 || {
        log_error "pg_dump no está instalado. Instala PostgreSQL client:"
        log_info "Ubuntu/Debian: sudo apt-get install postgresql-client"
        log_info "macOS: brew install postgresql"
        exit 1
    }
    
    if [ "$ENCRYPT" = true ]; then
        command -v gpg >/dev/null 2>&1 || {
            log_error "gpg no está instalado. Instala GnuPG:"
            log_info "Ubuntu/Debian: sudo apt-get install gnupg"
            log_info "macOS: brew install gnupg"
            exit 1
        }
    fi
    
    # Ejecutar backup según tipo
    if [ "$DB_TYPE" = "supabase" ]; then
        backup_file=$(backup_supabase)
    else
        backup_file=$(backup_local)
    fi
    
    # Procesar backup según opciones
    if [ "$COMPRESS" = true ]; then
        backup_file=$(compress_backup "$backup_file")
    fi
    
    if [ "$ENCRYPT" = true ]; then
        backup_file=$(encrypt_backup "$backup_file")
    fi
    
    # Verificar backup final
    verify_backup "$backup_file"
    
    # Información del backup
    backup_size=$(du -h "$backup_file" | cut -f1)
    log_success "=== BACKUP COMPLETADO ==="
    log_info "Archivo: $backup_file"
    log_info "Tamaño: $backup_size"
    log_info "Fecha: $(date)"
    
    # Limpiar backups antiguos
    cleanup_old_backups
    
    # Instrucciones de restore
    echo
    log_info "=== INSTRUCCIONES DE RESTORE ==="
    if [[ "$backup_file" == *.gpg ]]; then
        log_info "1. Desencriptar: gpg --decrypt $backup_file > backup.sql"
        log_info "2. Restore: psql DATABASE_URL < backup.sql"
    elif [[ "$backup_file" == *.gz ]]; then
        log_info "1. Descomprimir: gunzip $backup_file"
        log_info "2. Restore: psql DATABASE_URL < ${backup_file%.gz}"
    else
        log_info "Restore: psql DATABASE_URL < $backup_file"
    fi
    
    echo
    log_success "¡Backup completado exitosamente!"
}

# Ejecutar función principal
main "$@"

# Script de ejemplo para cron job
cat > "$BACKUP_DIR/setup_cron.sh" << 'EOF'
#!/bin/bash
# Script para configurar backup automático en cron

# Backup diario a las 2:00 AM
echo "0 2 * * * /ruta/completa/a/backup-database.sh --full --compress" | crontab -

# Backup de solo schema semanal (domingos a las 3:00 AM)  
echo "0 3 * * 0 /ruta/completa/a/backup-database.sh --schema --compress" | crontab -

# Ver cron jobs actuales
crontab -l

echo "Cron jobs configurados para backups automáticos"
EOF

chmod +x "$BACKUP_DIR/setup_cron.sh"

log_info "Ejecuta $BACKUP_DIR/setup_cron.sh para configurar backups automáticos"

