import React, { useEffect, useState } from "react";
import { Cloud, RefreshCw, AlertCircle, Thermometer, Droplets, Wind, Gauge } from "lucide-react";

const API_KEY = "e7c46fd43dbd6188a8145d7dabf67bb4";
const CITY = "Bishkek";

interface WeatherData {
  main: {
    temp: number;
    humidity: number;
    pressure: number;
    feels_like: number;
  };
  wind: {
    speed: number;
  };
  weather: {
    description: string;
    icon: string;
    main: string;
  }[];
  name: string;
}

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${API_KEY}&units=metric&lang=ru`
      );
      const data = await response.json();
      
      if (response.ok) {
        setWeather(data);
        setLastUpdate(new Date());
      } else {
        setError(`Ошибка: ${data.message || 'Не удалось получить данные о погоде'}`);
      }
    } catch {
      setError("Ошибка соединения с сервисом погоды");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    // Обновление каждые 10 минут
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = (iconCode: string) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const getTemperatureColor = (temp: number) => {
    if (temp <= 0) return "text-blue-600";
    if (temp <= 15) return "text-cyan-600";
    if (temp <= 25) return "text-green-600";
    if (temp <= 35) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg p-4 shadow-sm border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-blue-800 flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Погода в {CITY}
          </h3>
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-20" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 shadow-sm border border-red-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Погода в {CITY}
          </h3>
          <button 
            onClick={fetchWeather}
            className="p-1 text-red-600 hover:text-red-800 transition-colors"
            title="Обновить"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="text-red-700 text-sm">{error}</div>
        <button 
          onClick={fetchWeather}
          className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!weather || !weather.weather || !Array.isArray(weather.weather) || !weather.weather[0]) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-800">Нет данных о погоде</h3>
      </div>
    );
  }

  const currentWeather = weather.weather[0];
  const temp = Math.round(weather.main.temp);
  const feelsLike = Math.round(weather.main.feels_like);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg p-4 shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-blue-800 flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          Погода в {weather.name}
        </h3>
        <button 
          onClick={fetchWeather}
          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
          title="Обновить"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          <img
            src={getWeatherIcon(currentWeather.icon)}
            alt={currentWeather.description}
            className="w-16 h-16"
          />
          <div>
            <div className={`text-3xl font-bold ${getTemperatureColor(temp)}`}>
              {temp}°C
            </div>
            <div className="text-sm text-gray-600 capitalize">
              {currentWeather.description}
            </div>
            {feelsLike !== temp && (
              <div className="text-xs text-gray-500">
                Ощущается как {feelsLike}°C
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/60 rounded-md p-2 hover:bg-white/80 transition-colors">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-xs text-gray-600">Влажность</div>
              <div className="font-semibold text-blue-800">{weather.main.humidity}%</div>
            </div>
          </div>
        </div>

        <div className="bg-white/60 rounded-md p-2 hover:bg-white/80 transition-colors">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-600" />
            <div>
              <div className="text-xs text-gray-600">Ветер</div>
              <div className="font-semibold text-blue-800">{weather.wind?.speed ?? 0} м/с</div>
            </div>
          </div>
        </div>

        <div className="bg-white/60 rounded-md p-2 hover:bg-white/80 transition-colors col-span-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-purple-600" />
            <div>
              <div className="text-xs text-gray-600">Атмосферное давление</div>
              <div className="font-semibold text-blue-800">{weather.main.pressure} гПа</div>
            </div>
          </div>
        </div>
      </div>

      {lastUpdate && (
        <div className="mt-3 pt-2 border-t border-blue-200/50">
          <div className="text-xs text-blue-700 text-center">
            Обновлено: {lastUpdate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherWidget;
