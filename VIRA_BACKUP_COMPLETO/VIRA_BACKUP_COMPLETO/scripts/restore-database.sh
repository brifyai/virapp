
#!/bin/bash

# ===================================================================
# SCRIPT DE RESTORE DE BASE DE DATOS PARA VIRA
# ===================================================================
# Este script restaura backups de la base de datos VIRA
# Soporta backups comprimidos, encriptados y diferentes formatos
#
# Uso:
#   ./restore-database.sh backup_file.sql
#   ./restore-database.sh backup_file.sql.gz --decompress
#   ./restore-database.sh backup_file.sql.gpg --decrypt
# ===================================================================

set -e

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEMP_DIR="/tmp/vira_restore_$$"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Función de ayuda
show_help() {
    cat << EOF
VIRA Database Restore Script

Uso:
    $0 BACKUP_FILE [OPCIONES]

OPCIONES:
    --help              Mostrar esta ayuda
    --decompress        Descomprimir archivo .gz automáticamente
    --decrypt           Desencriptar archivo .gpg automáticamente
    --supabase          Forzar restore a Supabase
    --local             Forzar restore a PostgreSQL local
    --create-db         Crear base de datos si no existe
    --drop-existing     Eliminar datos existentes antes de restore
    --dry-run           Mostrar comandos sin ejecutar

EJEMPLOS:
    $0 backup.sql                           # Restore básico
    $0 backup.sql.gz --decompress          # Restore archivo comprimido
    $0 backup.sql.gpg --decrypt            # Restore archivo encriptado
    $0 backup.sql --supabase --drop-existing   # Restore limpio a Supabase

VARIABLES DE ENTORNO:
    DATABASE_URL                    # URL para PostgreSQL local
    NEXT_PUBLIC_SUPABASE_URL       # URL de Supabase
    SUPABASE_SERVICE_ROLE_KEY      # Service role key para admin
    BACKUP_ENCRYPTION_KEY          # Key para desencriptación GPG

EOF
}

# Función de cleanup
cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
        log_info "Archivos temporales limpiados"
    fi
}

# Trap para cleanup
trap cleanup EXIT

# Parse argumentos
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

BACKUP_FILE="$1"
shift

DECOMPRESS=false
DECRYPT=false
DB_TYPE="auto"
CREATE_DB=false
DROP_EXISTING=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            exit 0
            ;;
        --decompress)
            DECOMPRESS=true
            shift
            ;;
        --decrypt)
            DECRYPT=true
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
        --create-db)
            CREATE_DB=true
            shift
            ;;
        --drop-existing)
            DROP_EXISTING=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            log_error "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Archivo de backup no encontrado: $BACKUP_FILE"
    exit 1
fi

# Cargar variables de entorno
if [ -f "$PROJECT_DIR/.env" ]; then
    log_info "Cargando variables de entorno desde .env"
    source "$PROJECT_DIR/.env"
fi

# Crear directorio temporal
mkdir -p "$TEMP_DIR"

# Detectar tipo de archivo automáticamente
FINAL_BACKUP_FILE="$BACKUP_FILE"

if [[ "$BACKUP_FILE" == *.gpg ]] && [ "$DECRYPT" = false ]; then
    log_info "Archivo encriptado detectado, habilitando desencriptación automática"
    DECRYPT=true
fi

if [[ "$BACKUP_FILE" == *.gz ]] && [ "$DECOMPRESS" = false ]; then
    log_info "Archivo comprimido detectado, habilitando descompresión automática"
    DECOMPRESS=true
fi

# Proceso de desencriptación
if [ "$DECRYPT" = true ]; then
    log_info "Desencriptando archivo backup..."
    
    if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
        log_error "BACKUP_ENCRYPTION_KEY no configurada para desencriptación"
        exit 1
    fi
    
    local decrypted_file="$TEMP_DIR/decrypted.sql"
    if [[ "$BACKUP_FILE" == *.gz.gpg ]]; then
        decrypted_file="$TEMP_DIR/decrypted.sql.gz"
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] gpg --decrypt $BACKUP_FILE > $decrypted_file"
    else
        gpg --quiet --decrypt "$BACKUP_FILE" > "$decrypted_file"
        if [ $? -eq 0 ]; then
            log_success "Archivo desencriptado: $decrypted_file"
            FINAL_BACKUP_FILE="$decrypted_file"
        else
            log_error "Error desencriptando archivo"
            exit 1
        fi
    fi
fi

# Proceso de descompresión
if [ "$DECOMPRESS" = true ]; then
    log_info "Descomprimiendo archivo backup..."
    
    local compressed_file="$FINAL_BACKUP_FILE"
    local decompressed_file="$TEMP_DIR/decompressed.sql"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] gunzip -c $compressed_file > $decompressed_file"
    else
        gunzip -c "$compressed_file" > "$decompressed_file"
        if [ $? -eq 0 ]; then
            log_success "Archivo descomprimido: $decompressed_file"
            FINAL_BACKUP_FILE="$decompressed_file"
        else
            log_error "Error descomprimiendo archivo"
            exit 1
        fi
    fi
