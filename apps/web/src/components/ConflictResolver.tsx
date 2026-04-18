/**
 * PHASE 5: OFFLINE-FIRST LOGIC
 * UI component: Conflict resolver
 * Shows local vs server versions side by side
 */

import React, { useState } from 'react';
import { resolveConflict } from '../lib/syncEngine';
import { useConflicts } from '../hooks/useOffline';

export function ConflictResolver() {
  const conflicts = useConflicts();
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  if (conflicts.length === 0) {
    return null;
  }

  const conflict = conflicts.find(c => c.id === selectedConflict) || conflicts[0];

  const handleKeepLocal = async (id: string) => {
    setMerging(true);
    try {
      await resolveConflict(id, 'LOCAL');
      setSelectedConflict(null);
    } finally {
      setMerging(false);
    }
  };

  const handleKeepServer = async (id: string) => {
    setMerging(true);
    try {
      await resolveConflict(id, 'SERVER');
      setSelectedConflict(null);
    } finally {
      setMerging(false);
    }
  };

  const handleMerge = async (id: string) => {
    setMerging(true);
    try {
      const merged = { ...conflict.conflictData, ...conflict.payload };
      await resolveConflict(id, 'MANUAL', merged);
      setSelectedConflict(null);
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-96 overflow-auto p-6">
        <h2 className="text-xl font-bold mb-4">Resolve Conflicts ({conflicts.length})</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="col-span-1">
            <h3 className="font-semibold text-sm mb-3">Conflicts</h3>
            <div className="space-y-1">
              {conflicts.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConflict(c.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    selectedConflict === c.id ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {c.entityType} #{c.id.slice(0, 8)}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-2 border-l border-gray-200 pl-4">
            {conflict && (
              <>
                <h3 className="font-semibold text-sm mb-3">
                  {conflict.entityType} - {conflict.action}
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-4 max-h-48 overflow-y-auto">
                  <div>
                    <h4 className="text-xs font-semibold text-blue-600 mb-2">Local Version</h4>
                    <pre className="bg-blue-50 p-2 rounded text-xs whitespace-pre-wrap break-words">
                      {JSON.stringify(conflict.payload, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-red-600 mb-2">Server Version</h4>
                    <pre className="bg-red-50 p-2 rounded text-xs whitespace-pre-wrap break-words">
                      {JSON.stringify(conflict.conflictData, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleKeepLocal(conflict.id)}
                    disabled={merging}
                    className="flex-1 bg-blue-500 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    Keep Local
                  </button>
                  <button
                    onClick={() => handleMerge(conflict.id)}
                    disabled={merging}
                    className="flex-1 bg-yellow-500 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    Merge
                  </button>
                  <button
                    onClick={() => handleKeepServer(conflict.id)}
                    disabled={merging}
                    className="flex-1 bg-red-500 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    Keep Server
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConflictResolver;
