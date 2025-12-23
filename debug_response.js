
async function check() {
    const baseURL = 'http://localhost:3000';
    try {
        const loginRes = await fetch(`${baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@trento.local', password: 'admin123' })
        });
        const { access_token } = await loginRes.json();

        console.log('Testing /finance/shift/active raw response...');
        const res = await fetch(`${baseURL}/finance/shift/active`, {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });

        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Body length: ${text.length}`);
        console.log(`Body content: '${text}'`);
    } catch (e) {
        console.error(e);
    }
}
check();
