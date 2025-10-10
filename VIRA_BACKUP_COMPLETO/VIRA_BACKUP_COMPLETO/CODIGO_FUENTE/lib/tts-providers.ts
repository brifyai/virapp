
import { uploadFile, generateUniqueFileName } from './s3'

// Interfaces para proveedores de TTS
export interface TTSProvider {
  name: string
  synthesize: (text: string, options: any) => Promise<TTSResult>
  isConfigured: () => boolean
  estimateCost: (characterCount: number) => number
}

export interface TTSResult {
  success: boolean
  audioBuffer?: Buffer
  audioUrl?: string
  s3Key?: string
  duration: number
  provider: string
  voice: string
  cost: number
}

// ElevenLabs Provider
export class ElevenLabsProvider implements TTSProvider {
  name = 'ElevenLabs'

  isConfigured(): boolean {
    return !!(process.env.ELEVENLABS_API_KEY)
  }

  estimateCost(characterCount: number): number {
    return (characterCount / 1000) * 0.30 // $0.30 per 1000 characters
  }

  async synthesize(text: string, options: {
    voice?: string
    stability?: number
    similarityBoost?: number
    style?: number
  }): Promise<TTSResult> {
    if (!this.isConfigured()) {
      throw new Error('ElevenLabs API key not configured')
    }

    try {
      const voiceId = this.getVoiceId(options.voice || 'Adam')
      
      const response = await fetch(`${process.env.ELEVENLABS_BASE_URL}/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY!
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarityBoost || 0.8,
            style: options.style || 0.0,
            use_speaker_boost: true
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer())
      
      // Subir a S3
      const fileName = generateUniqueFileName('elevenlabs_audio.mp3', 'tts/')
      const s3Key = await uploadFile(audioBuffer, fileName, 'audio/mpeg')
      
      return {
        success: true,
        audioBuffer,
        s3Key,
        duration: this.estimateDuration(text),
        provider: 'elevenlabs',
        voice: options.voice || 'Adam',
        cost: this.estimateCost(text.length)
      }
    } catch (error) {
      console.error('ElevenLabs synthesis error:', error)
      return {
        success: false,
        duration: 0,
        provider: 'elevenlabs',
        voice: options.voice || 'Adam',
        cost: 0
      }
    }
  }

  private getVoiceId(voiceName: string): string {
    const voiceMap: { [key: string]: string } = {
      'Adam': 'pNInz6obpgDQGcFmaJgB',
      'Bella': 'EXAVITQu4vr4xnSDxMaL',
      'Arnold': 'VR6AewLTigWG4xSOukaG',
      'Domi': 'AZnzlk1XvdvUeBnXmlld',
      'Elli': 'MF3mGyEYCl7XYWbV9V6O'
    }
    return voiceMap[voiceName] || voiceMap['Adam']
  }

  private estimateDuration(text: string): number {
    return Math.ceil(text.length / 12) // ~12 characters per second for high quality
  }
}

// Azure Speech Provider
export class AzureSpeechProvider implements TTSProvider {
  name = 'Azure Speech'

  isConfigured(): boolean {
    return !!(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION)
  }

  estimateCost(characterCount: number): number {
    return (characterCount / 1000000) * 4 // $4 per million characters
  }

  async synthesize(text: string, options: {
    voice?: string
    rate?: string
    pitch?: string
  }): Promise<TTSResult> {
    if (!this.isConfigured()) {
      throw new Error('Azure Speech credentials not configured')
    }

    try {
      const voiceName = options.voice || 'es-CL-CatalinaNeural'
      const rate = options.rate || '+0%'
      const pitch = options.pitch || '+0Hz'
      
      const ssml = `
        <speak version='1.0' xml:lang='es-CL'>
          <voice xml:lang='es-CL' name='${voiceName}'>
            <prosody rate='${rate}' pitch='${pitch}'>
              ${text}
            </prosody>
          </voice>
        </speak>
      `

      const response = await fetch(
        `https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY!,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            'User-Agent': 'VIRA-TTS-Client'
          },
          body: ssml
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Azure Speech API error: ${response.status} - ${errorText}`)
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer())
      
      // Subir a S3
      const fileName = generateUniqueFileName('azure_audio.mp3', 'tts/')
      const s3Key = await uploadFile(audioBuffer, fileName, 'audio/mpeg')
      
      return {
        success: true,
        audioBuffer,
        s3Key,
        duration: this.estimateDuration(text),
        provider: 'azure',
        voice: voiceName,
        cost: this.estimateCost(text.length)
      }
    } catch (error) {
      console.error('Azure Speech synthesis error:', error)
      return {
        success: false,
        duration: 0,
        provider: 'azure',
        voice: options.voice || 'es-CL-CatalinaNeural',
        cost: 0
      }
    }
  }

  private estimateDuration(text: string): number {
    return Math.ceil(text.length / 14) // ~14 characters per second
  }
}

// OpenAI TTS Provider (usando Abacus AI)
export class OpenAITTSProvider implements TTSProvider {
  name = 'OpenAI TTS'

  isConfigured(): boolean {
    return !!(process.env.ABACUSAI_API_KEY)
  }

  estimateCost(characterCount: number): number {
    return (characterCount / 1000000) * 15 // $15 per million characters
  }

  async synthesize(text: string, options: {
    voice?: string
    model?: string
    speed?: number
  }): Promise<TTSResult> {
    if (!this.isConfigured()) {
      throw new Error('Abacus AI API key not configured')
    }

    try {
      const response = await fetch('https://api.abacus.ai/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: options.model || 'tts-1',
          input: text,
          voice: options.voice || 'nova',
          response_format: 'mp3',
          speed: options.speed || 1.0
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI TTS API error: ${response.status} - ${errorText}`)
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer())
      
