'use client';

import { Fuel } from 'lucide-react';

interface FuelGaugeProps {
  percent: number;
  weight: number;
  capacity: number;
  compact?: boolean;
}

const FUEL_LOW = 25;
const FUEL_CRITICAL = 15;
const FUEL_CAUTION = 50;

export function FuelGauge({ percent, weight, capacity, compact = false }: FuelGaugeProps) {
  const isCritical = percent <= FUEL_CRITICAL;
  const isLow = percent <= FUEL_LOW;
  const isCaution = percent <= FUEL_CAUTION;

  const barClass = isCritical ? 'fuel-danger'
    : isLow ? 'fuel-caution'
    : isCaution ? 'fuel-caution'
    : 'fuel-safe';

  const textColor = isCritical ? 'text-red-600 dark:text-red-400'
    : isLow ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';

  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <Fuel size={compact ? 12 : 14} className={isLow ? 'text-amber-500 animate-pulse' : 'text-gray-500'} />
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Fuel</span>
        </div>
        <span className={`text-xs font-bold ${textColor}`}>
          {Math.round(clamped)}%
        </span>
      </div>

      <div className="fuel-gauge">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>

      {!compact && (
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{weight.toLocaleString()} lbs</span>
          <span>{capacity.toLocaleString()} lbs max</span>
        </div>
      )}
    </div>
  );
}
