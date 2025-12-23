import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "TrentoCore ERP",
    description: "Enterprise Resource Planning for Trento Bebidas",
};

import { AuthProvider } from "../context/AuthContext";

import AiChatWidget from "../components/AiChatWidget";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    {children}
                    <AiChatWidget />
                </AuthProvider>
            </body>
        </html>
    );
}
