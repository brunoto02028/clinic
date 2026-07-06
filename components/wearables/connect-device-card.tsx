'use client';

import { useState } from 'react';

interface Props {
  provider: { key: string; name: string; icon: string };
  connected: boolean;
  lastSync?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
}

export function ConnectDeviceCard({ provider, connected, lastSync, onConnect, onDisconnect, onSync }: Props) {
  const [loading, setLoading] = useState(false);

  return (
    <div className={`border rounded-lg p-4 flex items-center justify-between ${connected ? 'border-teal-300 bg-teal-50/50 dark:border-teal-500/30 dark:bg-teal-500/5' : 'border-border'}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{provider.icon}</span>
        <div>
          <p className="font-semibold text-sm text-foreground">{provider.name}</p>
          {connected && lastSync && (
            <p className="text-xs text-muted-foreground">
              Last sync: {new Date(lastSync).toLocaleString()}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {connected ? (
          <>
            <button
              onClick={async () => { setLoading(true); await onSync(); setLoading(false); }}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? 'Syncing...' : 'Sync'}
            </button>
            <button
              onClick={onDisconnect}
              className="px-3 py-1.5 text-xs font-medium text-rose-400 border border-rose-500/20 rounded-md hover:bg-rose-500/10"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-md hover:bg-violet-700"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}
