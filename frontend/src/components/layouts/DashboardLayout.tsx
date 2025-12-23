
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    Truck,
    ClipboardList,
    BarChart3,
    LogOut,
    Menu,
    X,
    Settings,
    ShieldAlert,
    Megaphone,
    Store,
    Heart,
    Brain,
    FileText,
    MapPin
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push("/pos"); // Or login
    };

    const menuItems = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/pos", label: "Punto de Venta", icon: ShoppingCart },
        { href: "/orders", label: "Pedidos Entrantes", icon: ClipboardList },
        { href: "/inventory", label: "Inventario", icon: Package },
        { href: "/purchase-orders", label: "Compras", icon: ClipboardList },
        { href: "/suppliers", label: "Proveedores", icon: Truck },
        { href: "/customers", label: "Clientes", icon: Users },
        { href: "/wholesale", label: "Mayoristas B2B", icon: Truck },
        { href: "/crm", label: "CRM & Fidelización", icon: Heart },
        { href: "/price-lists", label: "Listas de Precios", icon: ClipboardList },
        { href: "/finance", label: "Finanzas", icon: BarChart3 },
        { href: "/finance/calculator", label: "Calculadora de Rentabilidad", icon: ShieldAlert },
        { href: "/billing", label: "Facturación", icon: ClipboardList },
        { href: "/logistics", label: "Logística", icon: MapPin },
        { href: "/ai-analytics", label: "IA Analytics", icon: Brain },
        { href: "/blog", label: "Blog & Marketing", icon: FileText },
        { href: "/integrations", label: "Integraciones", icon: Settings },
        { href: "/marketing", label: "Marketing", icon: Megaphone },
        { href: "/reports", label: "Reportes", icon: ClipboardList },
        { href: "/audit", label: "Auditoría", icon: ShieldAlert },
        { href: "/settings", label: "Configuración", icon: Settings },
        { href: "/", label: "Ver Tienda", icon: Store },
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans flex overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`fixed md:relative z-40 bg-black/40 backdrop-blur-xl border-r border-white/5 h-screen transition-all duration-300 flex flex-col ${isSidebarOpen ? "w-64" : "w-20"
                    } ${isSidebarOpen ? "translate-x-0" : "-translate-x-64 md:translate-x-0"}`}
            >
                {/* Logo Area */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
                    {isSidebarOpen ? (
                        <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-200 tracking-tight">
                            TRENTO<span className="text-white font-light">CORE</span>
                        </h1>
                    ) : (
                        <span className="text-xl font-bold text-amber-500 mx-auto">T</span>
                    )}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="md:hidden text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3 custom-scrollbar">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    }`}
                                title={!isSidebarOpen ? item.label : ""}
                            >
                                <div className={`min-w-5 ${isActive ? "text-amber-500" : "text-gray-500 group-hover:text-gray-300"}`}>
                                    <Icon size={20} />
                                </div>
                                {isSidebarOpen && (
                                    <span className={`font-medium ${isActive ? "font-bold" : ""}`}>
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / Logout */}
                <div className="p-4 border-t border-white/5">
                    {isSidebarOpen && (
                        <div className="mb-4 flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold">
                                {user?.name?.charAt(0) || "U"}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold truncate">{user?.name || "Usuario"}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.role || "Role"}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors ${!isSidebarOpen && "justify-center"}`}
                    >
                        <LogOut size={20} />
                        {isSidebarOpen && <span>Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-neutral-950">

                {/* Mobile Header */}
                <header className="md:hidden h-16 flex items-center justify-between px-4 border-b border-white/5 bg-neutral-900/50 backdrop-blur-md">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="text-gray-400 hover:text-white"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-lg">Trento</span>
                    <div className="w-6"></div> {/* Spacer */}
                </header>

                {/* Page Content Scrollable Area */}
                <main className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar relative">
                    {/* Background ambient glow */}
                    <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px]" />
                        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
                    </div>

                    <div className="relative z-10 max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
