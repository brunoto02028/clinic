'use client';

import { useState } from 'react';
import { useLocale } from '@/hooks/use-locale';

interface Props {
  provider: { key: string; name: string; icon: string };
  connected: boolean;
  /**
   * Se o provedor confirmou que vai mandar. `connected` só diz que a
   * autorização funcionou, e um aparelho autorizado e mudo aparecia aqui
   * exatamente igual a um funcionando (atividade 075, T-10). O app já
   * distinguia; esta tela é a outra ponta do mesmo paciente.
   */
  delivery?: 'receiving' | 'partial' | 'silent' | 'unchecked';
  /** Se o que falta é a pressão — a medida que esta clínica trata. */
  missingBloodPressure?: boolean;
  onFixDelivery?: () => void;
  lastSync?: string;
  onConnect: () => void;
  /** Blocked until the patient accepts the monitoring notice (T-13). */
  connectDisabled?: boolean;
  connectDisabledReason?: string;
  onDisconnect: () => void;
  onSync: () => void;
}

export function ConnectDeviceCard({ provider, connected, delivery, missingBloodPressure, onFixDelivery, lastSync, onConnect, onDisconnect, onSync, connectDisabled, connectDisabledReason }: Props) {
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const { locale } = useLocale();
  const silent = connected && (delivery === 'silent' || delivery === 'partial');
  const isPt = locale === 'pt-BR';

  return (
    <div className={`border rounded-lg p-4 flex items-center justify-between ${
      silent
        ? 'border-amber-300 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5'
        : connected
        ? 'border-teal-300 bg-teal-50/50 dark:border-teal-500/30 dark:bg-teal-500/5'
        : 'border-border'
    }`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{provider.icon}</span>
        <div>
          <p className="font-semibold text-sm text-foreground">{provider.name}</p>
          {connected && lastSync && (
            <p className="text-xs text-muted-foreground">
              {isPt ? 'Última sincronização' : 'Last sync'}: {new Date(lastSync).toLocaleString(isPt ? 'pt-BR' : 'en-GB')}
            </p>
          )}
          {silent && (
            <p className="text-xs text-amber-600 dark:text-amber-400 max-w-xs">
              {delivery === 'silent'
                ? (isPt
                    ? 'Autorizado, mas ainda não está enviando medições.'
                    : 'Authorised, but not sending measurements yet.')
                : missingBloodPressure
                ? (isPt
                    ? 'Não está enviando sua pressão arterial.'
                    : 'Not sending your blood pressure.')
                : (isPt
                    ? 'Enviando só parte das suas medições.'
                    : 'Sending only part of your measurements.')}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {connected ? (
          <>
            {silent && onFixDelivery && (
              <button
                onClick={async () => { setFixing(true); await onFixDelivery(); setFixing(false); }}
                disabled={fixing}
                className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
              >
                {fixing ? '...' : (isPt ? 'Corrigir' : 'Fix')}
              </button>
            )}
            <button
              onClick={async () => { setLoading(true); await onSync(); setLoading(false); }}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? (isPt ? 'Sincronizando...' : 'Syncing...') : (isPt ? 'Sincronizar' : 'Sync')}
            </button>
            <button
              onClick={onDisconnect}
              className="px-3 py-1.5 text-xs font-medium text-rose-400 border border-rose-500/20 rounded-md hover:bg-rose-500/10"
            >
              {isPt ? 'Desconectar' : 'Disconnect'}
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            disabled={connectDisabled}
            title={connectDisabled ? connectDisabledReason : undefined}
            className="px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-violet-600"
          >
            {isPt ? 'Conectar' : 'Connect'}
          </button>
        )}
      </div>
    </div>
  );
}
