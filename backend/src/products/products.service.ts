
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Generate URL-friendly slug from product name
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Remove consecutive hyphens
            .trim();
    }

    async findById(id: string) {
        return this.prisma.product.findUnique({
            where: { id }
        });
    }

    async findAll() {
        const products = await this.prisma.product.findMany({
            include: { inventoryItems: true }
        });

        return products.map(p => {
            const { inventoryItems, ...rest } = p;
            const currentStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
            return { ...rest, currentStock };
        });
    }

    /**
     * Get all unique product categories
     */
    async getCategories() {
        const categories = await this.prisma.product.groupBy({
            by: ['category'],
            where: {
                category: { not: null }
            },
            orderBy: {
                category: 'asc'
            }
        });

        // Filter out empty strings if any and return just the names
        return categories
            .map(c => c.category)
            .filter(c => c && c.trim().length > 0);
    }

    /**
     * Get all products with prices from a specific price list
     * Used by storefront and POS
     */
    async findAllWithPriceList(priceListId?: string) {
        // Get default list if no specific one provided
        let targetListId = priceListId;
        if (!targetListId) {
            const defaultList = await this.prisma.priceList.findFirst({
                where: { isDefault: true }
            });
            targetListId = defaultList?.id;
        }

        const products = await this.prisma.product.findMany({
            include: {
                inventoryItems: true,
            }
        });

        // Get prices from the target list
        let priceMap = new Map<string, number>();
        if (targetListId) {
            const priceItems = await this.prisma.priceListItem.findMany({
                where: { priceListId: targetListId }
            });
            priceMap = new Map(priceItems.map(i => [i.productId, Number(i.price)]));
        }

        return products.map(p => {
            const { inventoryItems, ...rest } = p;
            const currentStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);

            // Use price list price, fallback to basePrice
            const listPrice = priceMap.get(p.id);
            const displayPrice = listPrice ?? Number(p.basePrice);

            return {
                ...rest,
                currentStock,
                displayPrice, // Precio de venta según lista
                hasListPrice: !!listPrice,
                costPrice: Number(p.costPrice) // Mantener costo separado
            };
        });
    }

    async findOne(idOrSlug: string) {
        // Try to find by ID first, then by slug
        let product = await this.prisma.product.findUnique({
            where: { id: idOrSlug },
            include: { inventoryItems: true }
        });

        // If not found by ID, try by slug
        if (!product) {
            product = await this.prisma.product.findUnique({
                where: { slug: idOrSlug },
                include: { inventoryItems: true }
            });
        }

        if (!product) return null;

        const { inventoryItems, ...rest } = product;
        const currentStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
        return { ...rest, currentStock };
    }

    async findBySlug(slug: string) {
        const product = await this.prisma.product.findUnique({
            where: { slug },
            include: { inventoryItems: true }
        });

        if (!product) return null;

        const { inventoryItems, ...rest } = product;
        const currentStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
        return { ...rest, currentStock };
    }

    async create(dto: CreateProductDto) {
        // Generate SEO-friendly slug
        const baseSlug = this.generateSlug(dto.name);
        let slug = baseSlug;
        let counter = 1;

        // Ensure unique slug
        while (await this.prisma.product.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    sku: dto.sku,
                    ean: dto.ean,
                    name: dto.name,
                    slug: slug,
                    description: dto.description,
                    basePrice: dto.basePrice,
                    taxRate: dto.taxRate,
                    category: dto.category,
                    brand: dto.brand,
                    imageUrl: dto.imageUrl,
                    costPrice: dto.costPrice || 0,
                    minStock: dto.minStock || 0,
                    wholesalePrice: dto.wholesalePrice,
                    // Shipping dimensions
                    weight: dto.weight,
                    height: dto.height,
                    width: dto.width,
                    depth: dto.depth
                }
            });

            // Create initial inventory item if stock is provided
            if (dto.stock && dto.stock > 0) {
                await tx.inventoryItem.create({
                    data: {
                        productId: product.id,
                        quantity: dto.stock,
                        locationZone: 'A-01-01', // Default location
                        // Default logic implies we might need a warehouse or just basic tracking
                        // batchNumber: 'INITIAL' // Optional
                    }
                });
            }

            return product;
        });
    }

    async update(id: string, dto: UpdateProductDto) {
        // Remove fields that are not part of the Product model
        const { stock, currentStock, ...updateData } = dto as any;

        return this.prisma.product.update({
            where: { id },
            data: updateData
        });
    }

    async findByName(term: string) {
        const products = await this.prisma.product.findMany({
            where: {
                name: { contains: term, mode: 'insensitive' }
            },
            include: { inventoryItems: true }
        });

        return products.map(p => {
            const { inventoryItems, ...rest } = p;
            const currentStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
            return { ...rest, currentStock };
        });
    }

    async delete(id: string) {
        // Prevent delete if sales exist
        const salesCount = await this.prisma.saleItem.count({ where: { productId: id } });
        if (salesCount > 0) {
            throw new BadRequestException('No se puede eliminar el producto porque tiene ventas asociadas. Desactívelo en su lugar.');
        }

        // Delete dependencies
        // UnitConversion has onDelete: Cascade, so it's handled automatically
        // InventoryItems: Manual delete needed if not cascade? better safe than sorry
        await this.prisma.inventoryItem.deleteMany({ where: { productId: id } });

        // PriceListItems: Delete manually
        await this.prisma.priceListItem.deleteMany({ where: { productId: id } });

        // PurchaseItems: If any, prevent delete?
        const purchaseCount = await this.prisma.purchaseItem.count({ where: { productId: id } });
        if (purchaseCount > 0) {
            throw new BadRequestException('No se puede eliminar el producto porque tiene compras asociadas.');
        }

        // Then delete the product
        return this.prisma.product.delete({
            where: { id }
        });
    }

    // Unit Conversion Methods
    async getUnitConversions(productId: string) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { unitConversions: true }
        });

        if (!product) return null;

        return {
            baseUnit: product.baseUnit,
            unitsPerCase: product.unitsPerCase,
            volumePerUnit: product.volumePerUnit,
            conversions: product.unitConversions.map(c => ({
                fromUnit: c.fromUnit,
                toUnit: c.toUnit,
                factor: Number(c.factor)
            }))
        };
    }

    async addUnitConversion(productId: string, fromUnit: string, factor: number) {
        // Get product's base unit
        const product = await this.prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) throw new Error('Product not found');

        return this.prisma.unitConversion.upsert({
            where: {
                productId_fromUnit: {
                    productId,
                    fromUnit: fromUnit.toUpperCase()
                }
            },
            update: {
                factor
            },
            create: {
                productId,
                fromUnit: fromUnit.toUpperCase(),
                toUnit: product.baseUnit,
                factor
            }
        });
    }

    async removeUnitConversion(productId: string, fromUnit: string) {
        return this.prisma.unitConversion.delete({
            where: {
                productId_fromUnit: {
                    productId,
                    fromUnit: fromUnit.toUpperCase()
                }
            }
        });
    }

    // Convert quantity from one unit to base unit
    async convertToBaseUnit(productId: string, quantity: number, fromUnit: string): Promise<number> {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { unitConversions: true }
        });

        if (!product) throw new Error('Product not found');

        // If already in base unit, return as is
        if (fromUnit.toUpperCase() === product.baseUnit.toUpperCase()) {
            return quantity;
        }

        // Find conversion
        const conversion = product.unitConversions.find(
            c => c.fromUnit.toUpperCase() === fromUnit.toUpperCase()
        );

        if (!conversion) {
            throw new Error(`No conversion found from ${fromUnit} to ${product.baseUnit}`);
        }

        return quantity * Number(conversion.factor);
    }

    /**
     * Generate product description using AI (Gemini)
     */
    async generateAIDescription(data: { name: string; category?: string; brand?: string }) {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            // Fallback to template-based description
            return this.generateTemplateDescription(data);
        }

        try {
            const prompt = `Generá una descripción de producto atractiva y profesional para e-commerce de bebidas/licorería.

Producto: ${data.name}
${data.category ? `Categoría: ${data.category}` : ''}
${data.brand ? `Marca: ${data.brand}` : ''}

Requisitos:
- Máximo 2-3 oraciones
- Incluir características clave del producto
- Tono profesional pero accesible
- En español argentino
- NO incluir precios
- Mencionar ocasiones de consumo si aplica

Respondé SOLO con la descripción, sin títulos ni explicaciones.`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 200
                        }
                    })
                }
            );

            if (!response.ok) {
                console.error('Gemini API error:', response.status);
                return this.generateTemplateDescription(data);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                return this.generateTemplateDescription(data);
            }

            return {
                success: true,
                description: text.trim(),
                source: 'ai'
            };
        } catch (error) {
            console.error('AI description error:', error);
            return this.generateTemplateDescription(data);
        }
    }

    private generateTemplateDescription(data: { name: string; category?: string; brand?: string }) {
        const templates = {
            'Vinos': `${data.name}${data.brand ? ` de ${data.brand}` : ''}, un vino cuidadosamente seleccionado para acompañar tus mejores momentos. Ideal para maridar con comidas o disfrutar en buena compañía.`,
            'Cervezas': `${data.name}${data.brand ? ` de ${data.brand}` : ''}, perfecta para refrescarte y disfrutar con amigos. Sabor auténtico que combina tradición y calidad.`,
            'Whisky': `${data.name}${data.brand ? ` de ${data.brand}` : ''}, un whisky de carácter distintivo para los conocedores. Notas complejas y acabado suave.`,
            'Gaseosas': `${data.name}${data.brand ? ` de ${data.brand}` : ''}, la bebida refrescante perfecta para cualquier ocasión. Sabor clásico que todos disfrutan.`,
            'Espumantes': `${data.name}${data.brand ? ` de ${data.brand}` : ''}, burbujas finas y elegantes para celebrar. Ideal para brindar en momentos especiales.`,
            'Vodka': `${data.name}${data.brand ? ` de ${data.brand}` : ''}, un vodka puro y versátil, perfecto para cócteles o disfrutar solo. Suavidad y calidad premium.`,
            'default': `${data.name}${data.brand ? ` de ${data.brand}` : ''} - Producto de calidad seleccionado especialmente para vos. Encontrá lo mejor en nuestra tienda.`
        };

        const category = data.category || 'default';
        const template = templates[category as keyof typeof templates] || templates.default;

        return {
            success: true,
            description: template,
            source: 'template'
        };
    }

    /**
     * Generate SKU automatically from product name
     */
    async generateSKU(data: { name: string; category?: string; brand?: string }) {
        // Normalize text for SKU
        const normalize = (str: string) => str
            .toUpperCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 6);

        // Extract volume/size if present (e.g., "750ml", "1.5L", "500gr")
        const sizeMatch = data.name.match(/(\d+(?:\.\d+)?)\s*(ml|l|lt|gr|kg|cc|oz)/i);
        const sizeCode = sizeMatch
            ? `${sizeMatch[1]}${sizeMatch[2].toUpperCase().replace('LT', 'L')}`
            : '';

        // Build SKU parts
        const namePart = normalize(data.name.replace(/\d+.*$/i, '').trim()).slice(0, 4);
        const brandPart = data.brand ? normalize(data.brand).slice(0, 2) : '';
        const catPart = data.category ? normalize(data.category).slice(0, 2) : '';

        // Generate unique suffix
        const uniqueSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();

        // Compose SKU
        let sku = namePart;
        if (brandPart) sku += `-${brandPart}`;
        if (sizeCode) sku += `-${sizeCode}`;
        else if (catPart) sku += `-${catPart}`;

        // Check for uniqueness
        const existing = await this.prisma.product.findFirst({
            where: { sku: { startsWith: sku } }
        });

        if (existing) {
            sku += `-${uniqueSuffix}`;
        }

        return {
            success: true,
            sku,
            parts: { name: namePart, brand: brandPart, size: sizeCode }
        };
    }

    /**
     * Lookup product dimensions using AI for shipping calculations
     */
    async lookupProductDimensions(data: { name: string; brand?: string; category?: string }) {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return this.estimateDimensions(data);
        }

        try {
            const prompt = `Sos un experto en logística de bebidas. Necesito las dimensiones y peso exacto para envío del siguiente producto argentino:

Producto: ${data.name}
${data.brand ? `Marca: ${data.brand}` : ''}
${data.category ? `Categoría: ${data.category}` : ''}

Respondé SOLO con un JSON válido con esta estructura exacta (sin explicaciones, sin markdown):
{"weight": 0.0, "width": 0, "height": 0, "depth": 0}

Donde:
- weight: peso en kilogramos (incluir líquido si aplica)
- width: ancho en centímetros
- height: alto en centímetros  
- depth: profundidad en centímetros

Usá valores típicos reales para este tipo de producto en Argentina.`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.2,
                            maxOutputTokens: 100
                        }
                    })
                }
            );

            if (!response.ok) {
                console.error('Gemini API error:', response.status);
                return this.estimateDimensions(data);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                return this.estimateDimensions(data);
            }

            // Parse JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const dimensions = JSON.parse(jsonMatch[0]);
                return {
                    success: true,
                    ...dimensions,
                    source: 'ai'
                };
            }

            return this.estimateDimensions(data);
        } catch (error) {
            console.error('Dimension lookup error:', error);
            return this.estimateDimensions(data);
        }
    }

    /**
     * Estimate dimensions based on product category (fallback)
     */
    private estimateDimensions(data: { name: string; category?: string }) {
        // Common sizes for beverage products
        const estimates: Record<string, { weight: number; width: number; height: number; depth: number }> = {
            'Vinos': { weight: 1.3, width: 8, height: 32, depth: 8 },
            'Cervezas': { weight: 0.5, width: 7, height: 23, depth: 7 },
            'Whisky': { weight: 1.2, width: 10, height: 28, depth: 10 },
            'Vodka': { weight: 1.1, width: 9, height: 30, depth: 9 },
            'Gaseosas': { weight: 1.6, width: 10, height: 33, depth: 10 },
            'Espumantes': { weight: 1.5, width: 10, height: 32, depth: 10 },
            'Aperitivos': { weight: 1.0, width: 9, height: 28, depth: 9 },
            'Licores': { weight: 0.8, width: 8, height: 25, depth: 8 },
            'Ron': { weight: 1.1, width: 9, height: 29, depth: 9 },
            'Tequila': { weight: 1.0, width: 8, height: 28, depth: 8 },
            'default': { weight: 1.0, width: 10, height: 25, depth: 10 }
        };

        // Check for size indicators in name
        let multiplier = 1;
        const name = data.name.toLowerCase();
        if (name.includes('1.5') || name.includes('1500ml')) multiplier = 1.5;
        if (name.includes('2l') || name.includes('2000ml')) multiplier = 2;
        if (name.includes('375ml') || name.includes('375')) multiplier = 0.5;
        if (name.includes('pack') || name.includes('six')) multiplier = 6;

        const category = data.category || 'default';
        const base = estimates[category] || estimates.default;

        return {
            success: true,
            weight: Math.round(base.weight * multiplier * 100) / 100,
            width: base.width,
            height: Math.round(base.height * (multiplier > 1 ? 1.2 : 1)),
            depth: base.depth,
            source: 'estimate'
        };
    }
}

