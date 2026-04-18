import { describe, it, expect } from 'vitest';
import {
  calculateJumpabilityIndex,
  getJumpStatus,
  kphToKnots,
  buildOpenMeteoForecastUrl,
} from '../services/weather/openMeteoCore';

describe('openMeteoCore', () => {
  it('calculateJumpabilityIndex returns 100 for calm clear conditions', () => {
    expect(calculateJumpabilityIndex(5, 10, 0, 0)).toBe(100);
  });

  it('getJumpStatus maps JI bands', () => {
    expect(getJumpStatus(90)).toBe('GREEN');
    expect(getJumpStatus(75)).toBe('YELLOW');
    expect(getJumpStatus(50)).toBe('RED');
  });

  it('kphToKnots converts roughly', () => {
    expect(kphToKnots(100)).toBe(54);
  });

  it('buildOpenMeteoForecastUrl encodes timezone', () => {
    const u = buildOpenMeteoForecastUrl({ latitude: 1.5, longitude: -2.25, timezone: 'Europe/London' });
    expect(u).toContain('latitude=1.5');
    expect(u).toContain('Europe%2FLondon');
  });
});
