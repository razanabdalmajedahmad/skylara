'use client';

import { Slot } from '@/hooks/useManifest';

interface SlotChipProps {
  slot: Slot;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, slot: Slot) => void;
  onClick?: (slot: Slot) => void;
}

export function SlotChip({ slot, draggable = false, onDragStart, onClick }: SlotChipProps) {
  const typeColors: Record<string, string> = {
    REGULAR: 'bg-blue-500 text-white',
    TANDEM: 'bg-purple-500 text-white',
    COACH: 'bg-green-500 text-white',
    CAMERA: 'bg-red-500 text-white',
    MANIFEST: 'bg-gray-500 text-white',
  };

  if (!slot.jumper) {
    return (
      <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-3 text-center text-gray-500 text-sm font-semibold">
        Empty {slot.type}
      </div>
    );
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart ? (e) => onDragStart(e, slot) : undefined}
      onClick={() => onClick?.(slot)}
      className={`${typeColors[slot.type]} rounded-lg p-3 cursor-pointer hover:opacity-80 transition-opacity ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <p className="font-semibold text-sm">{slot.jumper.name}</p>
      <p className="text-xs opacity-90">{slot.type}</p>
      <p className="text-xs opacity-75">{slot.jumper.weight}lbs</p>
    </div>
  );
}
