// Native fetch in Node 18


async function verify() {
    try {
        // 1. Login
        const loginRes = await fetch('http://localhost:3001/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@trento.com', password: 'admin123' })
        });

        if (!loginRes.ok) {
            console.error('Login failed');
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.access_token;
        console.log('Login successful');

        // 2. Get Stats
        const statsRes = await fetch('http://localhost:3001/finance/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!statsRes.ok) {
            console.error('Stats failed', statsRes.status);
            return;
        }

        const stats = await statsRes.json();
        console.log('Stats Response:', JSON.stringify(stats, null, 2));

        if (stats.realMargin !== undefined) {
            console.log('✅ verification PASSED: realMargin is present.');
        } else {
            console.error('❌ verification FAILED: realMargin is missing.');
        }

    } catch (e) {
        console.error(e);
    }
}

verify();
