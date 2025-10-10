
# ❓ PREGUNTAS FRECUENTES (FAQ) - VIRA

Respuestas a las preguntas más comunes sobre VIRA y su funcionamiento.

## 🚀 **INSTALACIÓN Y CONFIGURACIÓN**

### **¿Qué necesito para instalar VIRA?**
- **Node.js 18+** y **Yarn**
- **Base de datos PostgreSQL** (recomendamos Supabase)
- **Cuenta en servicios de IA** (AbacusAI, ElevenLabs, etc.)
- **Almacenamiento S3** para archivos de audio
- **2GB de espacio libre** en disco

### **¿Puedo usar VIRA sin conocimientos técnicos?**
VIRA requiere conocimientos básicos de desarrollo web para la instalación inicial. Sin embargo, una vez configurado, la interfaz es muy intuitiva para usuarios finales.

### **¿Qué servicios de IA son obligatorios?**
- **Obligatorio**: AbacusAI (incluido en el backup)
- **Recomendado**: Al menos un servicio de text-to-speech (ElevenLabs, Azure, o AWS Polly)
- **Opcional**: Otros modelos de IA para mayor variedad

### **¿Funciona VIRA en Windows?**
Sí, VIRA es compatible con:
- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu, CentOS, etc.)
- ✅ Docker en cualquier plataforma

### **¿Cuánto cuesta mantener VIRA funcionando?**
Los costos principales son:
- **Hosting**: $0-50/mes (Vercel, Netlify gratis hasta cierto uso)
- **Base de datos**: $0-25/mes (Supabase gratis hasta 500MB)
- **IA y TTS**: Variable según uso ($10-100/mes típico)
- **Almacenamiento S3**: $5-20/mes según archivos

## 🎙️ **GENERACIÓN DE NOTICIEROS**

### **¿Cuánto tiempo toma generar un noticiero?**
| Duración | Tiempo Estimado | Factores |
|----------|-----------------|----------|
| 5 minutos | 2-3 minutos | Scraping + IA + TTS |
| 15 minutos | 4-6 minutos | Más contenido |
| 30 minutos | 8-12 minutos | Procesos paralelos |
| 60 minutos | 15-20 minutos | Máxima duración |

### **¿Puedo generar noticieros en otros idiomas?**
VIRA está optimizado para **español chileno**, pero puede adaptarse a:
- ✅ Español (otros países)
- ⚙️ Portugués (requiere configuración)
- ⚙️ Inglés (requiere configuración)
- ❌ Otros idiomas (no soportados actualmente)

### **¿Qué calidad tiene el audio generado?**
- **ElevenLabs**: Calidad profesional broadcast (recomendado)
- **Azure Speech**: Muy buena, voces chilenas nativas
- **AWS Polly**: Buena calidad, más económica
- **Calidad final**: 44.1kHz, MP3 320kbps

### **¿Puedo editar el contenido después de generado?**
¡Sí! El timeline interactivo permite:
- ✏️ **Editar texto** de cualquier noticia
- 🎙️ **Regenerar audio** con cambios
- 🔄 **Cambiar orden** de noticias
- ➕ **Agregar/eliminar** elementos
- 📐 **Ajustar duración** total

### **¿Las noticias son reales y actualizadas?**
Sí, VIRA extrae noticias reales de fuentes verificadas:
- **Emol.com** - Noticias nacionales
- **La Tercera** - Economía y política
- **BioBío Chile** - Noticias regionales
- **Actualizadas**: Cada hora automáticamente

### **¿Puedo agregar mis propias fuentes de noticias?**
Absolutamente. Puedes agregar:
- **Sitios web** con RSS feeds
- **Fuentes regionales** específicas
- **Blogs especializados** 
- **Medios locales** de tu región

## 🤖 **INTELIGENCIA ARTIFICIAL**

### **¿Qué modelos de IA usa VIRA?**
**Texto y Reescritura:**
- GPT-3.5 Turbo (económico)
- GPT-4 Turbo (calidad premium)
- Claude-3 Sonnet (humanización)
- Groq Llama/Mixtral (velocidad)

**Text-to-Speech:**
- ElevenLabs (premium)
- Azure Speech (chileno)
- AWS Polly (económico)

### **¿Cómo aseguro que el contenido sea preciso?**
VIRA incluye varias capas de verificación:
- **Fuentes confiables**: Solo medios establecidos
- **No inventa información**: Solo reescribe contenido existente
- **Revisión manual**: Timeline editable antes de finalizar
- **Múltiples versiones**: Original, reescrito, humanizado

