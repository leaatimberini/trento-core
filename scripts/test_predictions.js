// Native fetch


async function testPredictions() {
    try {
        console.log('1. Logging in...');
        const loginRes = await fetch('http://localhost:3001/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@trento.com', password: 'admin123' })
        });

        if (!loginRes.ok) {
            console.error('Login failed', loginRes.status);
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.access_token;
        console.log('Login successful');

        console.log('2. Fetching AI Predictions...');
        const predRes = await fetch('http://localhost:3001/ai/predictions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!predRes.ok) {
            console.error('Predictions failed', predRes.status);
            return;
        }

        const predictions = await predRes.json();
        console.log('Predictions Response:', JSON.stringify(predictions.slice(0, 3), null, 2));

        console.log(`✅ TEST PASSED: Fetched ${predictions.length} predictions.`);

    } catch (e) {
        console.error(e);
    }
}

testPredictions();
