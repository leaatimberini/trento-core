
async function debugSale() {
    const baseURL = 'http://localhost:3000'; // Internal
    try {
        // 1. Get a product to sell
        console.log('Fetching products...');
        const prodRes = await fetch(`${baseURL}/products`);
        if (!prodRes.ok) throw new Error(`Failed to get products: ${prodRes.status}`);
        const products = await prodRes.json();
        if (products.length === 0) throw new Error('No products found to test sale');

        const product = products[0];
        console.log(`Using Product: ${product.name} (ID: ${product.id}, Price: ${product.basePrice})`);

        // 2. Create Sale Payload
        // Matching frontend interface roughly
        const payload = {
            items: [
                {
                    productId: product.id,
                    quantity: 1
                }
            ],
            paymentMethod: 'CASH'
        };

        console.log('Attempting POST /sales with payload:', JSON.stringify(payload));

        const res = await fetch(`${baseURL}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        console.log(`Response Status: ${res.status}`);
        console.log(`Response Body: ${text}`);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

debugSale();
