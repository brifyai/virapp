
# 🔌 MANUAL DE APIs - VIRA

Documentación completa de todas las APIs disponibles en VIRA para integraciones y desarrollo.

## 📋 **INFORMACIÓN GENERAL**

### **Base URL**
```
https://tu-dominio.com/api
```

### **Autenticación**
Todas las APIs requieren autenticación mediante:

**1. Session Cookie (Recomendado para web)**
```javascript
// Automático con NextAuth.js
const session = await getSession();
```

**2. Bearer Token (Para integraciones)**
```bash
curl -H "Authorization: Bearer tu_api_token" \
  https://tu-dominio.com/api/reports
```

**3. API Key (Para servicios externos)**
```bash
curl -H "X-API-Key: tu_api_key" \
  https://tu-dominio.com/api/reports
```

### **Formato de Respuestas**
Todas las APIs retornan JSON con el siguiente formato:

**Respuesta Exitosa:**
```json
{
  "success": true,
  "data": { /* contenido */ },
  "message": "Operación completada",
  "timestamp": "2024-09-08T15:30:00.000Z"
}
```

**Respuesta con Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descripción del error",
    "details": { /* información adicional */ }
  },
  "timestamp": "2024-09-08T15:30:00.000Z"
}
```

### **Códigos de Estado HTTP**
- `200` - Éxito
- `201` - Recurso creado exitosamente
- `400` - Error en la petición (datos inválidos)
- `401` - No autenticado
- `403` - Sin permisos suficientes
- `404` - Recurso no encontrado
- `429` - Límite de peticiones excedido
- `500` - Error interno del servidor

## 🎙️ **GENERACIÓN DE NOTICIEROS**

### **POST `/api/generate-newscast`**
Genera un nuevo noticiero automáticamente.

**Request:**
```json
{
  "title": "Noticiero Matutino Santiago",
  "template_id": "uuid-optional",
  "region": "Santiago",
  "duration_minutes": 15,
  "categories": ["política", "economía", "deportes"],
  "ai_profile": "balanced",
  "ai_settings": {
    "extraction_model": "gpt-3.5-turbo",
    "rewrite_model": "gpt-4-turbo",
    "humanization_model": "claude-3-sonnet",
    "voice_provider": "elevenlabs",
    "voice_id": "21m00Tcm4TlvDq8ikWAM"
  },
  "ad_phrases_count": 5,
  "ad_phrases": [
    "Esta programación llega a usted gracias a...",
    "Radio Norte, siempre informando"
  ],
  "generate_final_audio": true,
  "auto_publish": {
    "twitter": true,
    "facebook": false,
    "instagram": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "report_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Noticiero Matutino Santiago",
    "status": "generating",
    "estimated_completion": "2024-09-08T15:35:00.000Z",
    "estimated_cost_usd": 2.45,
    "timeline_url": "/timeline-noticiero/550e8400-e29b-41d4-a716-446655440000"
  },
  "message": "Generación iniciada correctamente"
}
```

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `title` | string | No | Título personalizado del noticiero |
| `template_id` | uuid | No | ID de plantilla a usar |
| `region` | string | Sí | Región de Chile para noticias locales |
| `duration_minutes` | integer | Sí | Duración deseada (5-60 minutos) |
| `categories` | array | No | Categorías de noticias a incluir |
| `ai_profile` | enum | No | "economic", "balanced", "premium", "custom" |
| `ai_settings` | object | No | Configuración específica de IA (solo si profile="custom") |
| `ad_phrases_count` | integer | No | Cantidad de frases publicitarias (0-30) |
| `ad_phrases` | array | No | Frases publicitarias personalizadas |
| `generate_final_audio` | boolean | No | Generar audio combinado final |
| `auto_publish` | object | No | Configuración de publicación automática |

### **GET `/api/generate-newscast/status/[reportId]`**
Consulta el estado de generación de un noticiero.

**Response:**
```json
{
  "success": true,
  "data": {
    "report_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "progress": {
      "current_step": "rewriting_news",
      "completed_steps": ["scraping", "selection"],
      "total_steps": 6,
      "percentage": 40
    },
    "estimated_completion": "2024-09-08T15:35:00.000Z",
    "current_cost": 1.23,
    "items_processed": 8,
    "total_items": 12
  }
}
```

**Estados posibles:**
- `generating` - Generación iniciada
- `scraping` - Extrayendo noticias
- `processing` - Reescribiendo y generando audio
- `finalizing` - Combinando audio final
- `completed` - Completado exitosamente
- `failed` - Error en la generación

## 📋 **PLANTILLAS DE NOTICIEROS**

### **GET `/api/templates`**
Obtiene las plantillas del usuario.

**Query Parameters:**
```
?limit=20&offset=0&region=Santiago&active_only=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "uuid",
        "name": "Noticiero Matutino",
        "region": "Santiago",
        "duration_minutes": 15,
        "categories": ["política", "economía"],
        "ai_profile": "balanced",
        "ai_settings": {},
        "ad_phrases_count": 5,
        "is_active": true,
        "usage_count": 23,
        "last_used_at": "2024-09-08T08:00:00.000Z",
        "created_at": "2024-09-01T10:00:00.000Z"
      }
    ],
    "total": 5,
    "has_more": false,
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total_pages": 1
    }
  }
}
```

### **POST `/api/templates`**
Crea una nueva plantilla.

**Request:**
```json
{
  "name": "Noticiero Vespertino",
  "region": "Valparaíso",
  "duration_minutes": 20,
  "categories": ["economía", "internacional", "deportes"],
  "ai_profile": "premium",
  "ai_settings": {
    "voice_provider": "elevenlabs",
    "voice_id": "21m00Tcm4TlvDq8ikWAM"
  },
  "ad_phrases_count": 8,
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "nuevo-uuid",
    "name": "Noticiero Vespertino",
    /* otros campos */
  },
  "message": "Plantilla creada exitosamente"
}
```

### **PUT `/api/templates/[id]`**
Actualiza una plantilla existente.

### **DELETE `/api/templates/[id]`**
Elimina una plantilla.

**Response:**
```json
{
  "success": true,
  "message": "Plantilla eliminada exitosamente"
}
```

## 📊 **REPORTES DE NOTICIEROS**

### **GET `/api/reports`**
Obtiene los reportes/noticieros generados.

**Query Parameters:**
```
?limit=20&offset=0&status=completed&region=Santiago&start_date=2024-09-01&end_date=2024-09-30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "uuid",
        "title": "Noticiero Santiago - 8 Sep 2024",
        "region": "Santiago",
        "status": "completed",
        "total_duration_seconds": 900,
        "total_cost_usd": 2.45,
        "final_audio_url": "https://s3.../final_audio.mp3",
        "thumbnail_url": "https://upload.wikimedia.org/wikipedia/commons/2/21/Speaker_Icon.svg",
        "play_count": 15,
        "tokens_used": {
          "openai": 1500,
          "elevenlabs": 5000,
          "azure": 0
        },
        "generation_time_seconds": 180,
        "ai_profile_used": "balanced",
        "categories_count": {
          "política": 3,
          "economía": 2,
          "deportes": 1
        },
        "created_at": "2024-09-08T08:00:00.000Z",
        "generation_completed_at": "2024-09-08T08:03:00.000Z"
      }
    ],
    "total": 45,
    "has_more": true,
    "summary": {
      "total_cost": 125.67,
      "total_audio_minutes": 1250,
      "avg_cost_per_report": 2.79
    }
  }
}
```

### **GET `/api/reports/[id]`**
Obtiene detalles completos de un reporte específico.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Noticiero Santiago - 8 Sep 2024",
    "region": "Santiago",
    "status": "completed",
    "total_duration_seconds": 900,
    
    "timeline_data": [
      {
        "id": "news_1",
        "type": "news",
        "title": "Presidente anuncia nuevas medidas económicas",
        "category": "política",
        "original_content": "Texto extraído original...",
        "rewritten_content": "Texto reescrito por IA...",
        "humanized_content": "Texto humanizado final...",
        "current_version": "humanized",
        "audio_url": "https://s3.../news_1_audio.mp3",
        "duration_seconds": 45,
        "order_index": 0,
        "source_name": "Emol",
        "source_url": "https://www.emol.com/...",
        "keywords": ["presidente", "economía", "medidas"],
        "sentiment_score": 0.2,
        "cost_breakdown": {
          "rewrite": 0.15,
          "humanization": 0.12,
          "tts": 0.25,
          "total": 0.52
        },
        "tokens_used": {
          "rewrite": 150,
          "humanization": 120,
          "tts": 850
        },
        "created_at": "2024-09-08T08:01:00.000Z"
      },
      {
        "id": "ad_1",
        "type": "advertisement",
        "content": "Esta programación llega a usted gracias a Radio Norte",
        "audio_url": "https://s3.../ad_1.mp3",
        "duration_seconds": 15,
        "order_index": 1,
        "cost_breakdown": {
          "tts": 0.08,
          "total": 0.08
        }
      }
    ],
    
    "final_audio_url": "https://s3.../final_newscast.mp3",
    "transcript": "Texto completo del noticiero...",
    "summary": "Resumen automático del contenido...",
    
    "metadata": {
      "total_cost_usd": 2.45,
      "cost_breakdown": {
        "scraping": 0.05,
        "rewriting": 0.85,
        "humanization": 0.45,
        "tts": 1.10
      },
      "tokens_used": {
        "openai_total": 1500,
        "elevenlabs_chars": 5000,
        "azure_chars": 0
      },
      "processing_time_seconds": 180,
      "ai_settings_used": {
        "extraction_model": "gpt-3.5-turbo",
        "rewrite_model": "gpt-4-turbo",
        "voice_provider": "elevenlabs"
      },
      "news_sources_used": ["Emol", "La Tercera", "BioBío"],
      "categories_distribution": {
        "política": 40,
        "economía": 35,
        "deportes": 15,
        "internacional": 10
      }
    },
    
    "sharing": {
      "public_url": "https://tu-dominio.com/listen/uuid",
      "embed_code": "<iframe src='...' width='400' height='200'></iframe>",
      "social_media_urls": {
        "twitter": "https://twitter.com/...",
        "facebook": "https://facebook.com/..."
      }
    },
    
    "analytics": {
      "play_count": 15,
      "unique_listeners": 12,
      "completion_rate": 0.85,
      "peak_concurrent": 3,
      "geographic_distribution": {
        "Santiago": 60,
        "Valparaíso": 25,
        "Otros": 15
      }
    }
  }
}
```

