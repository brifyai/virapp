
# 🗄️ VIRA con Supabase - README

VIRA ahora utiliza **Supabase** como base de datos principal, reemplazando completamente Prisma. Esta migración proporciona mejor escalabilidad, funciones serverless, autenticación integrada y un dashboard poderoso para administrar datos.

## 🆕 **NUEVAS FUNCIONALIDADES CON SUPABASE**

### **📊 Base de Datos Avanzada**
- **17 tablas optimizadas** para todas las funcionalidades de VIRA
- **Row Level Security (RLS)** para máxima seguridad
- **Triggers automáticos** para timestamps y validaciones
- **Funciones SQL personalizadas** para operaciones complejas
- **Índices optimizados** para consultas rápidas
- **Vistas materializadas** para reportes y métricas

### **🔐 Autenticación Nativa**
- **OAuth integrado** (Google, GitHub, Facebook, etc.)
- **Gestión de sesiones** automática
- **Políticas de seguridad** por tabla y usuario
- **Verificación de email** incluida
- **Roles y permisos** granulares

### **⚡ Performance y Escalabilidad**
- **PostgreSQL optimizado** con extensiones avanzadas
- **Connection pooling** automático
- **Cache inteligente** para consultas frecuentes
- **Backups automáticos** diarios
- **Monitoring en tiempo real** incluido

## 📁 **ESTRUCTURA DE ARCHIVOS**

```
app/
├── 📁 database/
│   └── 📄 supabase_schema.sql       # Schema completo de BD
├── 📁 lib/
│   ├── 📄 supabase.ts              # Cliente y funciones de BD
│   └── 📄 auth.ts                  # Configuración NextAuth + Supabase
├── 📁 app/api/
│   ├── 📄 templates/route.ts       # API de plantillas (NEW)
│   ├── 📄 reports/route.ts         # API de reportes (NEW)
│   ├── 📄 news-sources/route.ts    # API de fuentes (NEW)
│   └── 📄 generate-newscast/route.ts # Actualizada para Supabase
├── 📄 CONFIGURACION_SUPABASE.md    # Guía completa de setup
├── 📄 scripts/migrate-to-supabase.js # Script de migración
└── 📄 README_SUPABASE.md           # Este archivo
```

## 🗃️ **TABLAS DE BASE DE DATOS**

### **👥 Autenticación**
- `users` - Usuarios del sistema
- `accounts` - Cuentas OAuth vinculadas
- `sessions` - Sesiones activas
- `verification_tokens` - Tokens de verificación

### **📰 Contenido Principal**
- `news_reports` - Noticieros generados
- `newscast_templates` - Plantillas reutilizables
- `news_sources` - Fuentes de noticias configuradas
- `scraped_news` - Noticias extraídas automáticamente

### **🎵 Multimedia**
- `audio_library` - Música, efectos y jingles
- `ad_campaigns` - Campañas publicitarias
- `cloned_voices` - Voces sintéticas entrenadas
- `uploaded_files` - Archivos subidos por usuarios

### **⚙️ Configuración y Monitoreo**
- `tts_configurations` - Configuraciones de síntesis de voz
- `social_integrations` - Integraciones con redes sociales
- `automation_jobs` - Tareas automatizadas programadas
- `token_usage` - Registro de uso de APIs y costos
- `daily_metrics` - Métricas diarias del sistema

## 🚀 **APIS DISPONIBLES**

### **📋 Plantillas de Noticieros**
```typescript
// Crear plantilla
POST /api/templates
{
  "name": "Noticiero Matutino",
  "region": "Metropolitana de Santiago",
  "duration_minutes": 15,
  "voice_provider": "openai",
  "categories": ["política", "economía"]
}

// Obtener plantillas del usuario
GET /api/templates

// Usar plantilla en generación
POST /api/generate-newscast
{
  "template_id": "uuid-plantilla",
  // ... otros parámetros
}
```

### **📊 Reportes de Noticieros**
```typescript
// Obtener reportes del usuario
GET /api/reports?limit=20

// Obtener reporte específico
GET /api/reports/[id]

// Actualizar reporte
PUT /api/reports/[id]
{
  "status": "completed",
  "audio_url": "https://s3.../final_audio.mp3"
}

// Eliminar reporte
DELETE /api/reports/[id]
```