### **¿El contenido puede tener sesgos políticos?**
VIRA intenta ser neutral, pero:
- **Depende de las fuentes**: Selecciona medios equilibrados
- **Configuración de neutralidad**: En configuraciones de IA
- **Revisión recomendada**: Especialmente para contenido político
- **Múltiples fuentes**: Para balance de perspectivas

### **¿Puedo entrenar voces personalizadas?**
Sí, con ciertas limitaciones:
- **ElevenLabs**: Permite clonación de voz (plan premium)
- **Azure Custom Neural Voice**: Para empresas grandes
- **Samples necesarios**: 10-30 minutos de audio limpio
- **Tiempo de entrenamiento**: 2-7 días según proveedor

## 💰 **COSTOS Y PRECIOS**

### **¿Cuánto cuesta generar un noticiero?**
**Ejemplos típicos** (varía según configuración):

| Duración | Perfil Económico | Perfil Balanceado | Perfil Premium |
|----------|------------------|-------------------|----------------|
| 5 min | $0.50 - $0.80 | $1.00 - $1.50 | $2.00 - $3.00 |
| 15 min | $1.20 - $2.00 | $2.50 - $4.00 | $5.00 - $8.00 |
| 30 min | $2.50 - $4.00 | $5.00 - $8.00 | $10.00 - $15.00 |

### **¿Cómo se calculan los costos?**
Los costos incluyen:
- **Scraping**: $0.01 - $0.05 por noticiero
- **Reescritura IA**: $0.20 - $1.50 según modelo
- **Text-to-Speech**: $0.30 - $2.00 por minuto de audio
- **Almacenamiento S3**: $0.01 - $0.10 por archivo

### **¿Hay límites de uso?**
Depende de tu configuración:
- **Sin límites técnicos**: Puedes generar infinitos noticieros
- **Límites de costo**: Tu presupuesto en servicios de IA
- **Límites de APIs**: Rate limits de proveedores externos
- **Almacenamiento**: Según tu plan de S3

### **¿Puedo controlar los gastos?**
Sí, VIRA incluye:
- 💰 **Calculadora de costos** antes de generar
- 📊 **Monitoreo en tiempo real** de gastos
- ⚠️ **Alertas de presupuesto** configurables
- 📈 **Reportes detallados** por servicio
- 🎛️ **Perfiles de costo** predefinidos

## 🔄 **AUTOMATIZACIÓN**

### **¿Puedo programar noticieros automáticos?**
¡Por supuesto! Puedes configurar:
- **Horarios específicos**: "Diario a las 7:00 AM"
- **Días de la semana**: "Lunes a Viernes"
- **Frecuencias**: Diaria, semanal, mensual
- **Múltiples programaciones**: Diferentes horarios del día

### **¿Qué pasa si falla la automatización?**
VIRA tiene sistemas de recuperación:
- **Reintentos automáticos**: 3 intentos con delays
- **Notificaciones de error**: Por email/webhook
- **Logs detallados**: Para debugging
- **Modo manual**: Siempre puedes generar manualmente

### **¿Puedo publicar automáticamente en redes sociales?**
Sí, VIRA se integra con:
- 🐦 **Twitter/X**: Posts automáticos con audio
- 📘 **Facebook**: Páginas y perfiles
- 📸 **Instagram**: Stories y posts
- 💼 **LinkedIn**: Contenido profesional
- 🎵 **Spotify**: Como podcast automático

### **¿Funciona la automatización si mi computadora está apagada?**
Si usas deployment en la nube (Vercel, etc.), sí:
- ✅ **Servidores 24/7**: La automatización siempre funciona
- ✅ **Cron jobs**: Ejecutados en la nube
- ❌ **Servidor local**: Requiere computadora encendida

## 🎵 **AUDIO Y MULTIMEDIA**

### **¿Puedo usar mi propia música?**
¡Absolutamente! Puedes:
- 📤 **Subir archivos MP3/WAV** a la biblioteca
- 🏷️ **Organizar por categorías**: Cortinas, efectos, jingles
- 🔍 **Búsqueda y filtros** para encontrar audio
- ❤️ **Marcar favoritos** para acceso rápido

### **¿Qué formatos de audio soporta?**
- **Entrada**: MP3, WAV, AAC, M4A
- **Salida**: MP3 (320kbps), WAV (opcional)
- **Duración máxima**: 10 minutos por archivo
- **Tamaño máximo**: 50MB por archivo

### **¿Puedo crear diferentes versiones de audio?**
Sí, cada noticia tiene:
- **Original**: Texto extraído sin modificar
- **Reescrito**: Versión mejorada por IA
- **Humanizado**: Más natural y conversacional
- **Audio independiente**: Para cada versión