### **PUT `/api/reports/[id]`**
Actualiza un reporte (editar timeline, regenerar audio, etc.)

**Request - Editar contenido:**
```json
{
  "action": "update_timeline",
  "timeline_updates": [
    {
      "id": "news_1",
      "title": "Nuevo título editado",
      "rewritten_content": "Contenido editado manualmente...",
      "regenerate_audio": true
    },
    {
      "id": "news_2",
      "delete": true
    }
  ]
}
```

**Request - Cambiar orden:**
```json
{
  "action": "reorder_timeline",
  "new_order": ["ad_1", "news_1", "news_3", "ad_2", "news_2"]
}
```

**Request - Ajustar duración:**
```json
{
  "action": "adjust_duration",
  "target_duration_minutes": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_items": ["news_1"],
    "deleted_items": ["news_2"],
    "new_total_duration": 550,
    "additional_cost": 0.25,
    "processing_time": 45
  },
  "message": "Timeline actualizado exitosamente"
}
```

### **DELETE `/api/reports/[id]`**
Elimina un reporte completamente.

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted_files": ["final_audio.mp3", "news_1_audio.mp3", "ad_1.mp3"],
    "cost_refunded": 0.00
  },
  "message": "Reporte eliminado exitosamente"
}
```

## 🎵 **BIBLIOTECA DE AUDIO**

### **GET `/api/audio-library`**
Obtiene elementos de la biblioteca de audio.

**Query Parameters:**
```
?type=music&tags=cortina&search=mañana&limit=20&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Cortina Musical Mañana",
        "description": "Cortina energética para programas matutinos",
        "type": "music",
        "file_url": "https://s3.../cortina_morning.mp3",
        "duration_seconds": 30,
        "file_size_bytes": 720000,
        "mime_type": "audio/mpeg",
        "tags": ["cortina", "mañana", "energético", "instrumental"],
        "is_favorite": true,
        "usage_count": 45,
        "last_used_at": "2024-09-08T08:00:00.000Z",
        "waveform_url": "https://i.ytimg.com/vi/XmviP0zKxm8/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBzC7H9rEHD3TLofvbQvGaKyz7-bg",
        "metadata": {
          "bpm": 120,
          "key": "C Major",
          "genre": "Corporate"
        },
        "created_at": "2024-09-01T10:00:00.000Z"
      }
    ],
    "total": 125,
    "has_more": true,
    "categories": {
      "music": 45,
      "sfx": 32,
      "ads": 28,
      "voice": 20
    }
  }
}
```

### **POST `/api/audio-library/upload`**
Sube nuevo audio a la biblioteca.

**Request (Multipart Form Data):**
```
file: [archivo MP3/WAV]
name: "Mi Nuevo Audio"
type: "music"
description: "Descripción opcional"
tags: ["tag1", "tag2", "tag3"]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "nuevo-uuid",
    "name": "Mi Nuevo Audio",
    "file_url": "https://s3.../uploaded_audio.mp3",
    "duration_seconds": 120,
    "file_size_bytes": 2400000,
    "processing_status": "completed",
    "waveform_generated": true
  },
  "message": "Audio subido exitosamente"
}
```

### **PUT `/api/audio-library/[id]`**
Actualiza metadatos de un audio.

**Request:**
```json
{
  "name": "Nombre actualizado",
  "description": "Nueva descripción",
  "tags": ["tag1", "nuevo_tag"],
  "is_favorite": true
}
```

### **DELETE `/api/audio-library/[id]`**
Elimina un audio de la biblioteca.

## 🤖 **AUTOMATIZACIÓN**

### **GET `/api/automation/jobs`**
Obtiene trabajos de automatización.

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "name": "Noticiero Diario 7 AM",
        "template_id": "template-uuid",
        "template_name": "Plantilla Matutina",
        "frequency": "daily",
        "schedule_data": {
          "time": "07:00",
          "timezone": "America/Santiago"
        },
        "is_active": true,
        "next_run_at": "2024-09-09T07:00:00.000Z",
        "last_run_at": "2024-09-08T07:00:00.000Z",
        "last_run_status": "success",
        "last_run_report_id": "report-uuid",
        "success_rate": 95.5,
        "total_runs": 22,
        "successful_runs": 21,
        "failed_runs": 1,
        "auto_publish_settings": {
          "twitter": true,
          "facebook": false
        },
        "notification_settings": {
          "email_on_success": false,
          "email_on_failure": true
        },
        "created_at": "2024-09-01T10:00:00.000Z"
      }
    ],
    "summary": {
      "total_jobs": 3,
      "active_jobs": 2,
      "inactive_jobs": 1,
      "next_execution": "2024-09-09T07:00:00.000Z"
    }
  }
}
```

