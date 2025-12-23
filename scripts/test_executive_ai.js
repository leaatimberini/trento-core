// Native fetch


async function testExecutiveAI() {
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

        console.log('2. Asking AI: "ventas hoy"...');
        const chatRes = await fetch('http://localhost:3001/ai/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: 'ventas hoy' })
        });

        if (!chatRes.ok) {
            console.error('Chat failed', chatRes.status);
            return;
        }

        const chatResponse = await chatRes.json();
        console.log('AI Response:', chatResponse.text);

        if (chatResponse.text.includes('Reporte de Hoy') && chatResponse.text.includes('Margen Real')) {
            console.log('✅ TEST PASSED: AI returned financial report.');
        } else {
            console.error('❌ TEST FAILED: Response does not look like a financial report.');
        }

    } catch (e) {
        console.error(e);
    }
}

testExecutiveAI();
