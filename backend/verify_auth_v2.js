
const BASE_URL = 'http://localhost:3001/api';

async function testAuth() {
    const email = `test_${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log(`Testing with ${email} / ${password}`);

    // 1. Register
    console.log('--- Registering ---');
    const regRes = await fetch(`${BASE_URL}/auth/customer/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Customer',
            email,
            password
        })
    });

    if (!regRes.ok) {
        console.error('Registration failed:', regRes.status, await regRes.text());
        return;
    }
    const customer = await regRes.json();
    console.log('Registered:', customer.id);

    // 2. Login
    console.log('--- Logging in ---');
    const loginRes = await fetch(`${BASE_URL}/auth/customer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password
        })
    });

    if (!loginRes.ok) {
        console.error('Login failed:', loginRes.status, await loginRes.text());
        return;
    }
    const token = await loginRes.json();
    console.log('Login successful, got token:', !!token.access_token);
}

testAuth();
