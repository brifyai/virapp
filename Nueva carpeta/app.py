import torch
import requests
import tempfile
import os
import uuid
import base64
from TTS.api import TTS
from TTS.tts.models.xtts import XttsAudioConfig, XttsArgs
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.config.shared_configs import BaseDatasetConfig
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import warnings

# Suppress warnings
warnings.filterwarnings("ignore", category=UserWarning)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Get device
device = "cpu"

# Initialize TTS with XTTS v2 model for voice cloning
tts = None

def initialize_tts():
    """Initialize TTS model with proper safe_globals"""
    global tts
    try:
        print("Loading XTTS v2 model for voice cloning...")
        with torch.serialization.safe_globals([XttsAudioConfig, XttsConfig, BaseDatasetConfig, XttsArgs]):
            tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
        print("XTTS v2 model loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading TTS model: {e}")
        return False

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

@app.route('/')
def home():
    return jsonify({
        "message": "TTS Server with Voice Cloning - XTTS v2",
        "model": "tts_models/multilingual/multi-dataset/xtts_v2",
        "language": "Multilingual (Spanish, English, etc.)",
        "features": ["Voice Cloning", "Multilingual TTS", "Simple TTS"],
        "endpoints": {
            "/tts": "POST - Generate speech (JSON for simple TTS, form-data for voice cloning)",
            "/tts_url": "POST - Generate speech with voice cloning from URL",
            "/models": "GET - List available TTS models",
            "/health": "GET - Server health check"
        }
    })

@app.route('/models', methods=['GET'])
def list_models():
    """List available TTS models"""
    try:
        models = TTS().list_models()
        return jsonify({"models": models})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    global tts
    return jsonify({
        "status": "healthy",
        "model_loaded": tts is not None,
        "device": device
    })

@app.route('/tts', methods=['POST'])
def text_to_speech():
    """Convert text to speech with XTTS v2 - supports both simple TTS and voice cloning"""
    global tts
    
    # Initialize TTS if not already loaded
    if tts is None:
        if not initialize_tts():
            return jsonify({"error": "Failed to initialize TTS model"}), 500
    
    try:
        print("=== TTS Request received ===")
        
        # Check if it's JSON request (voice cloning with URL) or form-data (voice cloning with file)
        if request.is_json:
            # Voice cloning with URL from JSON request
            data = request.get_json()
            print(f"JSON Request data: {data}")
            
            if not data:
                return jsonify({"error": "No JSON data provided"}), 400
            
            text = data.get('text')
            voice_url = data.get('voice_url')
            language = data.get('language', 'es')  # Default to Spanish
            return_format = data.get('format', 'file')  # 'file' o 'base64'
            
            if not text:
                return jsonify({"error": "Text is required"}), 400
            
            if not voice_url:
                return jsonify({"error": "voice_url is required"}), 400
            
            print(f"Voice Cloning from JSON - Text: '{text}', Voice URL: '{voice_url}', Language: '{language}', Format: '{return_format}'")
            
            # Download reference audio from voice_url
            speaker_wav_path = download_audio_from_url(voice_url)
            if not speaker_wav_path:
                return jsonify({"error": "Failed to download audio from voice_url"}), 400
            
            try:
                # Generate unique filename for output
                output_filename = f"voice_clone_json_{uuid.uuid4().hex}.wav"
                output_path = os.path.join(tempfile.gettempdir(), output_filename)
                
                # Generate TTS with voice cloning
                tts.tts_to_file(
                    text=text,
                    speaker_wav=speaker_wav_path,
                    language=language,
                    file_path=output_path
                )
                
                print("Voice cloning from JSON completed successfully")
                
                # Return based on requested format
                if return_format == 'base64':
                    # Read the audio file and convert to base64
                    with open(output_path, 'rb') as audio_file:
                        audio_data = audio_file.read()
                        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                    
                    # Clean up the temporary file
                    if os.path.exists(output_path):
                        os.unlink(output_path)
                    
                    return jsonify({
                        "success": True,
                        "audio_base64": audio_base64,
                        "format": "wav",
                        "message": "Audio generated successfully"
                    })
                else:
                    # Return as file for direct playback
                    return send_file(
                        output_path, 
                        as_attachment=False,  # Para permitir reproducción directa
                        mimetype='audio/wav'
                    )
                
            finally:
                # Clean up downloaded audio file
                if speaker_wav_path and os.path.exists(speaker_wav_path):
                    try:
                        os.unlink(speaker_wav_path)
                        print("🧹 Downloaded voice reference audio cleaned up")
                    except Exception as cleanup_error:
                        print(f"⚠️ Could not clean up downloaded file: {cleanup_error}")
            
        else:
            # Voice cloning with uploaded file or URL
            print("Form-data request for voice cloning")
            
            text = request.form.get('texto') or request.form.get('text')
            language = request.form.get('language', 'es')
            audio_url = request.form.get('audio_url')
            
            if not text:
                return jsonify({"error": "Text (texto or text) is required"}), 400
            
            print(f"Voice Cloning - Text: '{text}', Language: '{language}'")
            
            # Generate unique filename for output
            output_filename = f"voice_clone_{uuid.uuid4().hex}.wav"
            output_path = os.path.join(tempfile.gettempdir(), output_filename)
            
            speaker_wav_path = None
            
            try:
                if audio_url:
                    # Download audio from URL
                    print(f"Downloading reference audio from URL: {audio_url}")
                    speaker_wav_path = download_audio_from_url(audio_url)
                    if not speaker_wav_path:
                        return jsonify({"error": "Failed to download audio from URL"}), 400
                
                elif 'audio' in request.files:
                    # Use uploaded audio file
                    audio_file = request.files['audio']
                    if audio_file.filename == '':
                        return jsonify({"error": "No audio file selected"}), 400
                    
                    # Save uploaded file temporarily
                    temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
                    audio_file.save(temp_audio.name)
                    speaker_wav_path = temp_audio.name
                    print(f"Using uploaded audio file: {speaker_wav_path}")
                
                else:
                    return jsonify({"error": "Audio file or audio_url is required for voice cloning"}), 400
                
                # Generate TTS with voice cloning
                print("Generating TTS with voice cloning...")
                tts.tts_to_file(
                    text=text,
                    speaker_wav=speaker_wav_path,
                    language=language,
                    file_path=output_path
                )
                
                print("Voice cloning TTS generation completed successfully")
                
            finally:
                # Clean up temporary speaker audio file
                if speaker_wav_path and os.path.exists(speaker_wav_path):
                    try:
                        os.unlink(speaker_wav_path)
                        print("🧹 Temporary speaker audio file cleaned up")
                    except Exception as cleanup_error:
                        print(f"⚠️ Could not clean up temporary file: {cleanup_error}")
        
        # Return the generated audio file for direct playback
        return send_file(
            output_path, 
            as_attachment=False,  # Cambiar a False para permitir reproducción directa
            mimetype='audio/wav'
        )
    
    except Exception as e:
        error_msg = f"Exception in TTS generation: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/tts_url', methods=['POST'])
