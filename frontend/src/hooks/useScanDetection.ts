
import { useEffect, useState } from "react";

export const useScanDetection = ({ onScan }: { onScan: (code: string) => void }) => {
    const [buffer, setBuffer] = useState("");
    const [lastKeyTime, setLastKeyTime] = useState(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const now = Date.now();
            const timeDiff = now - lastKeyTime;

            // Scanners type very fast (<20-50ms usually). 
            // If manual typing, diff is usually >100ms.
            // We reset buffer if too slow.
            if (timeDiff > 100) {
                setBuffer("");
            }

            setLastKeyTime(now);

            if (e.key === "Enter") {
                if (buffer.length > 2) {
                    // If we have a decent buffer, it's likely a scan.
                    onScan(buffer);
                    setBuffer("");
                }
            } else if (e.key.length === 1) {
                // Append printable chars
                setBuffer((prev) => prev + e.key);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [buffer, lastKeyTime, onScan]);
};