### **POST `/api/automation/jobs`**
Crea un nuevo trabajo de automatización.

**Request:**
```json
{
  "name": "Noticiero Automático Tarde",
  "template_id": "template-uuid",
  "frequency": "specific_days",
  "schedule_data": {
    "days": [1, 2, 3, 4, 5],
    "time": "14:00",
    "timezone": "America/Santiago"
  },
  "auto_publish_settings": {
    "twitter": true,
    "facebook": true,
    "instagram": false
  },
  "notification_settings": {
    "email_on_success": false,
    "email_on_failure": true,
    "webhook_url": "https://mi-webhook.com/notify"
  },
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "nuevo-uuid",
    "name": "Noticiero Automático Tarde",
    "next_run_at": "2024-09-09T14:00:00.000Z",
    "cron_expression": "0 14 * * 1-5"
  },
  "message": "Automatización creada exitosamente"
}
```

### **PUT `/api/automation/jobs/[id]`**
Actualiza un trabajo de automatización.

### **DELETE `/api/automation/jobs/[id]`**
Elimina un trabajo de automatización.

### **POST `/api/automation/jobs/[id]/run`**
Ejecuta manualmente un trabajo de automatización.

**Response:**
```json
{
  "success": true,
  "data": {
    "execution_id": "execution-uuid",
    "report_id": "report-uuid",
    "status": "running",
    "estimated_completion": "2024-09-08T15:05:00.000Z"
  },
  "message": "Ejecución manual iniciada"
}
```

