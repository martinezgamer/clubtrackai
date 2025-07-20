import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cloud, Sun, CloudRain, Snowflake, CloudLightning, Thermometer, Droplets, Wind } from 'lucide-react';

interface WeatherData {
  location: string;
  current: {
    temperature: number | string;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    precipitation: number;
    condition: string;
  };
  today: {
    high: number;
    low: number;
    precipitation: number;
    condition: string;
  };
  forecast?: Array<{
    day: string;
    high: number;
    low: number;
    condition: string;
  }>;
  businessRecommendations?: string[];
  error?: string;
}

const WeatherWidget: React.FC = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/weather?location=Hammond, IN');
      
      if (response.status === 403) {
        setError('Weather access is restricted to super users');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }
      
      const data = await response.json();
      setWeatherData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weather');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    // Refresh weather every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) {
      return <Sun className="h-5 w-5 text-yellow-500" />;
    } else if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
      return <CloudRain className="h-5 w-5 text-blue-500" />;
    } else if (lowerCondition.includes('snow')) {
      return <Snowflake className="h-5 w-5 text-blue-200" />;
    } else if (lowerCondition.includes('thunder')) {
      return <CloudLightning className="h-5 w-5 text-purple-500" />;
    } else {
      return <Cloud className="h-5 w-5 text-gray-500" />;
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Weather Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          {error !== 'Weather access is restricted to super users' && (
            <Button variant="outline" onClick={fetchWeather} className="mt-2">
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (loading && !weatherData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Weather Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading weather data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Thermometer className="h-5 w-5" />
          Weather Center
          <Badge variant="secondary" className="ml-auto">
            Super User
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{weatherData.location}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Weather */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getWeatherIcon(weatherData.current.condition)}
            <div>
              <div className="text-2xl font-bold">
                {weatherData.current.temperature}°F
              </div>
              <div className="text-sm text-muted-foreground">
                Feels like {weatherData.current.feelsLike}°F
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">{weatherData.current.condition}</div>
            <div className="text-xs text-muted-foreground">
              H: {weatherData.today.high}°F L: {weatherData.today.low}°F
            </div>
          </div>
        </div>

        {/* Weather Details */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="text-center">
            <Droplets className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <div className="text-xs text-muted-foreground">Humidity</div>
            <div className="text-sm font-medium">{weatherData.current.humidity}%</div>
          </div>
          <div className="text-center">
            <Wind className="h-4 w-4 mx-auto text-gray-500 mb-1" />
            <div className="text-xs text-muted-foreground">Wind</div>
            <div className="text-sm font-medium">{weatherData.current.windSpeed} mph</div>
          </div>
          <div className="text-center">
            <CloudRain className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <div className="text-xs text-muted-foreground">Rain</div>
            <div className="text-sm font-medium">{weatherData.current.precipitation}"</div>
          </div>
        </div>

        {/* Forecast */}
        {weatherData.forecast && weatherData.forecast.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-medium">Forecast</div>
            {weatherData.forecast.map((day, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="font-medium">{day.day}</span>
                <div className="flex items-center gap-2">
                  {getWeatherIcon(day.condition)}
                  <span>{day.high}°/{day.low}°</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Business Recommendations */}
        {weatherData.businessRecommendations && weatherData.businessRecommendations.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-medium">Business Insights</div>
            <div className="space-y-1">
              {weatherData.businessRecommendations.map((rec, index) => (
                <div key={index} className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={fetchWeather} className="w-full">
          Refresh Weather
        </Button>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;