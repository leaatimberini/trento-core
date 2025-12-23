
async function addStock() {
    const baseURL = 'http://localhost:3000';
    const productId = '0c967bda-9a18-4495-b655-dc2ff3fa7058'; // ID from user error

    console.log(`Adding stock for product: ${productId}`);

    const stockPayload = {
        productId: productId,
        quantity: 100,
        batchNumber: 'USER-FIX-001',
        locationZone: 'FRONT-STORE'
    };

    try {
        const res = await fetch(`${baseURL}/inventory/receive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stockPayload)
        });

        if (res.ok) {
            console.log(`✅ Stock added successfully. Status: ${res.status}`);
        } else {
            console.log(`❌ Failed to add stock. Status: ${res.status}`);
            console.log(await res.text());
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

addStock();
