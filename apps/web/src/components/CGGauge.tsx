'use client';

interface CGGaugeProps {
  position: number;
  minSafe: number;
  maxSafe: number;
  label?: string;
}

export function CGGauge({ position, minSafe, maxSafe, label = 'Center of Gravity' }: CGGaugeProps) {
  const isSafe = position >= minSafe && position <= maxSafe;
  const isWarning = position >= minSafe - 5 && position <= maxSafe + 5;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-gray-700">{label}</label>
        <span className={`text-sm font-bold ${isSafe ? 'text-green-600' : isWarning ? 'text-yellow-600' : 'text-red-600'}`}>
          {position.toFixed(1)}%
        </span>
      </div>

      <div className="cg-gauge relative">
        <div className="absolute inset-0 flex">
          <div
            className="bg-red-500"
            style={{ width: `${minSafe}%` }}
          />
          <div
            className="bg-green-500"
            style={{ width: `${maxSafe - minSafe}%` }}
          />
          <div
            className="bg-red-500"
            style={{ width: `${100 - maxSafe}%` }}
          />
        </div>

        <div
          className="absolute top-0 bottom-0 w-1 bg-black transition-all"
          style={{ left: `${position}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{minSafe.toFixed(0)}%</span>
        <span>{maxSafe.toFixed(0)}%</span>
      </div>
    </div>
  );
}
