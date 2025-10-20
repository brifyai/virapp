
-- ==================================================
-- VIRA - Sistema de Noticieros Automáticos
-- Schema SQL para Supabase (PostgreSQL)
-- ==================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================================================
-- TABLAS DE AUTENTICACIÓN (NextAuth.js)
-- ==================================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT,
    "email" TEXT UNIQUE NOT NULL,
    "email_verified" TIMESTAMPTZ,
    "image" TEXT,
    "role" TEXT DEFAULT 'user',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de cuentas (OAuth providers)
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("provider", "provider_account_id")
);

-- Tabla de sesiones
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "session_token" TEXT UNIQUE NOT NULL,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "expires" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de tokens de verificación
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT UNIQUE NOT NULL,
    "expires" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("identifier", "token")
);

-- ==================================================
-- TABLAS PRINCIPALES DE VIRA
-- ==================================================

-- Estaciones de radio
CREATE TABLE IF NOT EXISTS "radio_stations" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT UNIQUE NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "description" TEXT,
    "region" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "owner_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Plantillas de noticieros
CREATE TABLE IF NOT EXISTS "newscast_templates" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "region" TEXT NOT NULL,
    "radio_station" TEXT,
    "duration_minutes" INTEGER DEFAULT 15,
    "voice_provider" TEXT DEFAULT 'openai',
    "voice_id" TEXT DEFAULT 'nova',
    "include_weather" BOOLEAN DEFAULT true,
    "include_time" BOOLEAN DEFAULT true,
    "ad_frequency" INTEGER DEFAULT 2,
    "categories" JSONB DEFAULT '[]',
    "configuration" JSONB DEFAULT '{}',
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Reportes/Noticieros generados
CREATE TABLE IF NOT EXISTS "news_reports" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "content" TEXT,
    "timeline_data" JSONB,
    "audio_url" TEXT,
    "s3_key" TEXT,
    "duration_seconds" INTEGER,
    "status" TEXT DEFAULT 'generated', -- generated, processing, completed, failed
    "generation_cost" NUMERIC(10,4) DEFAULT 0,
    "token_count" INTEGER DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "radio_station_id" UUID REFERENCES "radio_stations"("id") ON DELETE CASCADE,
    "template_id" UUID REFERENCES "newscast_templates"("id") ON DELETE SET NULL,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "published_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Fuentes de noticias
CREATE TABLE IF NOT EXISTS "news_sources" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "rss_url" TEXT,
    "region" TEXT,
    "category" TEXT DEFAULT 'general',
    "is_active" BOOLEAN DEFAULT true,
    "scraping_config" JSONB DEFAULT '{}',
    "last_scraped" TIMESTAMPTZ,
    "success_rate" NUMERIC(3,2) DEFAULT 1.0,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Noticias scrapeadas
CREATE TABLE IF NOT EXISTS "scraped_news" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "content" TEXT,
    "summary" TEXT,
    "url" TEXT UNIQUE,
    "source_id" UUID REFERENCES "news_sources"("id") ON DELETE CASCADE,
    "category" TEXT DEFAULT 'general',
    "sentiment" TEXT DEFAULT 'neutral', -- positive, negative, neutral
    "priority" TEXT DEFAULT 'medium', -- high, medium, low
    "region" TEXT,
    "author" TEXT,
    "image_url" TEXT,
    "published_date" TIMESTAMPTZ,
    "scraped_at" TIMESTAMPTZ DEFAULT NOW(),
    "is_processed" BOOLEAN DEFAULT false,
    "embedding" VECTOR(1536) -- Para búsquedas semánticas (opcional)
);

-- Campañas publicitarias
CREATE TABLE IF NOT EXISTS "ad_campaigns" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "audio_url" TEXT,
    "s3_key" TEXT,
    "duration_seconds" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "reproductions" INTEGER DEFAULT 0,
    "start_date" DATE,
    "end_date" DATE,
    "radio_station_id" UUID REFERENCES "radio_stations"("id") ON DELETE CASCADE,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Biblioteca de música y efectos
