import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatResponse {
    response: string;
    context?: any;
    tokens?: number;
}

// Business context for the AI
const SYSTEM_PROMPT = `Eres el asistente virtual de Trento Core, un sistema ERP/POS especializado para distribuidoras de bebidas en Argentina.

Tu rol es ayudar a los usuarios con:
1. Consultas sobre ventas, inventario y clientes
2. Explicar métricas y reportes
3. Dar recomendaciones de negocio
4. Responder preguntas sobre facturación AFIP

Responde siempre en español argentino, de forma concisa y profesional.
Si no tienes información específica, indica que necesitas consultar los datos.`;

@Injectable()
export class OllamaChatService {
    private readonly logger = new Logger(OllamaChatService.name);
    private ollamaUrl: string;
    private model: string;

    constructor(private prisma: PrismaService) {
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        this.model = process.env.OLLAMA_MODEL || 'llama3.2';
    }

    /**
     * Check if Ollama is available
     */
    async checkHealth(): Promise<{ available: boolean; model: string }> {
        try {
            const response = await fetch(`${this.ollamaUrl}/api/tags`);
            if (response.ok) {
                return { available: true, model: this.model };
            }
        } catch (error) {
            this.logger.warn('Ollama not available');
        }
        return { available: false, model: this.model };
    }

    /**
     * Get business context for the chat
     */
    private async getBusinessContext(): Promise<string> {
        // Get key metrics
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const salesThisMonth = await this.prisma.sale.aggregate({
            where: {
                createdAt: { gte: monthStart },
                status: 'COMPLETED'
            },
            _sum: { totalAmount: true },
            _count: true
        });

        const lowStockProducts = await this.prisma.inventoryItem.count({
            where: {
                quantity: { lt: 10 }
            }
        });

        const pendingOrders = await this.prisma.sale.count({
            where: { status: 'PENDING' }
        });

        return `
Contexto actual del negocio:
- Ventas del mes: $${Number(salesThisMonth._sum.totalAmount || 0).toLocaleString('es-AR')} (${salesThisMonth._count} operaciones)
- Productos con stock bajo: ${lowStockProducts}
- Pedidos pendientes: ${pendingOrders}
- Fecha actual: ${today.toLocaleDateString('es-AR')}
`;
    }

    /**
     * Chat with the AI assistant
     */
    async chat(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<ChatResponse> {
        // Check if Ollama is available
        const health = await this.checkHealth();

        if (!health.available) {
            // Fallback to rule-based responses
            return this.fallbackResponse(userMessage);
        }

        try {
            const context = await this.getBusinessContext();

            const messages: ChatMessage[] = [
                { role: 'system', content: SYSTEM_PROMPT + '\n' + context },
                ...conversationHistory.slice(-10), // Keep last 10 messages for context
                { role: 'user', content: userMessage }
            ];

            const response = await fetch(`${this.ollamaUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama error: ${response.status}`);
            }

            const data = await response.json();

            return {
                response: data.message?.content || 'No pude procesar tu consulta.',
                tokens: data.eval_count
            };
        } catch (error) {
            this.logger.error(`Chat error: ${error}`);
            return this.fallbackResponse(userMessage);
        }
    }

    /**
     * Fallback responses when Ollama is not available
     */
    private async fallbackResponse(message: string): Promise<ChatResponse> {
        const lowerMessage = message.toLowerCase();

        // Simple keyword-based responses
        if (lowerMessage.includes('ventas') || lowerMessage.includes('vendimos')) {
            const context = await this.getBusinessContext();
            return {
                response: `Aquí está el resumen de ventas:\n${context}\n¿Necesitas más detalles sobre algún período específico?`,
                context: { type: 'sales' }
            };
        }

        if (lowerMessage.includes('stock') || lowerMessage.includes('inventario')) {
            const lowStockItems = await this.prisma.inventoryItem.findMany({
                where: { quantity: { lt: 10 } },
                take: 5,
                include: { product: true },
                orderBy: { quantity: 'asc' }
            });

            const stockList = lowStockItems.map(i => `- ${i.product.name}: ${i.quantity} unidades`).join('\n');

            return {
                response: `Productos con stock bajo:\n${stockList}\n\n¿Querés que genere una orden de compra?`,
                context: { type: 'stock', products: lowStockItems }
            };
        }

        if (lowerMessage.includes('cliente') || lowerMessage.includes('clientes')) {
            const topCustomers = await this.prisma.customer.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' }
            });

            return {
                response: `Tenés ${topCustomers.length} clientes registrados. ¿Qué información necesitás sobre alguno en particular?`,
                context: { type: 'customers' }
            };
        }

        if (lowerMessage.includes('factura') || lowerMessage.includes('afip')) {
            return {
                response: `Para facturación electrónica AFIP podés:\n- Crear facturas A/B/C desde ventas\n- Solicitar CAE automáticamente\n- Generar notas de crédito\n- Exportar libro IVA en formato CITI\n\n¿Qué operación necesitás realizar?`,
                context: { type: 'fiscal' }
            };
        }

        if (lowerMessage.includes('ayuda') || lowerMessage.includes('help')) {
            return {
                response: `Soy el asistente de Trento Core. Puedo ayudarte con:\n\n📊 **Ventas**: Consultar ventas, métricas, tendencias\n📦 **Stock**: Ver inventario, productos bajo stock\n👥 **Clientes**: Información de clientes, segmentos\n🧾 **Facturación**: Facturas AFIP, CAE, libro IVA\n\n¿En qué te puedo ayudar?`,
                context: { type: 'help' }
            };
        }

        return {
            response: `Entendí tu consulta sobre "${message}". Para darte una respuesta precisa, ¿podrías especificar si se trata de ventas, stock, clientes o facturación?`,
            context: { type: 'clarification' }
        };
    }

    /**
     * Get quick metrics summary
     */
    async getQuickSummary(): Promise<string> {
        const context = await this.getBusinessContext();
        return context;
    }

    /**
     * Answer a specific business question with data
     */
    async answerQuestion(question: string): Promise<ChatResponse> {
        return this.chat(question, []);
    }
}
