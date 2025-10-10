
# 🗄️ BASE DE DATOS VIRA - DOCUMENTACIÓN

Esta carpeta contiene toda la información relacionada con la base de datos de VIRA.

## 📁 **ARCHIVOS INCLUIDOS**

- `supabase_schema.sql` - Schema completo de PostgreSQL para Supabase
- `sample_data.sql` - Datos de ejemplo para testing
- `migrations/` - Migraciones para cambios incrementales
- `seeds/` - Scripts para poblar datos iniciales
- `backup_scripts/` - Scripts para backup y restore

## 🏗️ **ARQUITECTURA DE BASE DE DATOS**

### **Tablas Principales**

#### **👥 Autenticación y Usuarios**
- `users` - Usuarios del sistema
- `accounts` - Cuentas OAuth vinculadas  
- `sessions` - Sesiones activas
- `verification_tokens` - Tokens de verificación

#### **📰 Contenido Principal**
- `newscast_templates` - Plantillas reutilizables
- `news_reports` - Noticieros generados
- `scraped_news` - Noticias extraídas automáticamente
- `news_sources` - Fuentes de noticias configuradas

#### **🎵 Multimedia**
- `audio_library` - Biblioteca de archivos de audio
- `ad_campaigns` - Campañas publicitarias
- `cloned_voices` - Voces sintéticas entrenadas
- `uploaded_files` - Archivos subidos por usuarios

#### **⚙️ Configuración**
- `automation_jobs` - Trabajos programados
- `social_integrations` - Integraciones con redes sociales
- `tts_configurations` - Configuraciones de text-to-speech

#### **📊 Métricas y Monitoreo**
- `token_usage` - Uso de tokens y costos detallados
- `daily_metrics` - Métricas agregadas por día
- `system_logs` - Logs del sistema
- `user_analytics` - Analytics por usuario

## 🚀 **INSTALACIÓN INICIAL**

### **Para Supabase (Recomendado)**
```bash
# 1. Crear proyecto en Supabase
# 2. En SQL Editor, ejecutar:
\i supabase_schema.sql

# 3. Poblar datos iniciales (opcional):
\i sample_data.sql
```

### **Para PostgreSQL Local**
```bash
# 1. Crear base de datos
createdb vira_production

# 2. Aplicar schema
psql -d vira_production -f supabase_schema.sql

# 3. Datos de ejemplo
psql -d vira_production -f sample_data.sql
```

## 🔐 **SEGURIDAD**

### **Row Level Security (RLS)**
Todas las tablas de usuario tienen RLS habilitado:
```sql
-- Los usuarios solo ven sus propios datos
CREATE POLICY "Users can only see their own data" 
ON newscast_templates FOR ALL 
USING (auth.uid() = user_id);
```

### **Roles y Permisos**
- **user**: Acceso a sus propios datos únicamente
- **admin**: Acceso completo a todos los datos
- **service**: Para operaciones automáticas del sistema

## 📈 **MÉTRICAS Y PERFORMANCE**

### **Índices Críticos**
```sql
-- Índices para queries frecuentes
CREATE INDEX CONCURRENTLY idx_news_reports_user_status 
ON news_reports(user_id, status);

CREATE INDEX CONCURRENTLY idx_scraped_news_category_date 
ON scraped_news(category, scraped_at);
```

### **Vistas Útiles**
- `user_stats` - Estadísticas consolidadas por usuario
- `recent_news` - Noticias recientes con metadatos
- `system_metrics` - Métricas del sistema agregadas

### **Funciones SQL**
- `get_user_total_cost(uuid)` - Costo total de un usuario
- `get_news_by_region(text, int)` - Noticias por región
- `update_daily_metrics()` - Actualiza métricas automáticamente

## 🔄 **BACKUP Y RESTORE**

### **Backup Automático**
```bash
# Backup diario (configurar en cron)
pg_dump vira_production > backup_$(date +%Y%m%d).sql

# Backup solo estructura
pg_dump --schema-only vira_production > schema_backup.sql

# Backup solo datos
pg_dump --data-only vira_production > data_backup.sql
```

### **Restore**
```bash
# Restore completo
psql vira_production < backup_20240908.sql

# Restore solo estructura
psql vira_production < schema_backup.sql
```

## 🛠️ **MANTENIMIENTO**

### **Limpieza Automática**
```sql
-- Función para limpiar datos antiguos
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Eliminar noticias scraped más de 90 días
    DELETE FROM scraped_news 
    WHERE scraped_at < NOW() - INTERVAL '90 days';
    
    -- Eliminar logs más de 30 días
    DELETE FROM system_logs 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Eliminar sesiones expiradas
    DELETE FROM sessions 
    WHERE expires < NOW();
END;
$$ LANGUAGE plpgsql;
```

### **Análisis de Performance**
```sql
-- Ver queries más lentas
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;

-- Ver uso de índices
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;
```

## 📊 **MONITORING**

### **Métricas Importantes**
- Conexiones activas: `SELECT count(*) FROM pg_stat_activity`
- Tamaño de base de datos: `SELECT pg_size_pretty(pg_database_size('vira_production'))`
- Queries más frecuentes: `SELECT query, calls FROM pg_stat_statements ORDER BY calls DESC`

### **Alertas Recomendadas**
- Conexiones > 80% del límite
- Tamaño de DB creciendo > 10% semanal  
- Queries lentas > 5 segundos
- Errores de conexión > 5% rate

## 🔍 **TROUBLESHOOTING COMÚN**

### **Performance Lenta**
```sql
-- Encontrar tablas que necesitan VACUUM
SELECT schemaname, tablename, n_dead_tup 
FROM pg_stat_user_tables 
WHERE n_dead_tup > 1000;

-- Encontrar queries que bloquean
SELECT blocked_locks.pid AS blocked_pid,
       blocking_locks.pid AS blocking_pid,
       blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype;
```

### **Conexiones Agotadas**
```sql
-- Ver conexiones actuales
SELECT pid, usename, application_name, state 
FROM pg_stat_activity;

-- Terminar conexiones idle
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle in transaction' 
  AND state_change < now() - interval '1 hour';
```

### **Espacio en Disco**
```sql
-- Ver tamaño por tabla
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 📚 **DOCUMENTACIÓN ADICIONAL**

- **Supabase Docs**: https://supabase.com/docs/guides/database
- **PostgreSQL Manual**: https://www.postgresql.org/docs/
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security
- **Performance Tuning**: https://wiki.postgresql.org/wiki/Performance_Optimization

---

**La base de datos de VIRA está diseñada para ser escalable, segura y de alto rendimiento. Sigue estas guidelines para mantener un sistema robusto en producción.**
