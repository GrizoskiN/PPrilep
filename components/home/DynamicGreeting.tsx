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

function weatherLabel(code: number): string {
  if (code === 0) return "Ведро";
  if ([1, 2].includes(code)) return "Претежно ведро";
  if (code === 3) return "Облачно";
  if ([45, 48].includes(code)) return "Магла";
  if ([51, 53, 55, 56, 57].includes(code)) return "Слаб дожд";
  if ([61, 63, 65, 66, 67].includes(code)) return "Дожд";
  if ([71, 73, 75, 77].includes(code)) return "Снег";
  if ([80, 81, 82].includes(code)) return "Пороен дожд";
  if ([95, 96, 99].includes(code)) return "Невреме";
  return "Променливо";
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
        <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight text-slate-900">
          {greeting}, {placeLabel}.
        </h1>
        <p className="mt-2 max-w-2xl text-lg leading-8 text-slate-500">
          {weather
            ? `${weatherLabel(weather.code)} ${weather.temp}°C • Денес ${weather.min}°/${weather.max}° • Врнежи ${weather.rainProbability}%`
            : "Пријави проблеми. Координирај локални акции. Држи ги лидерите одговорни."}
        </p>
      </div>
      
    </div>
  );
}
