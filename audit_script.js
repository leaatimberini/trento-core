
const axios = require('axios');

async function audit() {
    const baseURL = 'http://localhost:3001';
    console.log('Starting Audit...');

    try {
        // 1. Login
        console.log('1. Attempting Login...');
        const loginRes = await axios.post(`${baseURL}/auth/login`, {
            email: 'admin@trento.local',
            password: 'admin123'
        });
        const token = loginRes.data.access_token;
        console.log(`✅ Login Success. Token obtained.`);

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Finance Stats
        console.log('\n2. Testing GET /finance/stats...');
        try {
            const stats = await axios.get(`${baseURL}/finance/stats`, { headers });
            console.log(`✅ Finance Stats: ${stats.status} OK`);
            console.log('   Data sample:', JSON.stringify(stats.data).substring(0, 100));
        } catch (e) {
            console.log(`❌ Finance Stats Failed: ${e.response?.status || e.message}`);
            if (e.response) console.log(e.response.data);
        }

        // 3. Inventory Alerts
        console.log('\n3. Testing GET /inventory/alerts...');
        try {
            const alerts = await axios.get(`${baseURL}/inventory/alerts`, { headers });
            console.log(`✅ Inventory Alerts: ${alerts.status} OK`);
            console.log('   Data sample:', JSON.stringify(alerts.data).substring(0, 100));
        } catch (e) {
            console.log(`❌ Inventory Alerts Failed: ${e.response?.status || e.message}`);
        }

        // 4. Finance Shift Active (The one causing issues)
        console.log('\n4. Testing GET /finance/shift/active...');
        try {
            const shift = await axios.get(`${baseURL}/finance/shift/active`, { headers });
            console.log(`✅ Shift Active: ${shift.status} OK`);
            console.log('   Data:', JSON.stringify(shift.data));
        } catch (e) {
            if (e.response?.status === 404) {
                console.log(`✅ Shift Active: 404 (Expected if no shift open)`);
            } else {
                console.log(`❌ Shift Active Failed: ${e.response?.status || e.message}`);
                if (e.response) console.log(e.response.data);
            }
        }

        // 5. AI Recommendations (Public?)
        console.log('\n5. Testing GET /ai/recommendations/1...');
        try {
            const ai = await axios.get(`${baseURL}/ai/recommendations/1`);
            console.log(`✅ AI Recommendations: ${ai.status} OK`);
        } catch (e) {
            console.log(`❌ AI Recommendations Failed: ${e.response?.status || e.message}`);
        }

    } catch (error) {
        console.error('❌ CRITICAL: Login Failed or System down');
        console.error(error.message);
        if (error.response) console.error(error.response.data);
    }
}

audit();
