
async function fixAndTest() {
    const baseURL = 'http://localhost:3000'; // Internal
    try {
        // 1. Get Product
        console.log('Fetching products...');
        const prodRes = await fetch(`${baseURL}/products`);
        const products = await prodRes.json();
        const product = products[0];
        console.log(`Product: ${product.name} (${product.id})`);

        // 2. Add Stock
        console.log('Adding Stock...');
        const stockPayload = {
            productId: product.id,
            quantity: 50,
            batchNumber: 'BATCH-001',
            locationZone: 'A1'
        };
        const stockRes = await fetch(`${baseURL}/inventory/receive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stockPayload)
        });

        if (!stockRes.ok) {
            console.log(`Stock Add Failed: ${stockRes.status} ${await stockRes.text()}`);
            return;
        }
        console.log(`✅ Stock Added: ${stockRes.status}`);

        // 3. Create Sale
        console.log('Creating Sale...');
        const salePayload = {
            items: [{ productId: product.id, quantity: 1 }],
            paymentMethod: 'CASH'
        };
        const saleRes = await fetch(`${baseURL}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(salePayload)
        });

        if (!saleRes.ok) {
            console.log(`❌ Sale Failed: ${saleRes.status} ${await saleRes.text()}`);
        } else {
            const sale = await saleRes.json();
            console.log(`✅ Sale Created: ${sale.code} (Total: ${sale.totalAmount})`);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

fixAndTest();
