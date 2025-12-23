"use client";

import { useState, useEffect } from "react";
import { api } from "../../services/api";
import AuthGuard from "../../components/AuthGuard";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { Truck, ShoppingBag, Package, Clock, CheckCircle, RefreshCw, Printer, Phone, MessageSquare, X, XCircle, Send, MapPin, User, CreditCard, Banknote, Trash2, AlertTriangle } from "lucide-react";

interface OrderItem {
    name: string;
    quantity: number;
    price: number;
}

interface ShippingAddress {
    street: string;
    number: string;
    postalCode: string;
    city: string;
    province: string;
}

interface IncomingOrder {
    id: string;
    source: 'rappi' | 'pedidosya' | 'ecommerce' | 'mercadolibre';
    externalId: string;
    status: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    customerDni?: string;
    address?: string;
    shippingAddress?: ShippingAddress;
    deliveryMethod?: 'SHIPPING' | 'PICKUP';
    paymentMethod?: string;
    items: OrderItem[];
    total: number;
    discountAmount?: number;
    shippingFee?: number;
    createdAt: string;
    notes?: string;
}

interface OrdersData {
    delivery: IncomingOrder[];
    ecommerce: IncomingOrder[];
    marketplace: IncomingOrder[];
    summary: {
        totalPending: number;
        totalPreparing: number;
        totalReady: number;
    };
}

type TabType = 'delivery' | 'ecommerce' | 'marketplace';

const SOURCE_CONFIG = {
    rappi: { label: 'Rappi', color: 'bg-orange-500', icon: '🛵' },
    pedidosya: { label: 'PedidosYa', color: 'bg-red-500', icon: '🍔' },
    ecommerce: { label: 'Tienda Online', color: 'bg-blue-500', icon: '🛒' },
    mercadolibre: { label: 'Mercado Libre', color: 'bg-yellow-500', icon: '📦' }
};

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string }> = {
    PENDING: { label: 'Pendiente', color: 'bg-amber-500', next: 'PAID' },
    PAID: { label: 'Pagado', color: 'bg-green-500', next: 'PREPARING' },
    PREPARING: { label: 'En Preparación', color: 'bg-blue-500', next: 'READY' },
    READY: { label: 'Listo', color: 'bg-emerald-500', next: 'SHIPPED' },
    SHIPPED: { label: 'Enviado', color: 'bg-purple-500' },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-500' }
};

