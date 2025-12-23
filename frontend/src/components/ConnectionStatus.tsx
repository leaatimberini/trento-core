'use client';

import { useOnlineStatus } from '../lib/useOnlineStatus';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
    onSync?: () => void;
}

export default function ConnectionStatus({ onSync }: ConnectionStatusProps) {
    const { isOnline, pendingSalesCount } = useOnlineStatus();

    if (isOnline && pendingSalesCount === 0) {
        return null; // Don't show anything when online with no pending
    }

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${isOnline
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                : 'bg-red-500/20 border border-red-500/50 text-red-400'
            }`}>
            {isOnline ? (
                <>
                    <Wifi size={18} />
                    <span>En línea</span>
                    {pendingSalesCount > 0 && (
                        <>
                            <span className="mx-1">|</span>
                            <span className="text-sm">{pendingSalesCount} ventas sincronizando</span>
                            <RefreshCw size={14} className="animate-spin ml-1" />
                        </>
                    )}
                </>
            ) : (
                <>
                    <WifiOff size={18} />
                    <span>Sin conexión</span>
                    {pendingSalesCount > 0 && (
                        <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs ml-2">
                            {pendingSalesCount} pendientes
                        </span>
                    )}
                </>
            )}
        </div>
    );
}