## 🌐 **FUENTES DE NOTICIAS**

### **GET `/api/news-sources`**
Obtiene fuentes de noticias configuradas.

**Query Parameters:**
```
?region=Santiago&category=política&active_only=true&user_only=false
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "id": "uuid",
        "name": "Emol",
        "url": "https://www.emol.com",
        "rss_url": "https://www.emol.com/rss/rss.asp",
        "region": "Nacional",
        "category": "general",
        "is_active": true,
        "is_global": true,
        "is_user_source": false,
        "last_scraped_at": "2024-09-08T15:00:00.000Z",
        "scraping_frequency_minutes": 60,
        "success_rate": 98.5,
        "articles_scraped_today": 45,
        "avg_articles_per_day": 52,
        "quality_score": 9.2,
        "reliability_rating": "high",
        "created_at": "2024-09-01T10:00:00.000Z"
      }
    ],
    "global_sources": 15,
    "user_sources": 3,
    "regional_distribution": {
      "Nacional": 8,
      "Santiago": 4,
      "Valparaíso": 3,
      "Antofagasta": 3
    }
  }
}
```

### **POST `/api/news-sources`**
Agrega nueva fuente de noticias.

**Request:**
```json
{
  "name": "Diario Regional Norte",
  "url": "https://diarioregional.cl",
  "rss_url": "https://diarioregional.cl/rss.xml",
  "region": "Antofagasta",
  "category": "regional",
  "scraping_frequency_minutes": 120,
  "is_active": true
}
```

