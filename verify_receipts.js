
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
    });
    const page = await browser.newPage();

    try {
        // 1. Login
        await page.goto('http://localhost:3000/login');
        await page.type('input[type="email"]', 'admin@trento.com');
        await page.type('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        console.log('Logged in');

        // 2. Go to Invoicing (Mock Flow if possible, or check Sales List)
        console.log('Checking Sales List for Print Button...');
        await page.goto('http://localhost:3000/admin/sales');
        await page.waitForSelector('table', { timeout: 5000 }).catch(() => console.log('Table not found'));

        const printButton = await page.$('button[title="Imprimir Comprobante"]');
        if (printButton) {
            console.log('SUCCESS: Print button found in Sales List');
        } else {
            console.log('WARNING: Print button NOT found in Sales List (Normal if no invocies exist yet)');
            // Check if there are any invoices
            const invoiceBadges = await page.$x("//div[contains(text(), 'CAE:')]");
            if (invoiceBadges.length > 0) {
                console.log('ERROR: Invoices exist but Print button is missing!');
            }
        }
        await page.screenshot({ path: 'verify_sales_list.png' });

        // 3. Go to Consignments
        console.log('Checking Consignments for History Button...');
        await page.goto('http://localhost:3000/wholesale/consignments');
        await page.waitForSelector('table', { timeout: 5000 });

        // Look for "Historial" button
        const historyButtons = await page.$x("//button[contains(text(), 'Historial')]");
        if (historyButtons.length > 0) {
            console.log(`SUCCESS: Found ${historyButtons.length} History buttons`);
        } else {
            console.log('WARNING: No History buttons found (Are there consignments?)');
        }
        await page.screenshot({ path: 'verify_consignments_list.png' });

    } catch (e) {
        console.error('Test failed:', e);
        await page.screenshot({ path: 'verify_error.png' });
    } finally {
        await browser.close();
    }
})();