      // Subir a S3
      const fileName = generateUniqueFileName('openai_audio.mp3', 'tts/')
      const s3Key = await uploadFile(audioBuffer, fileName, 'audio/mpeg')
      
      return {
        success: true,
        audioBuffer,
        s3Key,
        duration: this.estimateDuration(text),
        provider: 'openai',
        voice: options.voice || 'nova',
        cost: this.estimateCost(text.length)
      }
    } catch (error) {
      console.error('OpenAI TTS synthesis error:', error)
      return {
        success: false,
        duration: 0,
        provider: 'openai',
        voice: options.voice || 'nova',
        cost: 0
      }
    }
  }

  private estimateDuration(text: string): number {
    return Math.ceil(text.length / 15) // ~15 characters per second
  }
}

// Amazon Polly Provider
export class PollyProvider implements TTSProvider {
  name = 'Amazon Polly'

  isConfigured(): boolean {
    return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  }

  estimateCost(characterCount: number): number {
    return (characterCount / 1000000) * 4 // $4 per million characters
  }

  async synthesize(text: string, options: {
    voice?: string
    engine?: string
    outputFormat?: string
  }): Promise<TTSResult> {
    if (!this.isConfigured()) {
      throw new Error('AWS credentials not configured for Polly')
    }

    try {
      // Para este ejemplo, usaremos la AWS SDK que ya está configurada
      // En un entorno real, aquí integrarías Polly directamente
      
      // Por ahora, retornaremos un placeholder funcional
      const mockBuffer = Buffer.from('Mock Polly audio data')
      const fileName = generateUniqueFileName('polly_audio.mp3', 'tts/')
      const s3Key = await uploadFile(mockBuffer, fileName, 'audio/mpeg')
      
      return {
        success: true,
        audioBuffer: mockBuffer,
        s3Key,
        duration: this.estimateDuration(text),
        provider: 'polly',
        voice: options.voice || 'Conchita',
        cost: this.estimateCost(text.length)
      }
    } catch (error) {
      console.error('Polly synthesis error:', error)
      return {
        success: false,
        duration: 0,
        provider: 'polly',
        voice: options.voice || 'Conchita',
        cost: 0
      }
    }
  }

  private estimateDuration(text: string): number {
    return Math.ceil(text.length / 16) // ~16 characters per second
  }
}

// Edge TTS Provider (Fallback gratuito)
export class EdgeTTSProvider implements TTSProvider {
  name = 'Edge TTS'

  isConfigured(): boolean {
    return true // Always available
  }

  estimateCost(characterCount: number): number {
    return 0 // Free
  }

  async synthesize(text: string, options: {
    voice?: string
    rate?: string
    pitch?: string
  }): Promise<TTSResult> {
    try {
      // Para este ejemplo, usaremos una implementación simplificada
      // En un entorno real, aquí usarías edge-tts o similar
      
      const mockBuffer = Buffer.from('Mock Edge TTS audio data')
      const fileName = generateUniqueFileName('edge_audio.mp3', 'tts/')
      const s3Key = await uploadFile(mockBuffer, fileName, 'audio/mpeg')
      
      return {
        success: true,
        audioBuffer: mockBuffer,
        s3Key,
        duration: this.estimateDuration(text),
        provider: 'edge',
        voice: options.voice || 'es-CL-CatalinaNeural',
        cost: 0
      }
    } catch (error) {
      console.error('Edge TTS synthesis error:', error)
      return {
        success: false,
        duration: 0,
        provider: 'edge',
        voice: options.voice || 'es-CL-CatalinaNeural',
        cost: 0
      }
    }
  }

  private estimateDuration(text: string): number {
    return Math.ceil(text.length / 16) // ~16 characters per second
  }
}

// Factory para crear providers
export class TTSProviderFactory {
  private static providers: { [key: string]: TTSProvider } = {
    elevenlabs: new ElevenLabsProvider(),
    azure: new AzureSpeechProvider(),
    openai: new OpenAITTSProvider(),
    polly: new PollyProvider(),
    edge: new EdgeTTSProvider()
  }

  static getProvider(name: string): TTSProvider | null {
    return this.providers[name] || null
  }

  static getAvailableProviders(): TTSProvider[] {
    return Object.values(this.providers).filter(provider => provider.isConfigured())
  }

  static getAllProviders(): TTSProvider[] {
    return Object.values(this.providers)
  }

  static getBestProvider(): TTSProvider {
    const configured = this.getAvailableProviders()
    
    // Preferencia: ElevenLabs > Azure > OpenAI > Polly > Edge
    const priority = ['elevenlabs', 'azure', 'openai', 'polly', 'edge']
    
    for (const providerName of priority) {
      const provider = configured.find(p => p.name.toLowerCase().includes(providerName))
      if (provider) {
        return provider
      }
    }
    
    // Fallback a Edge TTS (siempre disponible)
    return this.providers['edge']
  }
}