### **PUT `/api/news-sources/[id]`**
Actualiza configuración de una fuente.

### **DELETE `/api/news-sources/[id]`**
Elimina una fuente de noticias personalizada.

### **POST `/api/news-sources/[id]/test`**
Prueba la conectividad y calidad de una fuente.

**Response:**
```json
{
  "success": true,
  "data": {
    "connectivity": "ok",
    "response_time_ms": 245,
    "rss_valid": true,
    "articles_found": 23,
    "content_quality": "good",
    "language_detected": "es",
    "last_article_date": "2024-09-08T14:30:00.000Z",
    "issues": []
  }
}
```

## 📊 **MÉTRICAS Y ANÁLISIS**

### **GET `/api/metrics/dashboard`**
Obtiene métricas para el dashboard principal.

**Query Parameters:**
```
?period=7d&region=Santiago&compare_previous=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-09-01T00:00:00.000Z",
      "end": "2024-09-08T23:59:59.000Z",
      "days": 7
    },
    
    "summary": {
      "total_reports": 25,
      "total_cost_usd": 67.45,
      "total_audio_minutes": 450,
      "avg_cost_per_report": 2.70,
      "success_rate": 96.0,
      "total_plays": 342,
      "unique_listeners": 156
    },
    
    "comparison": {
      "previous_period": {
        "total_reports": 18,
        "total_cost_usd": 48.30
      },
      "growth": {
        "reports": 38.9,
        "cost": 39.6
      }
    },
    
    "daily_stats": [
      {
        "date": "2024-09-08",
        "reports_generated": 5,
        "cost_usd": 12.45,
        "audio_minutes": 90,
        "plays": 67,
        "unique_listeners": 34,
        "peak_hour": "08:00",
        "most_popular_category": "política"
      }
    ],
    
    "cost_breakdown": {
      "by_service": {
        "elevenlabs": 42.30,
        "openai": 18.67,
        "azure": 6.48
      },
      "by_operation": {
        "text_to_speech": 48.78,
        "rewriting": 12.45,
        "humanization": 6.22
      }
    },
    
    "content_analytics": {
      "top_categories": [
        { "category": "política", "count": 45, "percentage": 36.0 },
        { "category": "economía", "count": 32, "percentage": 25.6 }
      ],
      "regional_activity": [
        { "region": "Santiago", "count": 78, "percentage": 62.4 },
        { "region": "Valparaíso", "count": 25, "percentage": 20.0 }
      ],
      "source_performance": [
        { "source": "Emol", "articles_used": 23, "reliability": 98.5 },
        { "source": "La Tercera", "articles_used": 18, "reliability": 96.2 }
      ]
    },
    
    "performance_metrics": {
      "avg_generation_time": 145,
      "fastest_generation": 89,
      "slowest_generation": 234,
      "service_uptime": 99.8,
      "error_rate": 0.02
    }
  }
}
```

