// Hook for detecting online/offline status
import { useState, useEffect } from 'react';

interface ConnectionStatus {
    isOnline: boolean;
    wasOffline: boolean;
    pendingSalesCount: number;
}

export function useOnlineStatus(): ConnectionStatus {
    const [isOnline, setIsOnline] = useState(true);
    const [wasOffline, setWasOffline] = useState(false);
    const [pendingSalesCount, setPendingSalesCount] = useState(0);

    useEffect(() => {
        // Set initial state
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        const handleOnline = () => {
            setIsOnline(true);
            // If we were offline, mark it for UI notification
            if (!navigator.onLine) {
                setWasOffline(true);
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            setWasOffline(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check pending sales count
        const checkPending = async () => {
            try {
                const { offlineStore } = await import('./offlineStore');
                const count = await offlineStore.getPendingSalesCount();
                setPendingSalesCount(count);
            } catch (error) {
                console.error('Error checking pending sales:', error);
            }
        };

        checkPending();
        const interval = setInterval(checkPending, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    return { isOnline, wasOffline, pendingSalesCount };
}