### **🌐 Fuentes de Noticias**
```typescript
// Obtener fuentes por región
GET /api/news-sources?region=Antofagasta

// Obtener fuentes del usuario
GET /api/news-sources?userOnly=true

// Agregar nueva fuente
POST /api/news-sources
{
  "name": "Diario Regional Norte",
  "url": "https://ejemplo.com",
  "rss_url": "https://ejemplo.com/rss",
  "region": "Antofagasta"
}
```

## 📈 **FUNCIONES DE BASE DE DATOS**

### **🔍 Búsquedas y Consultas**
```sql
-- Obtener noticias por región
SELECT * FROM get_news_by_region('Valparaíso', 10);

-- Calcular costo total de usuario
SELECT get_user_total_cost('user-uuid-here');

-- Ver estadísticas de usuario
SELECT * FROM user_stats WHERE id = 'user-uuid';

-- Ver métricas del sistema
SELECT * FROM system_metrics ORDER BY date DESC;
```

### **📊 Vistas Útiles**
```sql
-- Noticias recientes con fuente
SELECT * FROM recent_news WHERE region = 'Biobío' LIMIT 10;

-- Estadísticas por usuario
SELECT * FROM user_stats WHERE total_cost_used > 0;

-- Métricas del sistema (últimos 30 días)
SELECT * FROM system_metrics WHERE date >= NOW() - INTERVAL '30 days';
```

## 🔧 **FUNCIONES DE UTILIDAD EN lib/supabase.ts**

### **👤 Gestión de Usuarios**
```typescript
// Obtener datos del usuario
const user = await getUser(userId)

// Actualizar perfil
await updateUser(userId, { name: "Nuevo Nombre" })

// Obtener estadísticas del usuario
const stats = await getUserStats(userId)

// Obtener costo total del usuario
const totalCost = await getUserTotalCost(userId)
```

### **📝 Plantillas de Noticieros**
```typescript
// Crear plantilla nueva
const template = await createNewscastTemplate({
  name: "Mi Plantilla",
  region: "Santiago",
  duration_minutes: 15,
  user_id: userId
})

// Obtener plantillas del usuario
const templates = await getUserNewscastTemplates(userId)

// Eliminar plantilla
await deleteNewscastTemplate(templateId, userId)
```

### **📰 Manejo de Reportes**
```typescript
// Crear reporte de noticiero
const report = await createNewsReport({
  title: "Noticiero Santiago 5 Sep 2025",
  timeline_data: timelineData,
  user_id: userId
})

// Actualizar reporte con audio final
await updateNewsReport(reportId, {
  audio_url: "https://s3.../final.mp3",
  status: "completed"
})

// Obtener reportes recientes
const reports = await getUserNewsReports(userId, 10)
```

### **🎵 Biblioteca de Audio**
```typescript
// Agregar audio a biblioteca
const audio = await createAudioLibraryItem({
  name: "Cortina Musical",
  type: "music",
  s3_key: "audio/cortina-123.mp3",
  duration_seconds: 30,
  user_id: userId
})

// Obtener biblioteca por tipo
const musicLibrary = await getUserAudioLibrary(userId, "music")
const effectsLibrary = await getUserAudioLibrary(userId, "sfx")
```

### **📊 Métricas y Análisis**
```typescript
// Registrar uso de tokens/APIs
await logTokenUsage({
  user_id: userId,
  service: "openai",
  operation: "text-to-speech",
  tokens_used: 1000,
  cost: 0.15
})

// Obtener métricas del sistema
const metrics = await getSystemMetrics(30) // últimos 30 días

// Buscar noticias
const results = await searchScrapedNews(
  "economía", // query
  "Santiago", // región
  "económica" // categoría
)
```

## 🔒 **SEGURIDAD Y PERMISOS**

### **Row Level Security (RLS)**
Cada tabla tiene políticas que aseguran que:
- ✅ Los usuarios solo ven sus propios datos
- ✅ No pueden modificar datos de otros usuarios  
- ✅ Los administradores tienen acceso completo
- ✅ Las APIs públicas funcionan correctamente