### **¿El audio final es de calidad broadcast?**
¡Sí! El audio generado es:
- **44.1kHz/16-bit** - Calidad CD
- **MP3 320kbps** - Sin pérdida perceptible
- **Normalizado** - Volumen consistente
- **Masterizado** - Listo para transmisión

## 🌐 **INTEGRACIONES**

### **¿Puedo integrar VIRA con mi sistema actual?**
Sí, VIRA ofrece:
- 🔌 **APIs REST completas** - Para cualquier integración
- 📡 **Webhooks** - Para notificaciones en tiempo real
- 📊 **Exportación de datos** - CSV, JSON, XML
- 🎵 **RSS feeds** - Para distribución automática

### **¿Se integra con plataformas de streaming?**
Actualmente soporta:
- ✅ **Spotify for Podcasters** - Subida automática
- ⚙️ **Apple Podcasts** - Via RSS feed
- ⚙️ **Google Podcasts** - Via RSS feed
- 🔄 **En desarrollo**: Más plataformas próximamente

### **¿Puedo usar VIRA con mi software de radio actual?**
Sí, a través de:
- **Archivos MP3**: Compatibles con cualquier software
- **RSS feeds**: Para importación automática
- **APIs**: Integración directa con sistemas profesionales
- **Webhooks**: Notificaciones a tu sistema

## 🔐 **SEGURIDAD Y PRIVACIDAD**

### **¿Es seguro usar VIRA?**
VIRA implementa las mejores prácticas de seguridad:
- 🔒 **HTTPS obligatorio** - Todas las comunicaciones encriptadas
- 🛡️ **Autenticación robusta** - OAuth con proveedores confiables
- 🔑 **APIs protegidas** - Tokens de acceso seguros
- 🗄️ **Base de datos segura** - Row Level Security habilitada

### **¿Quién puede ver mi contenido?**
- ✅ **Solo tú**: Tus noticieros son privados por defecto
- ✅ **Control total**: Decides qué compartir públicamente
- ❌ **No compartimos datos**: Sin acceso externo sin permiso
- 🔒 **Encriptación**: Datos sensibles encriptados

### **¿Dónde se almacenan los archivos?**
- **Audio**: Amazon S3 (encriptado en tránsito y reposo)
- **Base de datos**: Supabase (PostgreSQL con SSL)
- **Backups**: Automáticos y encriptados
- **Ubicación**: Configurable (preferimos servidores cerca de Chile)

### **¿Puedo eliminar todos mis datos?**
Por supuesto:
- 🗑️ **Eliminación completa** - Datos, archivos, backups
- ⏰ **Proceso inmediato** - Sin períodos de retención forzosos
- 📧 **Confirmación por email** - Verificamos que eres tú
- 📋 **Exportación previa** - Puedes descargar todo antes

## 📱 **COMPATIBILIDAD Y ACCESO**

### **¿Hay app móvil para VIRA?**
Actualmente no hay app nativa, pero:
- 📱 **Web responsive**: Funciona perfectamente en móviles
- 🔧 **Panel de control**: Accesible desde cualquier dispositivo
- 📊 **Monitoreo remoto**: Ve estadísticas desde el móvil
- 🚀 **En desarrollo**: App nativa planificada para 2025

### **¿Puedo usar VIRA desde múltiples dispositivos?**
¡Sí!:
- 💻 **Sincronización automática** - Todos los dispositivos actualizados
- 🔐 **Sesión segura** - Login desde cualquier lugar
- 📊 **Estado en tiempo real** - Ve el progreso desde cualquier dispositivo
- 🔄 **Sin límites** - Accede desde donde necesites

### **¿Funciona en navegadores antiguos?**
VIRA requiere navegadores modernos:
- ✅ **Chrome 90+** - Recomendado
- ✅ **Firefox 88+** - Completamente compatible
- ✅ **Safari 14+** - Compatible con limitaciones menores
- ✅ **Edge 90+** - Totalmente funcional
- ❌ **Internet Explorer** - No soportado

## 🚨 **PROBLEMAS COMUNES**

### **El noticiero tarda mucho en generarse**
Posibles causas:
- **Servicios de IA lentos**: Normal en horas pico
- **Muchas noticias**: Duración larga requiere más tiempo
- **Internet lento**: APIs requieren buena conexión
- **Solución**: Usar perfil "económico" para mayor velocidad

