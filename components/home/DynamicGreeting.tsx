"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  fallbackName: string;
};

type WeatherData = {
  temp: number;
  max: number;
  min: number;
  code: number;
  rainProbability: number;
};

const PRILEP_CENTER = { lat: 41.3451, lon: 21.555 };

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Добро утро";
  if (hour < 18) return "Добар ден";
  return "Добра вечер";
}

function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67].includes(code)) return "🌧️";
  if ([71, 73, 75, 77].includes(code)) return "❄️";
  if ([80, 81, 82].includes(code)) return "⛈️";
  if ([95, 96, 99].includes(code)) return "🌩️";
  return "🌡️";
}

export default function DynamicGreeting({ fallbackName }: Props) {
  const [placeLabel] = useState(fallbackName || "Прилеп");
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${PRILEP_CENTER.lat}&longitude=${PRILEP_CENTER.lon}` +
          "&current=temperature_2m,weather_code" +
          "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
          "&timezone=auto";

        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();

        if (cancelled) return;

        setWeather({
          temp: Math.round(data?.current?.temperature_2m ?? 0),
          max: Math.round(data?.daily?.temperature_2m_max?.[0] ?? 0),
          min: Math.round(data?.daily?.temperature_2m_min?.[0] ?? 0),
          code: Number(data?.current?.weather_code ?? 0),
          rainProbability: Math.round(
            data?.daily?.precipitation_probability_max?.[0] ?? 0,
          ),
        });
      } catch {
        // Silent fallback: greeting still renders even without weather.
      }
    }

    loadWeather();
    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = useMemo(() => getTimeGreeting(), []);

  return (
    <div className="lg:flex lg:justify-between items-start">
      <div>
        <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight text-theme-heading">
          {greeting}, {placeLabel}.
        </h1>
        <p className="mt-2 max-w-theme-content text-sm leading-6 text-theme-muted">
          {weather
            ? `${weatherIcon(weather.code)} ${weather.temp}°C • Денес ${weather.min}°/${weather.max}° • 🌧️ ${weather.rainProbability}%`
            : "Пријави проблеми. Координирај локални акции. Држи ги лидерите одговорни."}
        </p>
      </div>
    </div>
  );
}
