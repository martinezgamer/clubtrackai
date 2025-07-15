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
      throw new Error('Google Cloud TTS API key not configured');
    }

    const sanitizedText = this.sanitizeText(request.text);
    
    const payload = {
      input: {
        text: sanitizedText
      },
      voice: request.voice || {
        languageCode: 'en-US',
        name: 'en-US-Standard-C' // Female voice, natural sounding
      },
      audioConfig: request.audioConfig || {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0
      }
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('TTS API Error:', response.status, errorText);
        throw new Error(`TTS API request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (data.audioContent) {
        return Buffer.from(data.audioContent, 'base64');
      }
      
      return null;
    } catch (error) {
      console.error('Error calling Google Cloud TTS:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

export const ttsService = new GoogleCloudTTSService();