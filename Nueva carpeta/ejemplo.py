import torch
import requests
import tempfile
import os
from TTS.api import TTS
from TTS.tts.models.xtts import XttsAudioConfig, XttsArgs
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.config.shared_configs import BaseDatasetConfig

def download_audio_from_url(url, local_filename=None):
    """Descarga un archivo de audio desde una URL"""
    try:
        print(f"📥 Descargando audio desde: {url}")
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        if local_filename is None:
            # Crear archivo temporal con la extensión correcta
            extension = '.mp3' if url.endswith('.mp3') else '.wav'
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=extension)
            local_filename = temp_file.name
            temp_file.close()
        
        # Descargar el archivo
        with open(local_filename, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"✅ Audio descargado: {local_filename}")
        return local_filename
        
    except Exception as e:
        print(f"❌ Error al descargar: {e}")
        return None

# URL del archivo de audio en Supabase
supabase_url = "https://bbshnncbrpzahuckphtu.supabase.co/storage/v1/object/public/biblioteca_audio/f48ad3de.mp3"

# Descargar el archivo de audio
audio_file = download_audio_from_url(supabase_url)

if audio_file:
    #print(TTS().list_models())
    with torch.serialization.safe_globals([XttsAudioConfig, XttsConfig, BaseDatasetConfig, XttsArgs]):
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cpu")

    try:
        # Usar el archivo descargado para clonación de voz
        tts.tts_to_file(
            text="De boca de lobos a faro de seguridad. Así describen los vecinos el cambio que trajo la instalación de seis luminarias de 200 watts en el cruce Alto Ramírez, camino a Las Maitas. El equipo de Iluminación de la Municipalidad de Arica respondió al llamado comunitario y levantó un poste con tecnología reutilizada, dando nueva vida a materiales y evitando gastos extra. Queremos que Arica sea una ciudad más segura, por eso vamos a crear más espacios con iluminación en los valles, aseguró el alcalde Orlando Vargas Pizarro. La delegada municipal del valle de Azapa, Andrea Soumastre, recordó cómo era el lugar antes: Cuando no había luminarias y no se veía el tipo de cruce que hay en el kilómetro 6, esto era una verdadera boca de lobos. Vecinos valoraron el ingenio de los trabajadores de Aseo y Ornato. Con mucha astucia e ingenio han reutilizado materiales para confeccionar los postes, agregó el edil.", 
            speaker_wav=audio_file, 
            language="es", 
            file_path="salida_supabase.wav"
        )
        
        print("🎉 ¡Clonación completada exitosamente!")
        
    finally:
        # Siempre borrar el archivo descargado después de la clonación
        try:
            if os.path.exists(audio_file):
                os.unlink(audio_file)
                print("🧹 Archivo descargado eliminado")
        except Exception as e:
            print(f"⚠️ No se pudo eliminar el archivo: {e}")
else:
    print("💥 No se pudo descargar el archivo de audio")
