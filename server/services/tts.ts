export interface TTSRequest {
  text: string;
  voice?: {
    languageCode: string;
    name: string;
  };
  audioConfig?: {
    audioEncoding: string;
    speakingRate?: number;
    pitch?: number;
    volumeGainDb?: number;
  };
}

export class GoogleCloudTTSService {
  private apiKey: string;
  private baseUrl = 'https://texttospeech.googleapis.com/v1/text:synthesize';

  constructor() {
    this.apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Google Cloud TTS API key not found. TTS will not be available.');
    }
  }

  private sanitizeText(text: string): string {
    // Clean up text for more natural speech
    return text
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/#{1,6}\s/g, '')
      // Remove URLs
      .replace(/https?:\/\/[^\s]+/g, 'link')
      // Clean up punctuation for better speech
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      // Remove excessive punctuation
      .replace(/[.,!?]{2,}/g, '.')
      .trim();
  }

  async synthesizeText(request: TTSRequest): Promise<Buffer | null> {
    if (!this.apiKey) {
      console.warn('Google Cloud TTS API key not configured');
      return null;
    }

    const sanitizedText = this.sanitizeText(request.text);
    
    // Skip empty or very short texts
    if (!sanitizedText || sanitizedText.length < 2) {
      return null;
    }
    
    const payload = {
      input: {
        text: sanitizedText
      },
      voice: request.voice || {
        languageCode: 'en-US',
        name: 'en-US-Neural2-A' // Neural voice, very natural sounding female
      },
      audioConfig: request.audioConfig || {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('TTS API Error:', response.status, errorText);
        return null; // Return null instead of throwing to prevent unhandled rejections
      }

      const data = await response.json();
      
      if (data.audioContent) {
        return Buffer.from(data.audioContent, 'base64');
      }
      
      return null;
    } catch (error) {
      console.error('Error calling Google Cloud TTS:', error);
      return null; // Return null instead of throwing to prevent unhandled rejections
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

export const ttsService = new GoogleCloudTTSService();