def text_to_speech_url():
    """Generate speech with voice cloning from audio URL"""
    global tts
    
    # Initialize TTS if not already loaded
    if tts is None:
        if not initialize_tts():
            return jsonify({"error": "Failed to initialize TTS model"}), 500
    
    try:
        print("=== TTS URL Request received ===")
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        text = data.get('text')
        audio_url = data.get('audio_url')
        language = data.get('language', 'es')
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        if not audio_url:
            return jsonify({"error": "audio_url is required"}), 400
        
        print(f"Text: '{text}', Audio URL: '{audio_url}', Language: '{language}'")
        
        # Download reference audio
        speaker_wav_path = download_audio_from_url(audio_url)
        if not speaker_wav_path:
            return jsonify({"error": "Failed to download audio from URL"}), 400
        
        try:
            # Generate unique filename for output
            output_filename = f"tts_url_{uuid.uuid4().hex}.wav"
            output_path = os.path.join(tempfile.gettempdir(), output_filename)
            
            # Generate TTS with voice cloning
            tts.tts_to_file(
                text=text,
                speaker_wav=speaker_wav_path,
                language=language,
                file_path=output_path
            )
            
            print("TTS generation from URL completed successfully")
            
            # Return the generated audio file for direct playback
            return send_file(
                output_path, 
                as_attachment=False,  # Cambiar a False para permitir reproducción directa
                mimetype='audio/wav'
            )
            
        finally:
            # Clean up downloaded audio file
            if os.path.exists(speaker_wav_path):
                try:
                    os.unlink(speaker_wav_path)
                    print("🧹 Downloaded audio file cleaned up")
                except Exception as cleanup_error:
                    print(f"⚠️ Could not clean up downloaded file: {cleanup_error}")
    
    except Exception as e:
        error_msg = f"Exception in TTS URL generation: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

if __name__ == '__main__':
    print(f"TTS Server starting on device: {device}")
    print("Model: tts_models/multilingual/multi-dataset/xtts_v2 (Voice Cloning)")
    print("Features: Voice Cloning, Multilingual TTS, Simple TTS")
    
    print("Available endpoints:")
    print("  GET  /         - Server info")
    print("  GET  /models   - List TTS models")
    print("  POST /tts      - Generate speech (JSON for simple TTS, form-data for voice cloning)")
    print("  POST /tts_url  - Generate speech with voice cloning (from URL)")
    print("  GET  /health   - Health check")
    print("\nNote: This server uses XTTS v2 model for multilingual voice cloning and simple TTS")
    print("TTS model will be loaded on first request to optimize startup time")
    app.run(host='0.0.0.0', port=5000, debug=True)