CREATE TABLE IF NOT EXISTS "audio_library" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- music, jingle, sfx, intro, outro
    "category" TEXT, -- cortinas, efectos, musica_fondo
    "audio_url" TEXT,
    "s3_key" TEXT,
    "duration_seconds" INTEGER,
    "volume_level" NUMERIC(3,2) DEFAULT 1.0,
    "fade_in" INTEGER DEFAULT 0,
    "fade_out" INTEGER DEFAULT 0,
    "reproductions" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "metadata" JSONB DEFAULT '{}',
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Voces clonadas
CREATE TABLE IF NOT EXISTS "cloned_voices" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT NOT NULL, -- elevenlabs, azure, etc.
    "voice_id" TEXT NOT NULL,
    "status" TEXT DEFAULT 'training', -- training, ready, failed
    "training_files" JSONB DEFAULT '[]',
    "quality_score" NUMERIC(3,2),
    "usage_count" INTEGER DEFAULT 0,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Configuraciones de TTS
CREATE TABLE IF NOT EXISTS "tts_configurations" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL,
    "settings" JSONB DEFAULT '{}',
    "is_default" BOOLEAN DEFAULT false,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Integraciones con redes sociales
CREATE TABLE IF NOT EXISTS "social_integrations" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "platform" TEXT NOT NULL, -- twitter, facebook, instagram, spotify
    "account_name" TEXT,
    "is_active" BOOLEAN DEFAULT false,
    "configuration" JSONB DEFAULT '{}',
    "last_post" TIMESTAMPTZ,
    "posts_count" INTEGER DEFAULT 0,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("user_id", "platform")
);

-- Automatización de tareas
CREATE TABLE IF NOT EXISTS "automation_jobs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- newscast, social_post, scraping
    "schedule" TEXT, -- cron expression
    "is_active" BOOLEAN DEFAULT true,
    "configuration" JSONB DEFAULT '{}',
    "last_run" TIMESTAMPTZ,
    "next_run" TIMESTAMPTZ,
    "run_count" INTEGER DEFAULT 0,
    "success_count" INTEGER DEFAULT 0,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Uso de tokens y costos
CREATE TABLE IF NOT EXISTS "token_usage" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "service" TEXT NOT NULL, -- openai, elevenlabs, azure, etc.
    "operation" TEXT NOT NULL, -- tts, text_processing, scraping
    "tokens_used" INTEGER DEFAULT 0,
    "cost" NUMERIC(10,4) DEFAULT 0,
    "currency" TEXT DEFAULT 'USD',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Métricas diarias
CREATE TABLE IF NOT EXISTS "daily_metrics" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "date" DATE UNIQUE NOT NULL,
    "total_news_reports" INTEGER DEFAULT 0,
    "total_cost" NUMERIC(10,4) DEFAULT 0,
    "total_tokens" INTEGER DEFAULT 0,
    "active_users" INTEGER DEFAULT 0,
    "active_radio_stations" INTEGER DEFAULT 0,
    "scraping_success_rate" NUMERIC(3,2) DEFAULT 1.0,
    "avg_processing_time" INTEGER, -- en segundos
    "metrics_data" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Archivos subidos
CREATE TABLE IF NOT EXISTS "uploaded_files" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "original_name" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "s3_key" TEXT UNIQUE NOT NULL,
    "content_type" TEXT,
    "file_size" BIGINT,
    "upload_type" TEXT, -- audio, image, document
    "metadata" JSONB DEFAULT '{}',
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ==================================================

