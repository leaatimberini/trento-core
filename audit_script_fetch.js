
async function audit() {
    const baseURL = 'http://localhost:3000';
    console.log('Starting Audit (Internal)...');

    try {
        // 1. Login
        console.log('1. Attempting Login...');
        const loginRes = await fetch(`${baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@trento.local',
                password: 'admin123'
            })
        });

        if (!loginRes.ok) {
            throw new Error(`Login Failed: ${loginRes.status} ${await loginRes.text()}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.access_token;
        console.log(`✅ Login Success. Token obtained.`);

        const headers = { 'Authorization': `Bearer ${token}` };

        // Helper
        const check = async (name, url) => {
            console.log(`\nTesting ${name}: ${url}...`);
            try {
                const res = await fetch(`${baseURL}${url}`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    console.log(`✅ ${name}: ${res.status} OK`);
                    // console.log('   Data:', JSON.stringify(data).substring(0, 100));
                } else {
                    console.log(`❌ ${name} Failed: ${res.status}`);
                    console.log('   Response:', await res.text());
                }
            } catch (e) {
                console.log(`❌ ${name} Error: ${e.message}`);
            }
        };

        await check('Finance Stats', '/finance/stats');
        await check('Inventory Alerts', '/inventory/alerts');
        await check('Finance Shift Active', '/finance/shift/active');
        await check('AI Recommendations', '/ai/recommendations/1');

    } catch (error) {
        console.error('❌ CRITICAL ERROR:', error.message);
    }
}

audit();
