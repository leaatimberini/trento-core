import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    // Assume running from backend root
    const filePath = path.join(process.cwd(), '../docs/listadeprecios.csv');
    console.log(`Reading from ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error("File not found at " + filePath);
        // Try alternative path if CWD is scripts folder
        const altPath = path.join(process.cwd(), '../../docs/listadeprecios.csv');
        if (fs.existsSync(altPath)) {
            console.log(`Found at ${altPath}`);
            // Should update logic to use altPath, but let's just exit and let user run from correct dir
            // Or read here
        } else {
            process.exit(1);
        }
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    let currentCategory = 'VARIOS';
    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    console.log(`Analyzing ${lines.length} lines...`);

    for (const line of lines) {
        if (!line.trim()) continue;

        const parts = parseCSV(line);
        const col1 = parts[0]?.trim();
        const col3 = parts[2]?.trim(); // Price column

        if (line.includes('SKYY 750ML')) {
            console.log(`DEBUG: Line: ${line}`);
            console.log(`DEBUG: Parts: ${JSON.stringify(parts)}`);
            console.log(`DEBUG: Col3: '${col3}'`);
        }

        if (!col1) continue;

        // Detect Category: Text in Col1, Empty Col3
        // Filter out garbage headers
        if ((!col3 || col3 === '') && col1.length > 3) {
            const garbage = ['TRENTO', 'BEBIDAS', 'LISTA', 'PRODUCTOS', 'PRECIO', 'MAYORISTA'];
            if (!garbage.some(g => col1.toUpperCase().includes(g))) {
                currentCategory = col1.toUpperCase();
                console.log(`---> CATEGORY: ${currentCategory}`);
            }
            continue;
        }

        // Parse Price
        if (!col3) continue;

        // "$ 7.990,00" or " $ 7.990,00 "
        let priceStr = col3.replace(/[^0-9,]/g, '').replace(',', '.');
        // Replace only non-numeric/comma. Then comma to dot.
        // Be careful with thousands separator if dot is used.
        // Format likely: 1.234,56 -> 1234.56
        // If we remove dots first, then replace comma with dot.

        // Better cleanup:
        // Remove all non-digits except comma
        const cleanStr = col3.replace(/[^0-9,]/g, '');
        // Replace comma with dot
        const finalStr = cleanStr.replace(',', '.');
        const price = parseFloat(finalStr);

        // console.log(`Price parsed: ${price} from ${col3}`);

        if (isNaN(price) || price <= 0) {
            // console.log(`Invalid price for ${col1}`);
            continue;
        }

        const slug = generateSlug(col1);
        const sku = generateSKU(col1);

        try {
            // console.log(`Upserting ${col1}...`);
            const existing = await prisma.product.findFirst({
                where: {
                    OR: [
                        { name: col1 },
                        { slug: slug },
                        // Maybe exact match on slug is risky if collisions
                    ]
                }
            });

            if (existing) {
                await prisma.product.update({
                    where: { id: existing.id },
                    data: {
                        basePrice: price,
                        category: currentCategory,
                        // Ensure valid basePrice (decimal)
                    }
                });
                updatedCount++;
            } else {
                await prisma.product.create({
                    data: {
                        name: col1,
                        slug: slug + '-' + Math.floor(Math.random() * 100), // Append random to ensure uniq slug
                        sku: sku,
                        basePrice: price,
                        category: currentCategory,
                        description: `${col1} - ${currentCategory}`,
                        inventoryItems: {
                            create: {
                                quantity: 100,
                                locationZone: 'A-00-00'
                            }
                        },
                        ean: sku // temporary
                    }
                });
                createdCount++;
                console.log(`Created: ${col1}`);
            }
            processedCount++;

            if (processedCount % 50 === 0) process.stdout.write('.');

        } catch (e: any) {
            // ignore duplicate errors silently or log
            console.error(`Error on ${col1}: ${e.message}`);
        }
    }

    console.log(`\n\nDone!`);
    console.log(`Processed: ${processedCount}`);
    console.log(`Created: ${createdCount}`);
    console.log(`Updated: ${updatedCount}`);
}

function parseCSV(text: string) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(cur);
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur);
    return result;
}

function generateSlug(name: string) {
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function generateSKU(name: string) {
    const acronym = name.replace(/[^A-Z0-9]/gi, '').substring(0, 4).toUpperCase();
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `${acronym}-${rand}`;
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