export default function PedidosPage() {
    const [data, setData] = useState<OrdersData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('ecommerce');
    const [selectedOrder, setSelectedOrder] = useState<IncomingOrder | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidReason, setVoidReason] = useState('');

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadOrders = async () => {
        try {
            const result = await api.getIncomingOrders();
            setData(result);
        } catch (error) {
            console.error("Failed to load orders", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (orderId: string, newStatus: string) => {
        setUpdating(orderId);
        try {
            await api.updateOrderStatus(orderId, newStatus);
            await loadOrders();
            if (selectedOrder?.id === orderId) {
                setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
            }
        } catch (error) {
            alert("Error al actualizar estado");
        } finally {
            setUpdating(null);
        }
    };

    const handleRejectOrder = async () => {
        if (!selectedOrder) return;
        await handleStatusUpdate(selectedOrder.id, 'CANCELLED');
        setShowRejectModal(false);
        setSelectedOrder(null);
        setRejectReason('');
    };

    const handleVoidSale = async () => {
        if (!selectedOrder) return;
        setUpdating(selectedOrder.id);
        try {
            await api.voidSale(selectedOrder.id);
            await loadOrders();
            setShowVoidModal(false);
            setSelectedOrder(null);
            setVoidReason('');
            alert("Venta anulada correctamente. Se ha generado la Nota de Crédito correspondiente.");
        } catch (error) {
            alert("Error al anular la venta");
        } finally {
            setUpdating(null);
        }
    };

    const contactWhatsApp = (phone?: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        const message = encodeURIComponent('Hola! Te contactamos de Trento Bebidas respecto a tu pedido.');
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    };

    const callPhone = (phone?: string) => {
        if (!phone) return;
        window.location.href = `tel:${phone}`;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} hrs`;
        return date.toLocaleDateString();
    };

    const printOrder = (order: IncomingOrder) => {
        const sourceConfig = SOURCE_CONFIG[order.source];
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Pedido ${order.externalId}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
        .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .header h1 { font-size: 16px; font-weight: bold; }
        .customer { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #000; }
        .items { margin-bottom: 15px; }
        .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .total { font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; border-top: 1px dashed #000; padding-top: 10px; }
        .address { margin-top: 15px; padding: 8px; border: 1px dashed #000; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${sourceConfig.icon} PEDIDO #${order.externalId}</h1>
        <div>${sourceConfig.label} - ${order.deliveryMethod === 'PICKUP' ? 'RETIRA EN LOCAL' : 'ENVÍO'}</div>
        <div>${new Date(order.createdAt).toLocaleString('es-AR')}</div>
    </div>
    <div class="customer">
        <strong>${order.customerName}</strong><br>
        ${order.customerPhone || ''}<br>
        ${order.customerDni ? `DNI: ${order.customerDni}` : ''}<br>
        Pago: ${order.paymentMethod || 'No especificado'}
    </div>
    ${order.shippingAddress ? `
    <div class="address">
        <strong>DIRECCIÓN DE ENVÍO:</strong><br>
        ${order.shippingAddress.street} ${order.shippingAddress.number}<br>
        ${order.shippingAddress.city}, ${order.shippingAddress.province}<br>
        CP: ${order.shippingAddress.postalCode}
    </div>
    ` : ''}
    <div class="items">
        ${order.items.map(item => `
            <div class="item">
                <span>${item.quantity}x ${item.name}</span>
                <span>$${(item.quantity * item.price).toLocaleString()}</span>
            </div>
        `).join('')}
    </div>
    ${order.discountAmount ? `<div class="item"><span>Descuento</span><span>-$${order.discountAmount.toLocaleString()}</span></div>` : ''}
    ${order.shippingFee ? `<div class="item"><span>Envío</span><span>$${order.shippingFee.toLocaleString()}</span></div>` : ''}
    <div class="total">
        <span>TOTAL</span>
        <span>$${order.total.toLocaleString()}</span>
    </div>
    <div class="footer">¡Gracias por su compra!<br>🍷 Beber con moderación</div>
</body>
</html>`;
        const win = window.open('', '_blank', 'width=400,height=600');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.print();
        }
    };

    const printShippingLabel = (order: IncomingOrder) => {
        if (!order.shippingAddress) return;
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Etiqueta de Envío</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; }
        .label { border: 3px solid #000; padding: 20px; max-width: 400px; }
        .from, .to { margin-bottom: 20px; }
        .to { font-size: 18px; font-weight: bold; }
        .barcode { text-align: center; font-family: monospace; font-size: 24px; letter-spacing: 5px; margin-top: 20px; padding: 10px; border-top: 2px solid #000; }
    </style>
</head>
<body>
    <div class="label">
        <div class="from">
            <strong>REMITENTE:</strong><br>
            TRENTO BEBIDAS<br>
            Av. Corrientes 1234, CABA<br>
            Tel: +54 11 1234-5678
        </div>
        <div class="to">
            <strong>DESTINATARIO:</strong><br>
            ${order.customerName}<br>
            ${order.shippingAddress.street} ${order.shippingAddress.number}<br>
            ${order.shippingAddress.city}, ${order.shippingAddress.province}<br>
            CP: ${order.shippingAddress.postalCode}<br>
            Tel: ${order.customerPhone || 'N/A'}<br>
            DNI: ${order.customerDni || 'N/A'}
        </div>
        <div class="barcode">
            ${order.externalId}
        </div>
    </div>
</body>
</html>`;
        const win = window.open('', '_blank', 'width=450,height=600');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.print();
        }
    };

    const getOrders = (): IncomingOrder[] => {
        if (!data) return [];
        return data[activeTab] || [];
    };

    const tabs = [
        { key: 'ecommerce' as TabType, label: 'Tienda Online', icon: ShoppingBag, count: data?.ecommerce.length || 0 },
        { key: 'delivery' as TabType, label: 'Delivery', icon: Truck, count: data?.delivery.length || 0 },
        { key: 'marketplace' as TabType, label: 'Mercado Libre', icon: Package, count: data?.marketplace.length || 0 }
    ];

    const getPaymentIcon = (method?: string) => {
        if (method === 'MERCADOPAGO' || method === 'CREDIT_CARD') return <CreditCard size={14} className="text-blue-400" />;
        if (method === 'CASH') return <Banknote size={14} className="text-green-400" />;
        return <CreditCard size={14} className="text-gray-400" />;
    };

    if (loading) {
        return (
            <AuthGuard>
                <DashboardLayout>
                    <div className="flex h-full items-center justify-center text-amber-500">
                        Cargando pedidos...
                    </div>
                </DashboardLayout>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white">Pedidos Entrantes</h1>
                            <p className="text-gray-400">Gestiona pedidos de tienda online y delivery</p>
                        </div>
                        <button
                            onClick={loadOrders}
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-bold transition-all"
                        >
                            <RefreshCw size={18} />
                            Actualizar
                        </button>
                    </div>

                    {/* Summary KPIs */}
                    {data && (
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-amber-400">{data.summary.totalPending}</p>
                                <p className="text-sm text-gray-400">Pendientes</p>
                            </div>
                            <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-blue-400">{data.summary.totalPreparing}</p>
                                <p className="text-sm text-gray-400">En Preparación</p>
                            </div>
                            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-emerald-400">{data.summary.totalReady}</p>
                                <p className="text-sm text-gray-400">Listos</p>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === tab.key
                                    ? 'bg-amber-500 text-black'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                <tab.icon size={20} />
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-black/20' : 'bg-white/10'
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Orders List */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 overflow-auto">
                        {getOrders().length === 0 ? (
                            <div className="col-span-full flex items-center justify-center text-gray-500 py-20">
                                No hay pedidos en esta categoría
                            </div>
                        ) : (
                            getOrders().map(order => {
                                const sourceConfig = SOURCE_CONFIG[order.source];
                                const statusConfig = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-500' };

                                return (
                                    <div
                                        key={order.id}
                                        className={`bg-white/5 backdrop-blur-sm rounded-2xl p-4 border transition-all cursor-pointer ${selectedOrder?.id === order.id
                                            ? 'border-amber-500'
                                            : 'border-white/5 hover:border-amber-500/30'
                                            }`}
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${sourceConfig.color} text-white`}>
                                                    {sourceConfig.icon} {sourceConfig.label}
                                                </span>
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${statusConfig.color} text-white`}>
                                                    {statusConfig.label}
                                                </span>
                                                {order.deliveryMethod === 'PICKUP' && (
                                                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-400">
                                                        Retira
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock size={12} />
                                                {formatTime(order.createdAt)}
                                            </span>
                                        </div>

                                        {/* Customer Info */}
                                        <div className="mb-3">
                                            <p className="font-bold text-white">{order.customerName}</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                {getPaymentIcon(order.paymentMethod)}
                                                <span>{order.paymentMethod === 'MERCADOPAGO' ? 'Mercado Pago' : order.paymentMethod === 'CASH' ? 'Efectivo' : order.paymentMethod || 'Sin especificar'}</span>
                                            </div>
                                        </div>

                                        {/* Items Preview */}
                                        <div className="text-sm text-gray-400 mb-3">
                                            {order.items.slice(0, 2).map((item, i) => (
                                                <p key={i}>{item.quantity}x {item.name}</p>
                                            ))}
                                            {order.items.length > 2 && (
                                                <p className="text-amber-400">+{order.items.length - 2} más...</p>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="flex justify-between items-center pt-3 border-t border-white/10">
                                            <p className="text-lg font-bold text-white">
                                                ${order.total.toLocaleString()}
                                            </p>
                                            <div className="flex gap-2">
                                                {statusConfig.next && order.status !== 'CANCELLED' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStatusUpdate(order.id, statusConfig.next!);
                                                        }}
                                                        disabled={updating === order.id}
                                                        className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                                                    >
                                                        {updating === order.id ? (
                                                            <RefreshCw size={14} className="animate-spin" />
                                                        ) : (
                                                            <CheckCircle size={14} />
                                                        )}
                                                        {STATUS_CONFIG[statusConfig.next]?.label || 'Siguiente'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Order Detail Modal */}
                    {selectedOrder && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedOrder(null)}>
                            <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-lg border border-gray-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-white">
                                            {SOURCE_CONFIG[selectedOrder.source].icon} Pedido {selectedOrder.externalId}
                                        </h2>
                                        <p className="text-sm text-gray-400">{formatTime(selectedOrder.createdAt)}</p>
                                    </div>
                                    <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* Status */}
                                <div className="flex gap-2 mb-4">
                                    <span className={`px-3 py-1 rounded-lg text-sm font-bold ${STATUS_CONFIG[selectedOrder.status]?.color || 'bg-gray-500'} text-white`}>
                                        {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                                    </span>
                                    <span className="px-3 py-1 rounded-lg text-sm font-bold bg-white/10 text-gray-300">
                                        {selectedOrder.deliveryMethod === 'PICKUP' ? '📍 Retira en local' : '🚚 Envío'}
                                    </span>
                                </div>

                                {/* Customer */}
                                <div className="bg-white/5 rounded-xl p-4 mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <User size={16} className="text-amber-500" />
                                        <span className="font-bold text-white">{selectedOrder.customerName}</span>
                                    </div>
                                    {selectedOrder.customerPhone && <p className="text-sm text-gray-400">📞 {selectedOrder.customerPhone}</p>}
                                    {selectedOrder.customerEmail && <p className="text-sm text-gray-400">✉️ {selectedOrder.customerEmail}</p>}
                                    {selectedOrder.customerDni && <p className="text-sm text-gray-400">🪪 DNI: {selectedOrder.customerDni}</p>}

                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => contactWhatsApp(selectedOrder.customerPhone)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-2 rounded-lg font-bold text-sm"
                                        >
                                            <MessageSquare size={16} /> WhatsApp
                                        </button>
                                        <button
                                            onClick={() => callPhone(selectedOrder.customerPhone)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-2 rounded-lg font-bold text-sm"
                                        >
                                            <Phone size={16} /> Llamar
                                        </button>
                                    </div>
                                </div>

                                {/* Shipping Address */}
                                {selectedOrder.shippingAddress && (
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin size={16} className="text-blue-400" />
                                            <span className="font-bold text-white">Dirección de Envío</span>
                                        </div>
                                        <p className="text-gray-300">
                                            {selectedOrder.shippingAddress.street} {selectedOrder.shippingAddress.number}
                                        </p>
                                        <p className="text-gray-400">
                                            {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.province}
                                        </p>
                                        <p className="text-gray-400">CP: {selectedOrder.shippingAddress.postalCode}</p>
                                    </div>
                                )}

                                {/* Payment */}
                                <div className="bg-white/5 rounded-xl p-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        {getPaymentIcon(selectedOrder.paymentMethod)}
                                        <span className="text-white font-bold">
                                            {selectedOrder.paymentMethod === 'MERCADOPAGO' ? 'Mercado Pago' :
                                                selectedOrder.paymentMethod === 'CASH' ? 'Efectivo al retirar' :
                                                    selectedOrder.paymentMethod === 'TRANSFER' ? 'Transferencia' : 'No especificado'}
                                        </span>
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="space-y-2 mb-4">
                                    <h3 className="font-bold text-gray-400 text-sm">PRODUCTOS</h3>
                                    {selectedOrder.items.map((item, i) => (
                                        <div key={i} className="flex justify-between text-white">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>${(item.quantity * item.price).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {selectedOrder.discountAmount && selectedOrder.discountAmount > 0 && (
                                        <div className="flex justify-between text-emerald-400">
                                            <span>Descuento</span>
                                            <span>-${selectedOrder.discountAmount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {selectedOrder.shippingFee && selectedOrder.shippingFee > 0 && (
                                        <div className="flex justify-between text-gray-400">
                                            <span>Envío</span>
                                            <span>${selectedOrder.shippingFee.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-white/10">
                                        <span>Total</span>
                                        <span className="text-amber-400">${selectedOrder.total.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <button
                                        onClick={() => printOrder(selectedOrder)}
                                        className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-bold"
                                    >
                                        <Printer size={18} />
                                        Imprimir Ticket
                                    </button>
                                    {selectedOrder.deliveryMethod === 'SHIPPING' && selectedOrder.shippingAddress && (
                                        <button
                                            onClick={() => printShippingLabel(selectedOrder)}
                                            className="flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-xl font-bold"
                                        >
                                            <Send size={18} />
                                            Etiqueta Envío
                                        </button>
                                    )}
                                </div>

                                {/* Status Actions */}
                                {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'SHIPPED' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowRejectModal(true)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-3 rounded-xl font-bold"
                                        >
                                            <XCircle size={18} />
                                            Rechazar
                                        </button>
                                        {STATUS_CONFIG[selectedOrder.status]?.next && (
                                            <button
                                                onClick={() => handleStatusUpdate(selectedOrder.id, STATUS_CONFIG[selectedOrder.status].next!)}
                                                disabled={updating === selectedOrder.id}
                                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-3 rounded-xl font-bold disabled:opacity-50"
                                            >
                                                <CheckCircle size={18} />
                                                {STATUS_CONFIG[STATUS_CONFIG[selectedOrder.status].next!]?.label || 'Avanzar'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Void Action for Completed Orders */}
                                {(selectedOrder.status === 'PAID' || selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'SHIPPED') && (
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <button
                                            onClick={() => setShowVoidModal(true)}
                                            className="w-full flex items-center justify-center gap-2 bg-red-900/40 hover:bg-red-900/60 text-red-200 px-4 py-3 rounded-xl font-bold transition-all"
                                        >
                                            <Trash2 size={18} />
                                            Anular Venta Completa
                                        </button>
                                        <p className="text-center text-xs text-gray-500 mt-2">
                                            ⚠️ Esto restaurará el stock y generará una Nota de Crédito.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Reject Modal */}
                    {showRejectModal && selectedOrder && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
                            <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-md border border-gray-700">
                                <h3 className="text-lg font-bold text-white mb-4">Rechazar Pedido</h3>
                                <p className="text-gray-400 mb-4">¿Estás seguro de rechazar el pedido #{selectedOrder.externalId}?</p>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Motivo del rechazo (opcional)"
                                    className="w-full bg-black/30 border border-gray-600 rounded-xl p-3 text-white mb-4"
                                    rows={3}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowRejectModal(false)}
                                        className="flex-1 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-bold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleRejectOrder}
                                        className="flex-1 bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded-xl font-bold"
                                    >
                                        Confirmar Rechazo
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Void Modal */}
                    {showVoidModal && selectedOrder && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
                            <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-md border border-red-500/30">
                                <div className="flex items-center gap-3 mb-4 text-red-400">
                                    <AlertTriangle size={32} />
                                    <h3 className="text-lg font-bold text-white">Anular Venta #{selectedOrder.externalId}</h3>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                                    <p className="text-red-200 text-sm font-bold mb-2">ADVERTENCIA FINAL</p>
                                    <ul className="text-gray-300 text-sm list-disc pl-4 space-y-1">
                                        <li>Se restaurará el stock de {selectedOrder.items.length} productos.</li>
                                        <li>La venta pasará a estado <strong>CANCELADO</strong>.</li>
                                        <li>Se generará una <strong>Nota de Crédito Fiscal</strong> automáticamente ante AFIP.</li>
                                        <li>Esta acción <strong>NO</strong> se puede deshacer.</li>
                                    </ul>
                                </div>
                                <textarea
                                    value={voidReason}
                                    onChange={(e) => setVoidReason(e.target.value)}
                                    placeholder="Motivo de la anulación (Requerido para NC)"
                                    className="w-full bg-black/30 border border-gray-600 rounded-xl p-3 text-white mb-4"
                                    rows={3}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowVoidModal(false)}
                                        className="flex-1 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-bold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleVoidSale}
                                        disabled={!voidReason}
                                        className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        CONFIRMAR ANULACIÓN
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </AuthGuard >
    );
}