### **El audio se escucha distorsionado**
Revisa:
- **Configuración de calidad**: Ajustar en settings
- **Volumen del navegador**: No exceder 80%
- **Archivo original**: Regenerar el audio
- **Proveedor TTS**: Cambiar a ElevenLabs para mejor calidad

### **No puedo hacer login**
Verifica:
- **Cookies habilitadas**: Necesarias para NextAuth
- **JavaScript activo**: Requerido para la aplicación
- **Popup blocker**: Puede bloquear OAuth
- **Caché del navegador**: Intenta modo incógnito

### **Error "Database connection failed"**
Esto indica:
- **Supabase inactivo**: Revisa el dashboard de Supabase
- **Variables mal configuradas**: Verifica URLs y keys
- **Límites excedidos**: Revisa uso en Supabase
- **Red empresarial**: Firewall puede bloquear conexiones

### **Los costos son muy altos**
Optimiza usando:
- **Perfil económico**: Reduce costos 40-60%
- **Menos categorías**: Menos noticias = menos costo
- **Duración menor**: Ajusta según necesidad real
- **AWS Polly**: Más barato que ElevenLabs para pruebas

## 🔄 **ACTUALIZACIONES Y SOPORTE**

### **¿Con qué frecuencia se actualiza VIRA?**
- **Actualizaciones menores**: Semanales (bug fixes)
- **Nuevas funciones**: Mensuales
- **Actualizaciones mayores**: Trimestrales
- **Actualizaciones de seguridad**: Inmediatas

### **¿Cómo actualizo mi instalación?**
```bash
# Backup de datos
git pull origin main
yarn install
yarn build
yarn start
```

### **¿Hay soporte técnico disponible?**
Incluido en el backup:
- 📚 **Documentación completa** - 5 manuales detallados
- 🔧 **Manual técnico** - Para desarrolladores
- ❓ **FAQ** - Este documento
- 🚨 **Troubleshooting** - Soluciones a problemas comunes

### **¿Puedo personalizar VIRA para mis necesidades?**
¡Por supuesto! VIRA es altamente personalizable:
- 🎨 **Interfaz**: Modificar colores, logos, textos
- 🔧 **Funcionalidades**: Agregar/modificar características
- 🌐 **Idiomas**: Adaptar a otros mercados
- 🤖 **IA**: Integrar nuevos modelos de IA

## 🌟 **CASOS DE USO EXITOSOS**

### **Radio Comunitaria (5-15 empleados)**
- **Uso**: 2-3 noticieros diarios automáticos
- **Costo**: $30-50/mes
- **Resultado**: 70% menos tiempo en producción

### **Estación Regional (20-50 empleados)**
- **Uso**: Noticieros cada 2 horas + especiales
- **Costo**: $100-200/mes  
- **Resultado**: Contenido 24/7 sin operadores nocturnos

### **Red de Medios (100+ empleados)**
- **Uso**: Múltiples estaciones, contenido personalizado
- **Costo**: $300-500/mes
- **Resultado**: Escalabilidad masiva con calidad consistente

### **Podcaster Independiente**
- **Uso**: Podcast diario de noticias
- **Costo**: $15-30/mes
- **Resultado**: Monetización exitosa con contenido fresco

## 🚀 **PRÓXIMAS FUNCIONALIDADES**

### **En Desarrollo (Q4 2024)**
- 📱 **App móvil nativa** iOS/Android
- 🎥 **Generación de video** para redes sociales
- 🤖 **IA conversacional** para entrevistas simuladas
- 📊 **Analytics avanzados** de audiencia

### **Planificado (2025)**
- 🌎 **Múltiples idiomas** (Inglés, Portugués)
- 🎙️ **Clonación de voz mejorada** con menos samples
- 🔗 **Integración WhatsApp Business** para distribución
- ☁️ **Modo completamente cloud** sin instalación local

---

## 📞 **¿No encuentras tu respuesta?**

Si tu pregunta no está aquí:

1. **Consulta los manuales específicos**:
   - `MANUAL_INSTALACION.md` - Para problemas de setup
   - `MANUAL_TECNICO.md` - Para desarrolladores
   - `MANUAL_USUARIO.md` - Para uso diario
   - `MANUAL_APIS.md` - Para integraciones

2. **Revisa los logs** de la aplicación para mensajes de error específicos

3. **Busca en la documentación** usando Ctrl+F con palabras clave

4. **Contacta soporte técnico** (si disponible) con detalles específicos del problema

---

**¡VIRA está diseñado para ser intuitivo y poderoso! Con esta FAQ deberías poder resolver la mayoría de dudas comunes. 🎙️✨**
