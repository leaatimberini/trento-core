
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.replace("/login");
        } else {
            setAuthorized(true);
        }
    }, [router]);

    if (!authorized) {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Checking Authorization...</div>;
    }

    return <>{children}</>;
}