### **GET `/api/metrics/costs`**
Análisis detallado de costos.

**Query Parameters:**
```
?start_date=2024-09-01&end_date=2024-09-30&group_by=service&include_projections=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-09-01",
      "end": "2024-09-30",
      "days": 30
    },
    
    "totals": {
      "cost_usd": 234.56,
      "reports_generated": 89,
      "avg_cost_per_report": 2.64
    },
    
    "by_service": [
      {
        "service": "elevenlabs",
        "cost_usd": 145.67,
        "percentage": 62.1,
        "requests": 178,
        "characters_processed": 234567,
        "avg_cost_per_request": 0.82,
        "cost_per_1k_chars": 0.62
      }
    ],
    
    "daily_breakdown": [
      {
        "date": "2024-09-01",
        "total_cost": 8.45,
        "reports": 3,
        "by_service": {
          "elevenlabs": 5.67,
          "openai": 2.78
        }
      }
    ],
    
    "trends": {
      "cost_trend": "increasing",
      "efficiency_trend": "stable",
      "usage_trend": "increasing"
    },
    
    "projections": {
      "current_month": 278.90,
      "next_month": 295.20,
      "confidence_level": 0.85
    },
    
    "optimization_suggestions": [
      {
        "type": "cost_reduction",
        "suggestion": "Usar perfil 'económico' para pruebas puede reducir costos 40%",
        "potential_savings": 23.45
      }
    ]
  }
}
```

### **GET `/api/metrics/usage`**
Métricas de uso de tokens y recursos.

### **GET `/api/metrics/performance`**
Métricas de rendimiento del sistema.

### **GET `/api/metrics/content`**
Análisis de contenido generado.

## 🔗 **INTEGRACIONES SOCIALES**

### **GET `/api/integrations/social`**
Obtiene configuraciones de redes sociales.

**Response:**
```json
{
  "success": true,
  "data": {
    "integrations": [
      {
        "platform": "twitter",
        "is_connected": true,
        "account_name": "@mi_radio_norte",
        "auto_publish_enabled": true,
        "last_published_at": "2024-09-08T08:30:00.000Z",
        "posts_count": 45,
        "followers_count": 2341,
        "engagement_rate": 3.4,
        "publish_settings": {
          "include_audio": true,
          "include_transcript": false,
          "hashtags": ["#NoticiasChile", "#RadioNorte"]
        }
      }
    ],
    "available_platforms": ["twitter", "facebook", "instagram", "linkedin", "spotify"]
  }
}
```

### **POST `/api/integrations/social/connect`**
Conecta nueva red social.

**Request:**
```json
{
  "platform": "twitter",
  "oauth_token": "token_from_oauth_flow",
  "oauth_secret": "secret_from_oauth_flow"
}
```

