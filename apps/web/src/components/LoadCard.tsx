'use client';

import { Load } from '@/hooks/useManifest';
import { StatusBadge } from './StatusBadge';

interface LoadCardProps {
  load: Load;
  onClick?: (load: Load) => void;
  className?: string;
}

export function LoadCard({ load, onClick, className = '' }: LoadCardProps) {
  const callTime = new Date(load.callTime);
  const now = new Date();
  const minutesToCall = Math.max(0, Math.floor((callTime.getTime() - now.getTime()) / 60000));
  const hoursToCall = Math.floor(minutesToCall / 60);

  return (
    <div
      onClick={() => onClick?.(load)}
      className={`load-card p-4 cursor-pointer border-l-4 ${
        load.status === 'OPEN'
          ? 'border-l-emerald-500 bg-emerald-50'
          : load.status === 'FILLING'
            ? 'border-l-blue-500 bg-blue-50'
            : load.status === 'LOCKED'
              ? 'border-l-amber-500 bg-amber-50'
              : load.status === 'BOARDING'
                ? 'border-l-orange-500 bg-orange-50'
                : load.status === 'AIRBORNE'
                  ? 'border-l-red-500 bg-red-50'
                  : 'border-l-gray-500 bg-gray-50'
      } ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{load.aircraftReg}</h3>
          <p className="text-sm text-gray-600">Alt: {load.exitAltitude.toLocaleString()}ft</p>
        </div>
        <StatusBadge status={load.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white rounded p-2">
          <p className="text-xs text-gray-500 uppercase">Slots</p>
          <p className="text-lg font-bold text-gray-900">
            {load.currentSlots}/{load.totalSlots}
          </p>
        </div>
        <div className="bg-white rounded p-2">
          <p className="text-xs text-gray-500 uppercase">Call Time</p>
          <p className="text-sm font-semibold text-gray-900">
            {hoursToCall > 0 ? `${hoursToCall}h ${minutesToCall % 60}m` : `${minutesToCall}m`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-700 uppercase">CG</span>
          <span className="text-xs font-semibold text-gray-700">
            {load.cg.position.toFixed(1)}%
          </span>
        </div>
        <div className="cg-gauge">
          <div
            className={`h-full rounded-full transition-all ${
              load.cg.position < 25 || load.cg.position > 35
                ? 'cg-danger'
                : load.cg.position < 28 || load.cg.position > 32
                  ? 'cg-warning'
                  : 'cg-safe'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, load.cg.position))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