fi

# Detectar tipo de base de datos
if [ "$DB_TYPE" = "auto" ]; then
    if [ ! -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        DB_TYPE="supabase"
        log_info "Detectado Supabase automáticamente"
    elif [ ! -z "$DATABASE_URL" ]; then
        DB_TYPE="local"
        log_info "Detectado PostgreSQL local automáticamente"
    else
        log_error "No se pudo detectar tipo de base de datos"
        exit 1
    fi
fi

# Función para restore a Supabase
restore_to_supabase() {
    log_info "Iniciando restore a Supabase..."
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        log_error "NEXT_PUBLIC_SUPABASE_URL no configurada"
        exit 1
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        log_error "SUPABASE_SERVICE_ROLE_KEY no configurada"
        log_info "Se requiere service role key para operaciones admin"
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
    
    # Warning sobre eliminación de datos
    if [ "$DROP_EXISTING" = true ]; then
        log_warning "⚠️  ATENCIÓN: Se eliminarán TODOS los datos existentes en Supabase"
        log_warning "Esta acción NO se puede deshacer"
        echo -n "¿Estás seguro de continuar? (escribe 'YES' para confirmar): "
        read -r confirmation
        if [ "$confirmation" != "YES" ]; then
            log_info "Restore cancelado por el usuario"
            exit 0
        fi
    fi
    
    # Configurar conexión
    export PGPASSWORD="$SUPABASE_DB_PASSWORD"
    
    local psql_cmd="psql -h $SUPABASE_HOST -p $SUPABASE_PORT -U $SUPABASE_USER -d $SUPABASE_DB"
    
    # Verificar conexión
    log_info "Verificando conexión a Supabase..."
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] $psql_cmd -c 'SELECT version();'"
    else
        if $psql_cmd -c "SELECT version();" >/dev/null 2>&1; then
            log_success "Conexión a Supabase exitosa"
        else
            log_error "No se pudo conectar a Supabase"
            exit 1
        fi
    fi
    
    # Eliminar datos existentes si se solicita
    if [ "$DROP_EXISTING" = true ]; then
        log_info "Eliminando datos existentes..."
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        else
            $psql_cmd -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1 || {
                log_error "Error eliminando schema existente"
                exit 1
            }
            log_success "Datos existentes eliminados"
        fi
    fi
    
    # Ejecutar restore
    log_info "Ejecutando restore del backup..."
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] $psql_cmd < $FINAL_BACKUP_FILE"
    else
        $psql_cmd < "$FINAL_BACKUP_FILE"
        if [ $? -eq 0 ]; then
            log_success "Restore a Supabase completado exitosamente"
        else
            log_error "Error durante restore a Supabase"
            exit 1
        fi
    fi
}

# Función para restore local
restore_to_local() {
    log_info "Iniciando restore a PostgreSQL local..."
    
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL no configurada"
        exit 1
    fi
    
    # Verificar conexión
    log_info "Verificando conexión a base de datos local..."
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] psql $DATABASE_URL -c 'SELECT version();'"
    else
        if psql "$DATABASE_URL" -c "SELECT version();" >/dev/null 2>&1; then
            log_success "Conexión a base de datos local exitosa"
        else
            log_error "No se pudo conectar a la base de datos local"
            exit 1
        fi
    fi
    
    # Warning sobre eliminación de datos
    if [ "$DROP_EXISTING" = true ]; then
        log_warning "⚠️  ATENCIÓN: Se eliminarán TODOS los datos existentes"
        log_warning "Esta acción NO se puede deshacer"
        echo -n "¿Estás seguro de continuar? (escribe 'YES' para confirmar): "
        read -r confirmation
        if [ "$confirmation" != "YES" ]; then
            log_info "Restore cancelado por el usuario"
            exit 0
        fi
        
        log_info "Eliminando datos existentes..."
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] psql $DATABASE_URL -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'"
        else
            psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1 || {
                log_error "Error eliminando schema existente"
                exit 1
            }
            log_success "Datos existentes eliminados"
        fi
    fi
    
    # Ejecutar restore
    log_info "Ejecutando restore del backup..."
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] psql $DATABASE_URL < $FINAL_BACKUP_FILE"
    else
        psql "$DATABASE_URL" < "$FINAL_BACKUP_FILE"
        if [ $? -eq 0 ]; then
            log_success "Restore local completado exitosamente"
        else
            log_error "Error durante restore local"
            exit 1
        fi
    fi
}