### **PUT `/api/integrations/social/[platform]/settings`**
Actualiza configuración de publicación.

### **DELETE `/api/integrations/social/[platform]`**
Desconecta red social.

### **POST `/api/integrations/social/publish`**
Publica contenido manualmente.

**Request:**
```json
{
  "report_id": "uuid",
  "platforms": ["twitter", "facebook"],
  "custom_message": "🎙️ Nuevo noticiero disponible",
  "include_audio": true,
  "schedule_at": "2024-09-08T20:00:00.000Z"
}
```

## 💳 **PAGOS Y FACTURACIÓN**

### **GET `/api/payments/history`**
Obtiene historial de pagos.

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "payment-uuid",
        "amount": 2500,
        "currency": "CLP",
        "status": "completed",
        "method": "credit_card",
        "description": "Plan Profesional - Septiembre 2024",
        "mp_payment_id": "12345678",
        "created_at": "2024-09-01T10:00:00.000Z",
        "processed_at": "2024-09-01T10:02:15.000Z"
      }
    ],
    "summary": {
      "total_spent": 12500,
      "this_month": 2500,
      "last_month": 2500,
      "pending_amount": 0
    }
  }
}
```

### **POST `/api/payments/create-preference`**
Crea preferencia de pago MercadoPago.

**Request:**
```json
{
  "plan": "professional",
  "amount": 2500,
  "description": "Plan Profesional - Octubre 2024"
}
```

### **GET `/api/invoices`**
Obtiene facturas.

### **GET `/api/invoices/[id]/pdf`**
Descarga factura en PDF.

## 🔧 **CONFIGURACIÓN DE USUARIO**

### **GET `/api/user/profile`**
Obtiene perfil del usuario.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez",
    "image": "https://upload.wikimedia.org/wikipedia/commons/b/b8/Juan_Domingo_Per%C3%B3n_%28cropped_2%29.jpg",
    "role": "user",
    "subscription": {
      "plan": "professional",
      "status": "active",
      "expires_at": "2024-10-01T00:00:00.000Z",
      "usage": {
        "reports_generated": 23,
        "reports_limit": 200,
        "cost_used": 67.45,
        "cost_limit": 150.00
      }
    },
    "preferences": {
      "default_region": "Santiago",
      "default_ai_profile": "balanced",
      "notification_email": true,
      "auto_publish_twitter": true
    },
    "statistics": {
      "total_reports": 89,
      "total_cost": 234.56,
      "member_since": "2024-09-01T00:00:00.000Z",
      "last_login": "2024-09-08T15:00:00.000Z"
    }
  }
}
```

### **PUT `/api/user/profile`**
Actualiza perfil del usuario.

### **GET `/api/user/api-keys`**
Obtiene API keys del usuario.

### **POST `/api/user/api-keys`**
Genera nueva API key.

**Request:**
```json
{
  "name": "Integración Mi App",
  "permissions": ["read_reports", "create_reports"],
  "expires_in_days": 365
}
```

### **DELETE `/api/user/api-keys/[id]`**
Revoca API key.

## 🔍 **BÚSQUEDA Y FILTROS**

### **GET `/api/search/reports`**
Búsqueda avanzada en reportes.

**Query Parameters:**
```
?q=política económica&region=Santiago&date_from=2024-09-01&cost_min=2.00&cost_max=5.00&sort=created_at&order=desc
```

### **GET `/api/search/audio`**
Búsqueda en biblioteca de audio.

### **GET `/api/search/news`**
Búsqueda en noticias extraídas.

## 📡 **WEBHOOKS**

### **GET `/api/webhooks`**
Obtiene webhooks configurados.

### **POST `/api/webhooks`**
Configura nuevo webhook.

**Request:**
```json
{
  "url": "https://mi-app.com/webhook/vira",
  "events": ["report_completed", "report_failed", "payment_processed"],
  "secret": "mi_webhook_secret_123"
}
```

### **Eventos de Webhook**

