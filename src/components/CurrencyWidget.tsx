import React, { useEffect, useState, useCallback } from "react";
import { DollarSign, RefreshCw, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

interface CurrencyRate {
  code: string;
  name: string;
  rate: number;
  flag: string;
}

const CurrencyWidget: React.FC = () => {
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [previousRates, setPreviousRates] = useState<Record<string, number>>({});

  const currencies = [
    { code: "USD", name: "Доллар США", flag: "/flags/USD.svg" },
    { code: "EUR", name: "Евро", flag: "/flags/EUR.svg" },
    { code: "RUB", name: "Рубль РФ", flag: "/flags/RUB.svg" },
    { code: "KZT", name: "Тенге КЗ", flag: "/flags/KZT.svg" },
    { code: "CNY", name: "Юань КНР", flag: "/flags/CNY.svg" }
  ];

  // Базовые демо-значения (статичны) — используем в качестве исходной базы
  const BASE_DEMO_RATES: CurrencyRate[] = [
    { code: "USD", name: "Доллар США", rate: 84.25, flag: "/flags/USD.svg" },
    { code: "EUR", name: "Евро", rate: 93.45, flag: "/flags/EUR.svg" },
    { code: "RUB", name: "Рубль РФ", rate: 0.89, flag: "/flags/RUB.svg" },
    { code: "KZT", name: "Тенге КЗ", rate: 0.185, flag: "/flags/KZT.svg" },
    { code: "CNY", name: "Юань КНР", rate: 11.80, flag: "/flags/CNY.svg" }
  ];

  // Стабильная функция без зависимостей — предотвращает переинициализацию эффекта
  const fetchRates = useCallback(() => {
    setLoading(true);
    setError(null);
    console.log("Using demo currency data (CORS issues with external APIs)");

    const fluctuation = 0.02; // ±2%

    setRates(prevRates => {
      // Карта предыдущих значений для отображения тренда
      const prevMap: Record<string, number> = {};
      prevRates.forEach(r => { prevMap[r.code] = r.rate; });

      const updated: CurrencyRate[] = BASE_DEMO_RATES.map(base => {
        const previous = prevMap[base.code] ?? base.rate;
        const change = (Math.random() - 0.5) * 2 * fluctuation;
        return {
          ...base,
            // Используем предыдущий как опору, чтобы имитировать плавное изменение
          rate: previous * (1 + change)
        };
      });

      setPreviousRates(prevMap);
      setLastUpdate(new Date());
      setError("Демо режим курсов валют. В продакшен версии можно подключить реальное API НБКР.");
      setLoading(false);
      return updated;
    });
  }, []);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 30 * 60 * 1000); // обновление каждые 30 минут
    return () => clearInterval(interval);
  }, [fetchRates]);

  const formatRateDisplay = (rate: number, currencyCode: string) => {
    // For currencies with very low values, display rate for 100 or 1000 units
    if (currencyCode === "KZT" && rate < 1) {
      return `${(rate * 100).toFixed(2)} сом (за 100 ${currencyCode})`;
    }
    if (currencyCode === "CNY" && rate < 5) {
      return `${(rate * 10).toFixed(2)} сом (за 10 ${currencyCode})`;
    }
    return `${rate.toFixed(2)} сом`;
  };

  const getTrendIcon = (currentRate: number, previousRate: number | undefined) => {
    if (!previousRate) return null;
    
    if (currentRate > previousRate) {
      return <TrendingUp className="w-3 h-3 text-green-600" />;
    } else if (currentRate < previousRate) {
      return <TrendingDown className="w-3 h-3 text-red-600" />;
    }
    return null;
  };

  const getTrendColor = (currentRate: number, previousRate: number | undefined) => {
    if (!previousRate) return "text-gray-900";
    
    if (currentRate > previousRate) {
      return "text-green-600";
    } else if (currentRate < previousRate) {
      return "text-red-600";
    }
    return "text-gray-900";
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-4 shadow-sm border border-green-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-green-800 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Курсы валют НБКР
          </h3>
          <RefreshCw className="w-4 h-4 text-green-600 animate-spin" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-16 mb-1" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
              </div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && rates.length === 0) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 shadow-sm border border-red-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Курсы валют НБКР
          </h3>
          <button 
            onClick={fetchRates}
            className="p-1 text-red-600 hover:text-red-800 transition-colors"
            title="Обновить"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="text-red-700 text-sm mb-2">{error}</div>
        <button 
          onClick={fetchRates}
          className="text-xs text-red-600 hover:text-red-800 underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-4 shadow-sm border border-green-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-green-800 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Курсы валют НБКР
        </h3>
        <button 
          onClick={fetchRates}
          className="p-1 text-green-600 hover:text-green-800 transition-colors"
          title="Обновить"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-3">
        {rates.map((rate) => (
          <div key={rate.code} className="bg-white/60 rounded-md p-3 hover:bg-white/80 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={rate.flag}
                  alt={rate.code}
                  className="w-6 h-4 object-cover rounded border border-gray-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div>
                  <div className="font-medium text-gray-900 text-sm">{rate.code}</div>
                  <div className="text-xs text-gray-600">{rate.name}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`font-bold text-sm ${getTrendColor(rate.rate, previousRates[rate.code])}`}>
                  {formatRateDisplay(rate.rate, rate.code)}
                </div>
                <div className="flex items-center justify-end gap-1">
                  {getTrendIcon(rate.rate, previousRates[rate.code])}
                  {previousRates[rate.code] && (
                    <span className="text-xs text-gray-500">
                      {previousRates[rate.code] !== rate.rate ? 
                        (rate.rate - previousRates[rate.code] > 0 ? '+' : '') + 
                        (rate.rate - previousRates[rate.code]).toFixed(2) 
                        : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {lastUpdate && (
        <div className="mt-3 pt-2 border-t border-green-200/50">
          <div className="text-xs text-green-700 text-center">
            Обновлено: {lastUpdate.toLocaleString('ru-RU', { 
              day: '2-digit', 
              month: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
          {error && (
            <div className="text-xs text-orange-600 text-center mt-1">
              📡 Демо данные - API недоступен
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CurrencyWidget;