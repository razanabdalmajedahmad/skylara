import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';

export interface Weather {
  temperature: number;
  windSpeed: number;
  windDirection: string;
  condition: string;
  jumpability: 'excellent' | 'good' | 'moderate' | 'poor';
  /** °C — same scale as temperature when provided */
  feelsLike?: number;
  humidity?: number;
  weatherHold?: boolean;
  weatherHoldReason?: string;
  // Extended fields from API
  ji?: number;
  status?: string;
  ground?: string;
  alt3k?: string;
  alt6k?: string;
  base?: string;
  vis?: string;
  sunset?: string;
  cloudCover?: number;
  dropzone?: string;
}

/** Map API status (GREEN/YELLOW/RED) to jumpability label */
function mapJumpability(status?: string): Weather['jumpability'] {
  switch (status) {
    case 'GREEN': return 'excellent';
    case 'YELLOW': return 'moderate';
    case 'RED': return 'poor';
    default: return 'good';
  }
}

/** Extract wind speed number from "2 kts SSE" format */
function parseWindSpeed(ground?: string): number {
  const match = ground?.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Extract wind direction from "2 kts SSE" format */
function parseWindDirection(ground?: string): string {
  const match = ground?.match(/kts\s+(.+)/);
  return match ? match[1] : 'N';
}

export function useWeather() {
  const dzId = useDropzoneStore((s) => s.activeDz?.id);

  return useQuery({
    queryKey: ['weather', dzId],
    queryFn: async () => {
      if (!dzId) return null;
      const response = await api.get('/weather', { params: { dropzoneId: dzId } });
      const raw = response.data as any;
      // API returns temp in °F — convert to °C for display
      const tempC = raw.temp ? Math.round((raw.temp - 32) * 5 / 9) : 0;
      // Map API shape → hook interface
      const feelsF = raw.feelsLike ?? raw.feels_like;
      const feelsC =
        feelsF != null ? Math.round((feelsF - 32) * 5 / 9) : undefined;
      return {
        temperature: tempC,
        feelsLike: feelsC,
        humidity: raw.humidity ?? raw.relativeHumidity,
        weatherHold: raw.weatherHold ?? raw.hold ?? raw.status === 'RED',
        weatherHoldReason: raw.weatherHoldReason ?? raw.holdReason,
        windSpeed: parseWindSpeed(raw.ground),
        windDirection: parseWindDirection(raw.ground),
        condition: (() => {
          const cc = raw.cloudCover ?? 0;
          return cc > 75 ? 'Overcast' : cc > 50 ? 'Cloudy' : cc > 25 ? 'Partly Cloudy' : 'Clear';
        })(),
        jumpability: mapJumpability(raw.status),
        ji: raw.ji,
        status: raw.status,
        ground: raw.ground,
        alt3k: raw.alt3k,
        alt6k: raw.alt6k,
        base: raw.base,
        vis: raw.vis,
        sunset: raw.sunset,
        cloudCover: raw.cloudCover,
        dropzone: raw.dropzone,
      } as Weather;
    },
    enabled: !!dzId,
    staleTime: 300000,
    refetchInterval: 300000,
  });
}