-- Índices para autenticación
CREATE INDEX IF NOT EXISTS "idx_accounts_user_id" ON "accounts"("user_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions"("user_id");

-- Índices para funcionalidades principales
CREATE INDEX IF NOT EXISTS "idx_news_reports_user_id" ON "news_reports"("user_id");
CREATE INDEX IF NOT EXISTS "idx_news_reports_created_at" ON "news_reports"("created_at");
CREATE INDEX IF NOT EXISTS "idx_news_reports_status" ON "news_reports"("status");

CREATE INDEX IF NOT EXISTS "idx_scraped_news_source_id" ON "scraped_news"("source_id");
CREATE INDEX IF NOT EXISTS "idx_scraped_news_published_date" ON "scraped_news"("published_date");
CREATE INDEX IF NOT EXISTS "idx_scraped_news_region" ON "scraped_news"("region");
CREATE INDEX IF NOT EXISTS "idx_scraped_news_category" ON "scraped_news"("category");

CREATE INDEX IF NOT EXISTS "idx_news_sources_region" ON "news_sources"("region");
CREATE INDEX IF NOT EXISTS "idx_news_sources_is_active" ON "news_sources"("is_active");

CREATE INDEX IF NOT EXISTS "idx_audio_library_type" ON "audio_library"("type");
CREATE INDEX IF NOT EXISTS "idx_audio_library_user_id" ON "audio_library"("user_id");

CREATE INDEX IF NOT EXISTS "idx_token_usage_user_id" ON "token_usage"("user_id");
CREATE INDEX IF NOT EXISTS "idx_token_usage_created_at" ON "token_usage"("created_at");

-- ==================================================
-- FUNCIONES TRIGGER PARA UPDATED_AT
-- ==================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas que tienen updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_radio_stations_updated_at BEFORE UPDATE ON "radio_stations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_newscast_templates_updated_at BEFORE UPDATE ON "newscast_templates" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_news_reports_updated_at BEFORE UPDATE ON "news_reports" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_news_sources_updated_at BEFORE UPDATE ON "news_sources" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ad_campaigns_updated_at BEFORE UPDATE ON "ad_campaigns" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audio_library_updated_at BEFORE UPDATE ON "audio_library" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cloned_voices_updated_at BEFORE UPDATE ON "cloned_voices" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tts_configurations_updated_at BEFORE UPDATE ON "tts_configurations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_integrations_updated_at BEFORE UPDATE ON "social_integrations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_jobs_updated_at BEFORE UPDATE ON "automation_jobs" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==================================================

-- Habilitar RLS en tablas de usuario
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de acceso
CREATE POLICY "Users can view own profile" ON "users" FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON "users" FOR UPDATE USING (auth.uid() = id);

-- RLS para tablas principales (usuarios solo pueden ver sus propios datos)
ALTER TABLE "newscast_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "news_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "news_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ad_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audio_library" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cloned_voices" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates" ON "newscast_templates" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reports" ON "news_reports" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sources" ON "news_sources" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own campaigns" ON "ad_campaigns" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own audio" ON "audio_library" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own voices" ON "cloned_voices" FOR ALL USING (auth.uid() = user_id);

-- ==================================================
-- DATOS DE MUESTRA (OPCIONAL)
-- ==================================================

-- Insertar regiones chilenas predefinidas
INSERT INTO "radio_stations" ("name", "slug", "region", "description") VALUES
('Radio Nacional', 'nacional', 'Metropolitana de Santiago', 'Estación nacional principal'),
('Radio Norte', 'norte', 'Antofagasta', 'Cobertura región norte'),
('Radio Sur', 'sur', 'Biobío', 'Cobertura región sur'),
('Radio Centro', 'centro', 'Valparaíso', 'Cobertura región central')
ON CONFLICT (slug) DO NOTHING;

-- Insertar fuentes de noticias chilenas principales
INSERT INTO "news_sources" ("name", "url", "rss_url", "region", "category") VALUES
('El Mercurio Online', 'https://www.emol.com', 'https://www.emol.com/rss/rss.asp', 'nacional', 'general'),
('La Tercera', 'https://www.latercera.com', 'https://www.latercera.com/feed/', 'nacional', 'general'),
('BioBioChile', 'https://www.biobiochile.cl', 'https://www.biobiochile.cl/especial/rss/index.xml', 'nacional', 'general'),
('24Horas', 'https://www.24horas.cl', 'https://www.24horas.cl/rss/', 'nacional', 'general'),
('T13', 'https://www.t13.cl', 'https://www.t13.cl/rss/portada.xml', 'nacional', 'general')
ON CONFLICT (url) DO NOTHING;

-- Configuraciones TTS por defecto
INSERT INTO "tts_configurations" ("name", "provider", "voice_id", "settings", "is_default") VALUES
('OpenAI Nova (Español)', 'openai', 'nova', '{"speed": 1.0, "language": "es"}', true),
('Azure Catalina (Chilena)', 'azure', 'es-CL-CatalinaNeural', '{"rate": "0%", "pitch": "0%"}', false),
('ElevenLabs Adam', 'elevenlabs', 'pNInz6obpgDQGcFmaJgB', '{"stability": 0.5, "similarity_boost": 0.8}', false)
ON CONFLICT DO NOTHING;

-- ==================================================
-- VISTAS ÚTILES
-- ==================================================

-- Vista de estadísticas de usuarios
CREATE OR REPLACE VIEW "user_stats" AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.created_at,
    COUNT(DISTINCT nr.id) as total_reports,
    COUNT(DISTINCT nt.id) as total_templates,
    COUNT(DISTINCT ns.id) as total_sources,
    COALESCE(SUM(tu.cost), 0) as total_cost_used
FROM "users" u
LEFT JOIN "news_reports" nr ON u.id = nr.user_id
LEFT JOIN "newscast_templates" nt ON u.id = nt.user_id  
LEFT JOIN "news_sources" ns ON u.id = ns.user_id
LEFT JOIN "token_usage" tu ON u.id = tu.user_id
GROUP BY u.id, u.name, u.email, u.created_at;

-- Vista de noticias recientes con fuente
CREATE OR REPLACE VIEW "recent_news" AS
SELECT 
    sn.id,
    sn.title,
    sn.summary,
    sn.url,
    sn.category,
    sn.sentiment,
    sn.region,
    sn.published_date,
    ns.name as source_name,
    ns.url as source_url
FROM "scraped_news" sn
JOIN "news_sources" ns ON sn.source_id = ns.id
WHERE sn.published_date >= NOW() - INTERVAL '7 days'
ORDER BY sn.published_date DESC;

-- Vista de métricas del sistema
CREATE OR REPLACE VIEW "system_metrics" AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as reports_generated,
    SUM(generation_cost) as total_cost,
    AVG(duration_seconds) as avg_duration,
    COUNT(DISTINCT user_id) as active_users
FROM "news_reports"
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- ==================================================
-- FUNCIONES ÚTILES
-- ==================================================

-- Función para obtener noticias por región
CREATE OR REPLACE FUNCTION get_news_by_region(region_name TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    id UUID,
    title TEXT,
    summary TEXT,
    url TEXT,
    source_name TEXT,
    published_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sn.id,
        sn.title,
        sn.summary,
        sn.url,
        ns.name,
        sn.published_date
    FROM scraped_news sn
    JOIN news_sources ns ON sn.source_id = ns.id
    WHERE sn.region = region_name OR sn.region = 'nacional'
    ORDER BY sn.published_date DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular costo total del usuario
CREATE OR REPLACE FUNCTION get_user_total_cost(user_uuid UUID)
RETURNS NUMERIC AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(cost) FROM token_usage WHERE user_id = user_uuid),
        0
    );
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- COMENTARIOS FINALES
-- ==================================================

COMMENT ON DATABASE postgres IS 'VIRA - Sistema de Noticieros Automáticos para Radio';
COMMENT ON TABLE "news_reports" IS 'Noticieros generados por el sistema';
COMMENT ON TABLE "scraped_news" IS 'Noticias extraídas de fuentes chilenas';
COMMENT ON TABLE "audio_library" IS 'Biblioteca de música y efectos sonoros';
COMMENT ON TABLE "cloned_voices" IS 'Voces sintéticas entrenadas personalizadas';

-- Fin del schema