# Función para verificar restore
verify_restore() {
    log_info "Verificando integridad del restore..."
    
    local verify_cmd
    if [ "$DB_TYPE" = "supabase" ]; then
        verify_cmd="psql -h $SUPABASE_HOST -p $SUPABASE_PORT -U $SUPABASE_USER -d $SUPABASE_DB"
    else
        verify_cmd="psql $DATABASE_URL"
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Verificación de tablas principales"
        return 0
    fi
    
    # Verificar que las tablas principales existen
    local tables_to_check=("users" "news_reports" "newscast_templates" "scraped_news")
    local missing_tables=0
    
    for table in "${tables_to_check[@]}"; do
        local table_exists
        table_exists=$($verify_cmd -t -c "SELECT to_regclass('public.$table');" 2>/dev/null | grep -c "$table")
        
        if [ "$table_exists" -eq 1 ]; then
            log_success "Tabla '$table' restaurada correctamente"
        else
            log_error "Tabla '$table' no encontrada después del restore"
            missing_tables=$((missing_tables + 1))
        fi
    done
    
    if [ $missing_tables -eq 0 ]; then
        log_success "Todas las tablas principales verificadas"
        
        # Verificar que hay datos
        local user_count
        user_count=$($verify_cmd -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n' || echo "0")
        
        if [ "$user_count" -gt 0 ]; then
            log_success "Datos verificados: $user_count usuarios restaurados"
        else
            log_warning "No se encontraron usuarios en la base de datos restaurada"
        fi
    else
        log_error "$missing_tables tablas principales faltantes después del restore"
        return 1
    fi
}

# Función para post-restore setup
post_restore_setup() {
    log_info "Ejecutando configuración post-restore..."
    
    local setup_cmd
    if [ "$DB_TYPE" = "supabase" ]; then
        setup_cmd="psql -h $SUPABASE_HOST -p $SUPABASE_PORT -U $SUPABASE_USER -d $SUPABASE_DB"
    else
        setup_cmd="psql $DATABASE_URL"
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Post-restore setup queries"
        return 0
    fi
    
    # Actualizar secuencias si es necesario
    $setup_cmd -c "
        DO \$\$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public'
            LOOP
                EXECUTE 'SELECT setval(pg_get_serial_sequence(''' || r.schemaname || '.' || r.tablename || ''', ''id''), COALESCE(MAX(id), 1)) FROM ' || r.schemaname || '.' || r.tablename || ' WHERE id IS NOT NULL;';
            END LOOP;
        END;
        \$\$;
    " >/dev/null 2>&1 || log_warning "No se pudieron actualizar las secuencias"
    
    # Actualizar estadísticas
    $setup_cmd -c "ANALYZE;" >/dev/null 2>&1 || log_warning "No se pudieron actualizar las estadísticas"
    
    log_success "Configuración post-restore completada"
}

# Función principal
main() {
    log_info "=== VIRA Database Restore Script ==="
    log_info "Fecha: $(date)"
    log_info "Archivo: $BACKUP_FILE"
    log_info "Tipo BD: $DB_TYPE"
    log_info "Drop existing: $DROP_EXISTING"
    log_info "Dry run: $DRY_RUN"
    echo
    
    # Verificar dependencias
    command -v psql >/dev/null 2>&1 || {
        log_error "psql no está instalado. Instala PostgreSQL client:"
        log_info "Ubuntu/Debian: sudo apt-get install postgresql-client"
        log_info "macOS: brew install postgresql"
        exit 1
    }
    
    if [ "$DECRYPT" = true ]; then
        command -v gpg >/dev/null 2>&1 || {
            log_error "gpg no está instalado para desencriptación"
            exit 1
        }
    fi
    
    # Mostrar información del archivo
    local file_size=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Tamaño del backup: $file_size"
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "=== MODO DRY RUN - NO SE EJECUTARÁN CAMBIOS REALES ==="
    fi
    
    # Ejecutar restore
    if [ "$DB_TYPE" = "supabase" ]; then
        restore_to_supabase
    else
        restore_to_local
    fi
    
    # Verificar restore
    if [ "$DRY_RUN" = false ]; then
        verify_restore
        post_restore_setup
    fi
    
    log_success "=== RESTORE COMPLETADO ==="
    log_info "Base de datos: $DB_TYPE"
    log_info "Archivo procesado: $FINAL_BACKUP_FILE"
    log_info "Fecha: $(date)"
    
    echo
    log_info "=== PRÓXIMOS PASOS ==="
    log_info "1. Verificar que la aplicación funciona correctamente"
    log_info "2. Probar login y funcionalidades básicas"
    log_info "3. Verificar configuraciones específicas del entorno"
    log_info "4. Ejecutar health check: ./health-check.sh"
    
    if [ "$DROP_EXISTING" = true ]; then
        log_warning "⚠️  RECORDATORIO: Se eliminaron todos los datos previos"
        log_info "   Si hay problemas, puedes restaurar desde otro backup"
    fi
}

# Ejecutar función principal
main "$@"
