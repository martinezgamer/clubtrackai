// Using native fetch available in Node.js 18+

export class WeatherService {
  private static readonly GOOGLE_GEOCODING_API = 'https://maps.googleapis.com/maps/api/geocode/json';
  private static readonly WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

  static async getWeatherForLocation(location: string): Promise<any> {
    try {
      // First, geocode the location using Google's API if we have credentials
      let lat: number, lon: number;
      
      if (process.env.GOOGLE_CLOUD_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        const geocodeResponse = await fetch(
          `${this.GOOGLE_GEOCODING_API}?address=${encodeURIComponent(location)}&key=${process.env.GOOGLE_API_KEY || ''}`
        );
        
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json() as any;
          if (geocodeData.results && geocodeData.results.length > 0) {
            const coords = geocodeData.results[0].geometry.location;
            lat = coords.lat;
            lon = coords.lng;
          } else {
            throw new Error('Location not found');
          }
        } else {
          // Fallback to default coordinates for Hammond, IN
          lat = 41.5834;
          lon = -87.5001;
        }
      } else {
        // Default to Hammond, IN coordinates
        lat = 41.5834;
        lon = -87.5001;
      }

      // Get weather data from Open-Meteo (free, no API key required)
      const weatherResponse = await fetch(
        `${this.WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=America/Chicago&forecast_days=3`
      );

      if (!weatherResponse.ok) {
        throw new Error('Weather service unavailable');
      }

      const weatherData = await weatherResponse.json() as any;
      
      return {
        location: location || 'Hammond, IN',
        current: {
          temperature: Math.round(weatherData.current.temperature_2m),
          feelsLike: Math.round(weatherData.current.apparent_temperature),
          humidity: weatherData.current.relative_humidity_2m,
          windSpeed: Math.round(weatherData.current.wind_speed_10m),
          precipitation: weatherData.current.precipitation || 0,
          condition: this.getWeatherDescription(weatherData.current.weather_code)
        },
        today: {
          high: Math.round(weatherData.daily.temperature_2m_max[0]),
          low: Math.round(weatherData.daily.temperature_2m_min[0]),
          precipitation: Math.round(weatherData.daily.precipitation_sum[0] * 100) / 100,
          condition: this.getWeatherDescription(weatherData.daily.weather_code[0])
        },
        forecast: weatherData.daily.temperature_2m_max.slice(1, 3).map((temp: number, index: number) => ({
          day: index === 0 ? 'Tomorrow' : 'Day After',
          high: Math.round(temp),
          low: Math.round(weatherData.daily.temperature_2m_min[index + 1]),
          condition: this.getWeatherDescription(weatherData.daily.weather_code[index + 1])
        }))
      };
    } catch (error) {
      console.error('Weather service error:', error);
      return {
        location: location || 'Hammond, IN',
        error: 'Weather information temporarily unavailable',
        current: {
          temperature: '--',
          condition: 'Unknown'
        }
      };
    }
  }

  private static getWeatherDescription(code: number): string {
    const weatherCodes: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Thunderstorm with heavy hail'
    };
    
    return weatherCodes[code] || 'Unknown';
  }

  static async getBusinessRecommendations(weatherData: any): Promise<string[]> {
    const recommendations: string[] = [];
    const temp = weatherData.current.temperature;
    const condition = weatherData.current.condition.toLowerCase();

    if (temp > 80) {
      recommendations.push("Hot weather - ensure AC is working well, offer cold drinks specials");
      recommendations.push("Consider extending happy hour for afternoon comfort");
    } else if (temp < 40) {
      recommendations.push("Cold weather - warm up the club, hot drink specials recommended");
      recommendations.push("Customers may arrive later, adjust staffing accordingly");
    }

    if (condition.includes('rain') || condition.includes('storm')) {
      recommendations.push("Rainy weather - expect slower foot traffic, plan indoor activities");
      recommendations.push("Have towels ready at entrance, consider ride service partnerships");
    } else if (condition.includes('clear') || condition.includes('sunny')) {
      recommendations.push("Beautiful weather - great for outdoor promotions or patio events");
      recommendations.push("Higher foot traffic expected, ensure full staffing");
    }

    if (weatherData.today.precipitation > 0.1) {
      recommendations.push("Precipitation expected - plan for weather-related delays");
    }

    return recommendations;
  }
}