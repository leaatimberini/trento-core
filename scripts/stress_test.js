// Native fetch used (Node 18+)

const BASE_URL = 'http://localhost:3001';
const USER = { email: 'admin@trento.local', password: 'admin123' };

const RESULTS = {
    total: 0,
    success: 0,
    rateLimited: 0,
    errors: 0,
    statusCodes: {}
};

async function login() {
    console.log('🔑 Logging in...');
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(USER)
        });

        if (!res.ok) throw new Error(`Login failed: ${res.status}`);
        const data = await res.json();
        return data.access_token;
    } catch (e) {
        console.error('❌ Login error:', e.message);
        process.exit(1);
    }
}

async function getProducts(token) {
    try {
        const res = await fetch(`${BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await res.json();
    } catch (e) {
        return [];
    }
}

async function simulateTraffic(token, products) {
    const DURATION_MS = 10000; // 10 seconds
    const RPS = 50; // 50 req/s => 3000 RPM (Must trigger limit)

    console.log(`🚀 Starting Stress Test: ${RPS} RPS for ${DURATION_MS / 1000}s...`);

    const startTime = Date.now();
    let interval;

    return new Promise((resolve) => {
        interval = setInterval(async () => {
            if (Date.now() - startTime > DURATION_MS) {
                clearInterval(interval);
                resolve();
                return;
            }

            // Fire request
            RESULTS.total++;
            const isSale = Math.random() > 0.8; // 20% sales

            if (isSale && products.length > 0) {
                const product = products[Math.floor(Math.random() * products.length)];
                createSale(token, product).then(recordResult);
            } else {
                getProductList(token).then(recordResult);
            }

        }, 1000 / RPS);
    });
}

async function createSale(token, product) {
    const payload = {
        items: [{ productId: product.id, quantity: 1 }],
        payments: [{ method: 'CASH', amount: 1000000 }] // Ensure sufficient funds
    };

    try {
        const res = await fetch(`${BASE_URL}/sales`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const txt = await res.text();
            if (res.status === 400) console.log('❌ 400 Error:', txt);
            return res.status;
        }
        return res.status;
    } catch (e) {
        return 0; // Network error
    }
}

async function getProductList(token) {
    try {
        const res = await fetch(`${BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.status;
    } catch (e) {
        return 0;
    }
}

function recordResult(status) {
    if (!RESULTS.statusCodes[status]) RESULTS.statusCodes[status] = 0;
    RESULTS.statusCodes[status]++;

    if (status >= 200 && status < 300) RESULTS.success++;
    else if (status === 429) RESULTS.rateLimited++;
    else RESULTS.errors++;
}

async function main() {
    const token = await login();
    const products = await getProducts(token);

    if (products.length === 0) {
        console.warn('⚠️ No products found. Creating sales might fail.');
    } else {
        console.log(`📦 Loaded ${products.length} products.`);
    }

    await simulateTraffic(token, products);

    console.log('\n📊 Test Results:');
    console.log(`Total Requests: ${RESULTS.total}`);
    console.log(`✅ Success (2xx): ${RESULTS.success}`);
    console.log(`⛔ Rate Limited (429): ${RESULTS.rateLimited}`);
    console.log(`❌ Errors (Other): ${RESULTS.errors}`);
    console.log('Status Breakdown:', RESULTS.statusCodes);

    if (RESULTS.rateLimited > 0) {
        console.log('\n✅ Rate Limiter is WORKING.');
    } else {
        console.log('\n⚠️ Rate Limiter DID NOT trigger (Check limit vs traffic).');
    }
}

main();
