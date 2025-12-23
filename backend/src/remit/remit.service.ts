import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RemitStatus } from '@prisma/client';

export interface CreateRemitDto {
    pointOfSale: number;
    letter?: string;
    saleId?: string;
    invoiceId?: string;
    originAddress: string;
    originCity?: string;
    originProvince?: string;
    customerName: string;
    customerTaxId?: string;
    destinationAddress: string;
    destinationCity?: string;
    destinationProvince?: string;
    transportCompany?: string;
    vehiclePlate?: string;
    driverName?: string;
    driverDNI?: string;
    items: Array<{
        productId: string;
        productName: string;
        sku?: string;
        quantity: number;
        unit: string;
    }>;
    totalPackages?: number;
    totalWeight?: number;
    observations?: string;
}

@Injectable()
export class RemitService {
    private readonly logger = new Logger(RemitService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get next remit number
     */
    async getNextRemitNumber(pointOfSale: number, letter: string = 'X'): Promise<number> {
        const sequence = await this.prisma.remitSequence.upsert({
            where: {
                pointOfSale_letter: { pointOfSale, letter }
            },
            create: {
                pointOfSale,
                letter,
                lastNumber: 1
            },
            update: {
                lastNumber: { increment: 1 }
            }
        });

        return sequence.lastNumber;
    }

    /**
     * Create a new remit
     */
    async createRemit(dto: CreateRemitDto) {
        const letter = dto.letter || 'X';
        const number = await this.getNextRemitNumber(dto.pointOfSale, letter);

        const remit = await this.prisma.remit.create({
            data: {
                pointOfSale: dto.pointOfSale,
                number,
                letter,
                status: RemitStatus.DRAFT,
                saleId: dto.saleId,
                invoiceId: dto.invoiceId,
                originAddress: dto.originAddress,
                originCity: dto.originCity,
                originProvince: dto.originProvince,
                customerName: dto.customerName,
                customerTaxId: dto.customerTaxId,
                destinationAddress: dto.destinationAddress,
                destinationCity: dto.destinationCity,
                destinationProvince: dto.destinationProvince,
                transportCompany: dto.transportCompany,
                vehiclePlate: dto.vehiclePlate,
                driverName: dto.driverName,
                driverDNI: dto.driverDNI,
                items: dto.items,
                totalPackages: dto.totalPackages || dto.items.length,
                totalWeight: dto.totalWeight,
                observations: dto.observations,
            }
        });

        this.logger.log(`Remit created: ${letter}${dto.pointOfSale.toString().padStart(4, '0')}-${number.toString().padStart(8, '0')}`);

        return remit;
    }

    /**
     * Get remit by ID
     */
    async getRemit(id: string) {
        return this.prisma.remit.findUnique({
            where: { id }
        });
    }

    /**
     * Get remits by date range
     */
    async getRemits(from: Date, to: Date, status?: RemitStatus) {
        return this.prisma.remit.findMany({
            where: {
                issueDate: { gte: from, lte: to },
                ...(status && { status })
            },
            orderBy: { issueDate: 'desc' }
        });
    }

    /**
     * Update remit status
     */
    async updateRemitStatus(id: string, status: RemitStatus) {
        return this.prisma.remit.update({
            where: { id },
            data: { status }
        });
    }

    /**
     * Mark as delivered with receiver info
     */
    async markDelivered(id: string, data: {
        receiverName: string;
        receiverDNI?: string;
        signature?: string;
    }) {
        return this.prisma.remit.update({
            where: { id },
            data: {
                status: RemitStatus.DELIVERED,
                receiverName: data.receiverName,
                receiverDNI: data.receiverDNI,
                signature: data.signature,
                receivedAt: new Date(),
                deliveryDate: new Date()
            }
        });
    }

    /**
     * Generate PDF representation (returns data for PDF generation)
     */
    async getRemitForPDF(id: string) {
        const remit = await this.prisma.remit.findUnique({
            where: { id }
        });

        if (!remit) return null;

        // Format remit number
        const formattedNumber = `${remit.letter}${remit.pointOfSale.toString().padStart(4, '0')}-${remit.number.toString().padStart(8, '0')}`;

        return {
            ...remit,
            formattedNumber,
            formattedDate: remit.issueDate.toLocaleDateString('es-AR'),
            items: remit.items as Array<{
                productId: string;
                productName: string;
                sku?: string;
                quantity: number;
                unit: string;
            }>,
            // PDF layout hints
            pdfLayout: {
                title: 'REMITO',
                subtitle: remit.letter === 'X' ? 'Documento no válido como factura' : 'Remito Electrónico',
                companySection: {
                    // Company data would come from config
                },
                customerSection: {
                    name: remit.customerName,
                    taxId: remit.customerTaxId,
                    address: remit.destinationAddress,
                    city: remit.destinationCity,
                    province: remit.destinationProvince
                },
                transportSection: {
                    company: remit.transportCompany,
                    vehicle: remit.vehiclePlate,
                    driver: remit.driverName,
                    driverDNI: remit.driverDNI
                },
                totals: {
                    packages: remit.totalPackages,
                    weight: remit.totalWeight ? `${remit.totalWeight} kg` : null
                }
            }
        };
    }

    /**
     * Create remit from sale
     */
    async createRemitFromSale(saleId: string, pointOfSale: number, originAddress: string) {
        // Get sale with items and customer
        const sale = await this.prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                customer: true,
                items: { include: { product: true } }
            }
        });

        if (!sale) {
            throw new Error('Sale not found');
        }

        const items = sale.items.map(item => ({
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            quantity: item.quantity,
            unit: 'UNIDAD'
        }));

        return this.createRemit({
            pointOfSale,
            saleId,
            originAddress,
            customerName: sale.customer?.name || 'Consumidor Final',
            customerTaxId: sale.customer?.taxId,
            destinationAddress: sale.customer?.address || 'A confirmar',
            destinationCity: sale.customer?.city,
            items,
            totalPackages: items.length
        });
    }

    /**
     * Get pending remits for delivery
     */
    async getPendingRemits() {
        return this.prisma.remit.findMany({
            where: {
                status: { in: [RemitStatus.PENDING, RemitStatus.IN_TRANSIT] }
            },
            orderBy: { issueDate: 'asc' }
        });
    }
}