### **Roles de Usuario**
```sql
-- Usuario estándar (rol: 'user')
- Crear y gestionar sus plantillas
- Generar noticieros
- Acceder a su biblioteca de audio
- Ver sus métricas de uso

-- Administrador (rol: 'admin')  
- Acceso completo a todos los datos
- Gestionar fuentes de noticias globales
- Ver métricas del sistema completo
- Administrar otros usuarios
```

## 📝 **EJEMPLOS DE USO**

### **1. Flujo Completo de Usuario**
```typescript
// 1. Usuario se autentica
const session = await getServerSession(authOptions)

// 2. Crea una plantilla
const template = await createNewscastTemplate({
  name: "Noticiero Matutino",
  region: "Santiago",
  user_id: session.user.id
})

// 3. Genera un noticiero usando la plantilla
const response = await fetch('/api/generate-newscast', {
  method: 'POST',
  body: JSON.stringify({
    template_id: template.id,
    region: "Santiago"
  })
})

// 4. El sistema automáticamente:
// - Scrapea noticias reales
// - Crea el timeline
// - Guarda el reporte en BD
// - Registra el uso de tokens
```

### **2. Dashboard de Métricas**
```typescript
// Obtener datos para dashboard
const [userStats, recentReports, totalCost] = await Promise.all([
  getUserStats(userId),
  getUserNewsReports(userId, 5),
  getUserTotalCost(userId)
])

// Mostrar métricas
console.log(`Reportes generados: ${userStats.total_reports}`)
console.log(`Costo total: $${totalCost}`)
console.log(`Último reporte: ${recentReports[0]?.title}`)
```

## 🌟 **VENTAJAS DE SUPABASE VS PRISMA**

| Característica | Prisma | Supabase |
|---|---|---|
| **Base de Datos** | ORM + DB externa | PostgreSQL optimizado |
| **Autenticación** | NextAuth separado | Nativo integrado |
| **Dashboard** | No incluido | Completo y en tiempo real |
| **APIs** | Generar manualmente | RESTful automáticas |
| **Funciones** | Solo TypeScript | SQL + TypeScript |
| **Monitoreo** | Externo requerido | Incluido nativamente |
| **Escalabilidad** | Limitada por ORM | Nativa de PostgreSQL |
| **Costo** | DB + hosting + tools | Todo incluido |

## 🚀 **PRÓXIMOS PASOS**

### **Funcionalidades Planificadas**
- [ ] **Búsqueda vectorial** para noticias similares
- [ ] **Webhooks** para automatización avanzada
- [ ] **Edge Functions** para procesamiento real-time
- [ ] **Storage integrado** para archivos multimedia
- [ ] **Realtime subscriptions** para dashboard en vivo

### **Optimizaciones Futuras**
- [ ] **Índices adicionales** basados en uso real
- [ ] **Particionado de tablas** para grandes volúmenes
- [ ] **Cache distribuido** con Redis
- [ ] **Analytics avanzados** con ClickHouse

---

## 📞 **SOPORTE Y DEBUGGING**

### **Logs y Monitoreo**
1. **Dashboard Supabase**: Ve a tu proyecto → Logs
2. **API Logs**: Monitorea requests en tiempo real
3. **Performance**: Revisa query performance y optimizaciones
4. **Auth Logs**: Debug problemas de autenticación

### **Debug Common Issues**
```typescript
// Verificar conexión
import { supabase } from '@/lib/supabase'
const { data, error } = await supabase.from('users').select('count')
if (error) console.error('DB Error:', error)

// Verificar autenticación
const session = await supabase.auth.getSession()
console.log('User:', session.data.session?.user?.id)

// Verificar permisos RLS
const { data, error } = await supabase.from('news_reports').select('*')
if (error?.code === 'PGRST301') {
  console.log('RLS blocking access - check policies')
}
```

---

**VIRA + Supabase = Plataforma de Noticieros más Poderosa y Escalable del Mercado 🚀**

Para configuración completa, lee: [CONFIGURACION_SUPABASE.md](./CONFIGURACION_SUPABASE.md)