#### **report_completed**
```json
{
  "event": "report_completed",
  "data": {
    "report_id": "uuid",
    "title": "Noticiero Santiago - 8 Sep 2024",
    "final_audio_url": "https://s3.../final_audio.mp3",
    "duration_seconds": 900,
    "total_cost": 2.45
  },
  "timestamp": "2024-09-08T15:30:00.000Z"
}
```

#### **report_failed**
```json
{
  "event": "report_failed",
  "data": {
    "report_id": "uuid",
    "error_message": "Error en síntesis de voz",
    "failed_step": "audio_generation"
  },
  "timestamp": "2024-09-08T15:30:00.000Z"
}
```

## 🚀 **LÍMITES Y RATE LIMITING**

### **Límites por Plan**

| Plan | Requests/minuto | Reports/mes | Costo máximo/mes |
|------|-----------------|-------------|------------------|
| Básico | 60 | 50 | $50 USD |
| Profesional | 120 | 200 | $150 USD |
| Empresa | 300 | Ilimitado | $500 USD |

### **Headers de Rate Limiting**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1694185200
X-RateLimit-Retry-After: 900
```

### **Respuesta cuando se excede el límite:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 15 minutes.",
    "retry_after": 900
  }
}
```

## 🔐 **AUTENTICACIÓN API**

### **Obtener Token de API**
```bash
curl -X POST https://tu-dominio.com/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

### **Usar Token en Requests**
```bash
curl -H "Authorization: Bearer tu_token_aquí" \
  https://tu-dominio.com/api/reports
```

### **Renovar Token**
```bash
curl -X POST https://tu-dominio.com/api/auth/refresh \
  -H "Authorization: Bearer tu_refresh_token"
```

---

## 📚 **EJEMPLOS DE INTEGRACIÓN**

### **JavaScript/Node.js**
```javascript
// Cliente VIRA
class ViraAPI {
  constructor(apiKey, baseUrl = 'https://tu-dominio.com/api') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async generateNewscast(config) {
    return this.request('/generate-newscast', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async getReports(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/reports?${params}`);
  }
}

// Uso
const vira = new ViraAPI('tu_api_key');

const newscast = await vira.generateNewscast({
  region: 'Santiago',
  duration_minutes: 15,
  categories: ['política', 'economía']
});

console.log('Noticiero generado:', newscast.data.report_id);
```

### **Python**
```python
import requests

class ViraAPI:
    def __init__(self, api_key, base_url='https://tu-dominio.com/api'):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })

    def generate_newscast(self, config):
        response = self.session.post(f'{self.base_url}/generate-newscast', json=config)
        response.raise_for_status()
        return response.json()

    def get_reports(self, **filters):
        response = self.session.get(f'{self.base_url}/reports', params=filters)
        response.raise_for_status()
        return response.json()

# Uso
vira = ViraAPI('tu_api_key')

newscast = vira.generate_newscast({
    'region': 'Santiago',
    'duration_minutes': 15,
    'categories': ['política', 'economía']
})

print(f"Noticiero generado: {newscast['data']['report_id']}")
```

### **cURL Examples**
```bash
# Generar noticiero
curl -X POST https://tu-dominio.com/api/generate-newscast \
  -H "Authorization: Bearer tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "region": "Santiago",
    "duration_minutes": 15,
    "categories": ["política", "economía"],
    "ai_profile": "balanced"
  }'

# Obtener reportes
curl -H "Authorization: Bearer tu_api_key" \
  "https://tu-dominio.com/api/reports?limit=10&status=completed"

# Subir audio
curl -X POST https://tu-dominio.com/api/audio-library/upload \
  -H "Authorization: Bearer tu_api_key" \
  -F "file=@mi_audio.mp3" \
  -F "name=Mi Audio" \
  -F "type=music"
```

---

**Esta documentación de APIs te permite integrar VIRA con cualquier sistema externo. Todas las APIs están optimizadas para performance y incluyen manejo robusto de errores.**

**Para soporte técnico con las APIs, consulta el Manual Técnico o contacta al soporte.**
