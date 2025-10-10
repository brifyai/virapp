
-- ===================================================================
-- DATOS DE EJEMPLO PARA VIRA
-- ===================================================================
-- Este archivo contiene datos de ejemplo para poblar la base de datos
-- de VIRA con contenido inicial para testing y demostración.
-- 
-- INSTRUCCIONES DE USO:
-- 1. Asegúrate de haber ejecutado supabase_schema.sql primero
-- 2. Ejecuta este archivo en tu base de datos
-- 3. Los datos incluyen usuarios, plantillas, fuentes y métricas
-- ===================================================================

-- Insertar usuario administrador de ejemplo
INSERT INTO users (id, email, name, role, image, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin@vira.cl', 'Administrador VIRA', 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=faces', NOW()),
('550e8400-e29b-41d4-a716-446655440001', 'usuario@demo.cl', 'Usuario Demo', 'user', 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500', NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'radio.norte@ejemplo.cl', 'Radio Norte', 'user', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insertar fuentes de noticias globales
INSERT INTO news_sources (id, name, url, rss_url, region, category, is_active, is_global, last_scraped_at, scraping_frequency_minutes, created_at) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Emol', 'https://www.emol.com', 'https://www.emol.com/rss/rss.asp', 'Nacional', 'general', true, true, NOW() - INTERVAL '30 minutes', 60, NOW() - INTERVAL '30 days'),
('650e8400-e29b-41d4-a716-446655440002', 'La Tercera', 'https://www.latercera.com', 'https://www.latercera.com/feed/', 'Nacional', 'general', true, true, NOW() - INTERVAL '45 minutes', 60, NOW() - INTERVAL '30 days'),
('650e8400-e29b-41d4-a716-446655440003', 'BioBío Chile', 'https://www.biobiochile.cl', 'https://www.biobiochile.cl/especial/rss/index.xml', 'Nacional', 'general', true, true, NOW() - INTERVAL '15 minutes', 60, NOW() - INTERVAL '30 days'),
('650e8400-e29b-41d4-a716-446655440004', 'El Mercurio de Valparaíso', 'https://www.mercuriovalpo.cl', 'https://www.mercuriovalpo.cl/rss.xml', 'Valparaíso', 'regional', true, true, NOW() - INTERVAL '60 minutes', 120, NOW() - INTERVAL '25 days'),
('650e8400-e29b-41d4-a716-446655440005', 'El Nortero', 'https://www.elnortero.cl', 'https://www.elnortero.cl/feed', 'Antofagasta', 'regional', true, true, NOW() - INTERVAL '90 minutes', 120, NOW() - INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

-- Insertar fuentes personalizadas por usuario
INSERT INTO news_sources (id, user_id, name, url, rss_url, region, category, is_active, is_global, created_at) VALUES
('650e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440002', 'Radio Norte Noticias', 'https://radionorte.cl', 'https://radionorte.cl/noticias.rss', 'Antofagasta', 'regional', true, false, NOW() - INTERVAL '10 days'),
('650e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002', 'Municipalidad de Antofagasta', 'https://antofagasta.cl', 'https://antofagasta.cl/feed', 'Antofagasta', 'gobierno', true, false, NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insertar plantillas de noticieros
INSERT INTO newscast_templates (id, user_id, name, region, duration_minutes, categories, ai_profile, ai_settings, ad_phrases_count, is_active, created_at) VALUES
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Noticiero Matutino Norte', 'Antofagasta', 15, '["política", "economía", "regional"]', 'balanced', '{"voice_provider": "elevenlabs", "voice_id": "21m00Tcm4TlvDq8ikWAM"}', 5, true, NOW() - INTERVAL '15 days'),
('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Resumen Vespertino', 'Antofagasta', 10, '["economía", "deportes", "internacional"]', 'economic', '{"voice_provider": "azure", "voice_name": "es-CL-CatalinaNeural"}', 3, true, NOW() - INTERVAL '12 days'),
('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Noticiero Demo Santiago', 'Santiago', 20, '["política", "economía", "cultura", "tecnología"]', 'premium', '{"voice_provider": "elevenlabs", "voice_id": "pNInz6obpgDQGcFmaJgB"}', 8, true, NOW() - INTERVAL '8 days'),
('750e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Flash Informativo', 'Nacional', 5, '["política", "internacional"]', 'economic', '{"voice_provider": "aws-polly", "voice_id": "Conchita"}', 2, true, NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- Insertar reportes de noticieros generados
INSERT INTO news_reports (id, user_id, template_id, title, region, total_duration_seconds, timeline_data, final_audio_url, status, generation_started_at, generation_completed_at, total_cost, tokens_used, processing_time_seconds, ai_settings_used, categories_used, created_at) VALUES
('850e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 'Noticiero Matutino Norte - 8 Sep 2024', 'Antofagasta', 895, '[]', 'https://s3.amazonaws.com/vira-demo/newscast_morning_20240908.mp3', 'completed', NOW() - INTERVAL '2 days 8 hours', NOW() - INTERVAL '2 days 7 hours 55 minutes', 2.45, '{"openai": 1500, "elevenlabs": 5200}', 285, '{"rewrite_model": "gpt-4-turbo", "voice_provider": "elevenlabs"}', '["política", "economía", "regional"]', NOW() - INTERVAL '2 days 8 hours'),

('850e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 'Resumen Vespertino - 7 Sep 2024', 'Antofagasta', 598, '[]', 'https://s3.amazonaws.com/vira-demo/newscast_evening_20240907.mp3', 'completed', NOW() - INTERVAL '3 days 18 hours', NOW() - INTERVAL '3 days 17 hours 52 minutes', 1.67, '{"openai": 1200, "azure": 3400}', 156, '{"rewrite_model": "gpt-3.5-turbo", "voice_provider": "azure"}', '["economía", "deportes"]', NOW() - INTERVAL '3 days 18 hours'),

('850e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Noticiero Demo Santiago - 8 Sep 2024', 'Santiago', 1205, '[]', 'https://s3.amazonaws.com/vira-demo/newscast_santiago_20240908.mp3', 'completed', NOW() - INTERVAL '1 day 9 hours', NOW() - INTERVAL '1 day 8 hours 48 minutes', 4.23, '{"openai": 2200, "elevenlabs": 7800}', 445, '{"rewrite_model": "gpt-4-turbo", "voice_provider": "elevenlabs"}', '["política", "economía", "cultura", "tecnología"]', NOW() - INTERVAL '1 day 9 hours'),

('850e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Noticiero Matutino Norte - 7 Sep 2024', 'Antofagasta', 912, '[]', 'https://s3.amazonaws.com/vira-demo/newscast_morning_20240907.mp3', 'completed', NOW() - INTERVAL '3 days 8 hours', NOW() - INTERVAL '3 days 7 hours 56 minutes', 2.58, '{"openai": 1600, "elevenlabs": 5400}', 298, '{"rewrite_model": "gpt-4-turbo", "voice_provider": "elevenlabs"}', '["política", "economía", "regional"]', NOW() - INTERVAL '3 days 8 hours'),

('850e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Flash Informativo - 8 Sep 2024', 'Nacional', 301, '[]', 'https://s3.amazonaws.com/vira-demo/flash_20240908.mp3', 'completed', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours 52 minutes', 0.89, '{"openai": 600, "aws-polly": 1800}', 89, '{"rewrite_model": "gpt-3.5-turbo", "voice_provider": "aws-polly"}', '["política", "internacional"]', NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

-- Insertar noticias scrapeadas de ejemplo
INSERT INTO scraped_news (id, source_name, source_url, title, content, original_url, region, category, keywords, scraped_at, is_processed, original_content, word_count, reading_time_seconds, sentiment_score) VALUES
('950e8400-e29b-41d4-a716-446655440001', 'Emol', 'https://www.emol.com/noticias/economia/2024/09/08/politica-economica.html', 'Presidente anuncia nuevas medidas económicas para el segundo semestre', 'El Presidente de la República anunció hoy un paquete de medidas económicas orientadas a fortalecer la recuperación económica durante el segundo semestre del año. Las medidas incluyen incentivos tributarios para pequeñas empresas, programas de capacitación laboral y apoyo al sector exportador. El ministro de Hacienda detalló que el plan contempla una inversión de 500 millones de dólares...', 'https://www.emol.com/noticias/economia/2024/09/08/politica-economica.html', 'Nacional', 'economía', '["presidente", "medidas", "económicas", "tributarios", "empresas"]', NOW() - INTERVAL '2 hours', true, 'Contenido original completo...', 245, 73, 0.3),

('950e8400-e29b-41d4-a716-446655440002', 'La Tercera', 'https://www.latercera.com/deportes/2024/09/08/futbol-chileno.html', 'Selección chilena se prepara para eliminatorias con nuevos refuerzos', 'La Selección Chilena de Fútbol continúa su preparación para los próximos partidos de las Eliminatorias Sudamericanas. El técnico nacional anunció la nómina que incluye tres nuevos jugadores que militan en ligas europeas. Los entrenamientos se realizarán en el Complejo Juan Pinto Durán durante toda la semana...', 'https://www.latercera.com/deportes/2024/09/08/futbol-chileno.html', 'Nacional', 'deportes', '["selección", "chilena", "eliminatorias", "fútbol", "técnico"]', NOW() - INTERVAL '4 hours', false, 'Contenido original deportivo...', 189, 56, 0.1),

('950e8400-e29b-41d4-a716-446655440003', 'BioBío Chile', 'https://www.biobiochile.cl/noticias/politica/2024/09/08/congreso-nacional.html', 'Congreso Nacional aprueba proyecto de modernización digital', 'El Congreso Nacional aprobó por amplia mayoría el proyecto de ley que moderniza los sistemas digitales del Estado. La iniciativa contempla la digitalización de trámites ciudadanos, mejoras en la ciberseguridad y la creación de una plataforma única de servicios públicos. La implementación comenzará en enero de 2025...', 'https://www.biobiochile.cl/noticias/politica/2024/09/08/congreso-nacional.html', 'Nacional', 'política', '["congreso", "digital", "modernización", "trámites", "ciberseguridad"]', NOW() - INTERVAL '6 hours', false, 'Contenido político completo...', 198, 59, 0.2),

('950e8400-e29b-41d4-a716-446655440004', 'El Nortero', 'https://www.elnortero.cl/mineria/2024/09/08/produccion-cobre.html', 'Región de Antofagasta lidera producción de cobre en el primer semestre', 'La Región de Antofagasta se consolida como líder nacional en la producción de cobre durante el primer semestre de 2024. Según cifras de Cochilco, la región aportó el 65% de la producción nacional, superando las proyecciones iniciales. Los principales yacimientos han implementado nuevas tecnologías...', 'https://www.elnortero.cl/mineria/2024/09/08/produccion-cobre.html', 'Antofagasta', 'economía', '["antofagasta", "cobre", "producción", "minería", "región"]', NOW() - INTERVAL '3 hours', true, 'Contenido minero regional...', 167, 50, 0.4),

('950e8400-e29b-41d4-a716-446655440005', 'Emol', 'https://www.emol.com/internacional/2024/09/08/economia-mundial.html', 'Mercados internacionales muestran signos de recuperación tras volatilidad', 'Los principales mercados financieros internacionales mostraron signos de estabilización después de una semana de alta volatilidad. El índice S&P 500 cerró con una ganancia del 2.3%, mientras que los mercados asiáticos también registraron avances. Los analistas atribuyen la recuperación a mejores perspectivas...', 'https://www.emol.com/internacional/2024/09/08/economia-mundial.html', 'Nacional', 'internacional', '["mercados", "financieros", "volatilidad", "recuperación", "economía"]', NOW() - INTERVAL '5 hours', false, 'Contenido económico internacional...', 156, 47, 0.3)
ON CONFLICT (id) DO NOTHING;

-- Insertar biblioteca de audio de ejemplo
INSERT INTO audio_library (id, user_id, name, description, type, s3_key, file_url, duration_seconds, file_size_bytes, mime_type, tags, is_favorite, usage_count, created_at) VALUES
('a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Cortina Musical Mañana', 'Cortina energética para programas matutinos', 'music', 'audio/cortina_morning.mp3', 'https://s3.amazonaws.com/vira-demo/cortina_morning.mp3', 30, 720000, 'audio/mpeg', '["cortina", "mañana", "energético", "instrumental"]', true, 12, NOW() - INTERVAL '20 days'),

('a50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Jingle Radio Norte', 'Identificación oficial de Radio Norte', 'voice', 'audio/jingle_radio_norte.mp3', 'https://s3.amazonaws.com/vira-demo/jingle_radio_norte.mp3', 15, 360000, 'audio/mpeg', '["jingle", "identificación", "radio norte"]', true, 25, NOW() - INTERVAL '18 days'),

('a50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Efecto Transición', 'Efecto de sonido para transiciones', 'sfx', 'audio/transition_effect.mp3', 'https://s3.amazonaws.com/vira-demo/transition_effect.mp3', 3, 72000, 'audio/mpeg', '["transición", "efecto", "sonido"]', false, 8, NOW() - INTERVAL '15 days'),

('a50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Publicidad Supermercado Norte', 'Spot publicitario para supermercado local', 'ads', 'audio/pub_supermercado.mp3', 'https://s3.amazonaws.com/vira-demo/pub_supermercado.mp3', 20, 480000, 'audio/mpeg', '["publicidad", "supermercado", "comercial"]', false, 6, NOW() - INTERVAL '12 days'),

('a50e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Fondo Musical Suave', 'Música de fondo para contenido serio', 'music', 'audio/background_soft.mp3', 'https://s3.amazonaws.com/vira-demo/background_soft.mp3', 60, 1440000, 'audio/mpeg', '["fondo", "suave", "serio", "instrumental"]', true, 15, NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- Insertar trabajos de automatización
INSERT INTO automation_jobs (id, user_id, template_id, name, frequency, schedule_data, is_active, next_run_at, last_run_at, last_run_status, auto_publish_settings, notification_settings, created_at) VALUES
('b50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 'Noticiero Automático 7 AM', 'daily', '{"time": "07:00", "timezone": "America/Santiago"}', true, NOW() + INTERVAL '1 day 7 hours', NOW() - INTERVAL '1 day 7 hours', 'success', '{"twitter": true, "facebook": false}', '{"email_on_failure": true}', NOW() - INTERVAL '25 days'),

('b50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 'Resumen Vespertino 18:00', 'specific_days', '{"days": [1,2,3,4,5], "time": "18:00", "timezone": "America/Santiago"}', true, NOW() + INTERVAL '18 hours', NOW() - INTERVAL '6 hours', 'success', '{"twitter": true, "facebook": true}', '{"email_on_failure": true, "email_on_success": false}', NOW() - INTERVAL '15 days'),

('b50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Flash Informativo Mediodía', 'daily', '{"time": "12:00", "timezone": "America/Santiago"}', false, NULL, NOW() - INTERVAL '5 days', 'success', '{"twitter": true}', '{"email_on_failure": true}', NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- Insertar configuraciones de integración social
INSERT INTO social_integrations (id, user_id, platform, access_token, auto_publish_enabled, publish_settings, is_active, last_published_at, created_at) VALUES
('c50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'twitter', 'encrypted_twitter_token_here', true, '{"include_audio": true, "hashtags": ["#NoticiasAntofagasta", "#RadioNorte"]}', true, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '20 days'),

('c50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'facebook', 'encrypted_facebook_token_here', false, '{"include_transcript": true}', true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '18 days'),

('c50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'twitter', 'encrypted_twitter_token_demo', true, '{"include_audio": false, "hashtags": ["#NoticiasChile", "#VIRA"]}', true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- Insertar uso de tokens detallado
INSERT INTO token_usage (id, user_id, report_id, service, operation, model_name, tokens_used, characters_processed, seconds_audio, cost_usd, request_duration_ms, created_at) VALUES
-- Tokens para reporte 850e8400-e29b-41d4-a716-446655440001
('d50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440001', 'openai', 'text-generation', 'gpt-4-turbo', 1500, 0, 0, 1.80, 2300, NOW() - INTERVAL '2 days 8 hours'),
('d50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440001', 'elevenlabs', 'text-to-speech', 'eleven_multilingual_v2', 0, 5200, 14.9, 0.65, 3400, NOW() - INTERVAL '2 days 8 hours'),

-- Tokens para reporte 850e8400-e29b-41d4-a716-446655440002
('d50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440002', 'openai', 'text-generation', 'gpt-3.5-turbo', 1200, 0, 0, 0.72, 1800, NOW() - INTERVAL '3 days 18 hours'),
('d50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440002', 'azure', 'text-to-speech', 'es-CL-CatalinaNeural', 0, 3400, 9.96, 0.95, 2100, NOW() - INTERVAL '3 days 18 hours'),

-- Tokens para reporte 850e8400-e29b-41d4-a716-446655440003
('d50e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440003', 'openai', 'text-generation', 'gpt-4-turbo', 2200, 0, 0, 2.64, 3100, NOW() - INTERVAL '1 day 9 hours'),
('d50e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440003', 'elevenlabs', 'text-to-speech', 'eleven_multilingual_v2', 0, 7800, 20.08, 1.59, 4200, NOW() - INTERVAL '1 day 9 hours')
ON CONFLICT (id) DO NOTHING;

-- Insertar métricas diarias
INSERT INTO daily_metrics (id, date, total_users_active, total_reports_generated, total_audio_minutes, total_cost_usd, avg_cost_per_report, cost_by_service, avg_generation_time_seconds, success_rate_percentage, most_popular_region, most_popular_category, created_at) VALUES
('e50e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '7 days', 2, 3, 42.5, 6.89, 2.30, '{"openai": 4.16, "elevenlabs": 2.24, "azure": 0.49}', 248, 100.00, 'Santiago', 'economía', NOW() - INTERVAL '6 days'),
('e50e8400-e29b-41d4-a716-446655440002', CURRENT_DATE - INTERVAL '6 days', 2, 2, 25.8, 3.45, 1.73, '{"openai": 2.52, "azure": 0.93}', 189, 100.00, 'Antofagasta', 'política', NOW() - INTERVAL '5 days'),
('e50e8400-e29b-41d4-a716-446655440003', CURRENT_DATE - INTERVAL '5 days', 3, 4, 67.2, 9.12, 2.28, '{"openai": 5.68, "elevenlabs": 2.89, "azure": 0.55}', 267, 100.00, 'Santiago', 'economía', NOW() - INTERVAL '4 days'),
('e50e8400-e29b-41d4-a716-446655440004', CURRENT_DATE - INTERVAL '4 days', 2, 2, 29.3, 4.23, 2.12, '{"openai": 2.88, "elevenlabs": 1.35}', 198, 100.00, 'Antofagasta', 'regional', NOW() - INTERVAL '3 days'),
('e50e8400-e29b-41d4-a716-446655440005', CURRENT_DATE - INTERVAL '3 days', 3, 1, 5.0, 0.89, 0.89, '{"openai": 0.36, "aws-polly": 0.53}', 89, 100.00, 'Nacional', 'internacional', NOW() - INTERVAL '2 days'),
('e50e8400-e29b-41d4-a716-446655440006', CURRENT_DATE - INTERVAL '2 days', 2, 2, 35.7, 5.03, 2.52, '{"openai": 2.52, "elevenlabs": 2.24, "azure": 0.27}', 234, 100.00, 'Antofagasta', 'economía', NOW() - INTERVAL '1 day'),
('e50e8400-e29b-41d4-a716-446655440007', CURRENT_DATE - INTERVAL '1 days', 1, 1, 20.1, 4.23, 4.23, '{"openai": 2.64, "elevenlabs": 1.59}', 445, 100.00, 'Santiago', 'política', NOW())
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- INSERTAR DATOS PARA DEMO Y TESTING
-- ===================================================================

-- Insertar más noticias para tener contenido variado
INSERT INTO scraped_news (source_name, source_url, title, content, original_url, region, category, keywords, scraped_at, is_processed, word_count, reading_time_seconds, sentiment_score) VALUES
('La Tercera', 'https://www.latercera.com/tecnologia/2024/09/08/inteligencia-artificial.html', 'Chile avanza en regulación de inteligencia artificial', 'El Ministerio de Ciencia anunció la creación de una comisión especial para desarrollar un marco regulatorio para la inteligencia artificial en Chile. La iniciativa busca equilibrar la innovación tecnológica con la protección de derechos ciudadanos...', 'https://www.latercera.com/tecnologia/2024/09/08/inteligencia-artificial.html', 'Nacional', 'tecnología', '["inteligencia", "artificial", "regulación", "tecnología", "chile"]', NOW() - INTERVAL '1 hour', false, 156, 47, 0.2),

('BioBío Chile', 'https://www.biobiochile.cl/salud/2024/09/08/vacunacion-invierno.html', 'Campaña de vacunación de invierno alcanza 85% de cobertura', 'El Ministerio de Salud informó que la campaña de vacunación contra la influenza y COVID-19 ha alcanzado un 85% de cobertura en grupos de riesgo. Los adultos mayores lideran la participación con un 92% de inmunización...', 'https://www.biobiochile.cl/salud/2024/09/08/vacunacion-invierno.html', 'Nacional', 'salud', '["vacunación", "influenza", "covid", "salud", "cobertura"]', NOW() - INTERVAL '30 minutes', false, 134, 40, 0.4),

('El Mercurio de Valparaíso', 'https://www.mercuriovalpo.cl/cultura/2024/09/08/festival-vina.html', 'Festival de Viña 2025 anuncia primeros artistas confirmados', 'La Municipalidad de Viña del Mar reveló los primeros nombres que participarán en el Festival Internacional de la Canción de Viña del Mar 2025. La lista incluye artistas nacionales e internacionales de diversos géneros musicales...', 'https://www.mercuriovalpo.cl/cultura/2024/09/08/festival-vina.html', 'Valparaíso', 'cultura', '["festival", "viña", "artistas", "música", "cultura"]', NOW() - INTERVAL '90 minutes', false, 178, 53, 0.5)
ON CONFLICT (source_url, title) DO NOTHING;

-- ===================================================================
-- VERIFICACIÓN DE DATOS INSERTADOS
-- ===================================================================

-- Mostrar resumen de datos insertados
DO $$
BEGIN
    RAISE NOTICE 'RESUMEN DE DATOS DE EJEMPLO INSERTADOS:';
    RAISE NOTICE '- Usuarios: %', (SELECT COUNT(*) FROM users WHERE email LIKE '%@%demo.cl' OR email LIKE '%@vira.cl');
    RAISE NOTICE '- Fuentes de noticias: %', (SELECT COUNT(*) FROM news_sources);
    RAISE NOTICE '- Plantillas: %', (SELECT COUNT(*) FROM newscast_templates);
    RAISE NOTICE '- Reportes: %', (SELECT COUNT(*) FROM news_reports);
    RAISE NOTICE '- Noticias scrapeadas: %', (SELECT COUNT(*) FROM scraped_news);
    RAISE NOTICE '- Biblioteca de audio: %', (SELECT COUNT(*) FROM audio_library);
    RAISE NOTICE '- Trabajos automáticos: %', (SELECT COUNT(*) FROM automation_jobs);
    RAISE NOTICE '- Integraciones sociales: %', (SELECT COUNT(*) FROM social_integrations);
    RAISE NOTICE '- Registros de tokens: %', (SELECT COUNT(*) FROM token_usage);
    RAISE NOTICE '- Métricas diarias: %', (SELECT COUNT(*) FROM daily_metrics);
    RAISE NOTICE '';
    RAISE NOTICE 'USUARIOS DE DEMO CREADOS:';
    RAISE NOTICE '- admin@vira.cl (Administrador)';
    RAISE NOTICE '- usuario@demo.cl (Usuario Demo)';
    RAISE NOTICE '- radio.norte@ejemplo.cl (Radio Norte)';
    RAISE NOTICE '';
    RAISE NOTICE '¡Datos de ejemplo insertados exitosamente!';
    RAISE NOTICE 'Puedes usar estos usuarios para hacer login y probar las funcionalidades.';
END $$;
