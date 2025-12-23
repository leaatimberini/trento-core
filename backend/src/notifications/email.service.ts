import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(private readonly mailerService: MailerService) { }

    async sendWelcomeEmail(email: string, name: string) {
        try {
            await this.mailerService.sendMail({
                to: email,
                subject: 'Welcome to Trento',
                html: `<h1>Welcome, ${name}!</h1><p>Thank you for registering with Trento (B2B/Retail).</p>`,
            });
            this.logger.log(`Welcome email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send welcome email to ${email}`, error);
        }
    }

    async sendLowStockAlert(products: any[]) {
        // Send to admin (env var or hardcoded for MVP)
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

        const itemsList = products.map(p => `<li>${p.name} (SKU: ${p.sku}): ${p.quantity} left</li>`).join('');

        try {
            await this.mailerService.sendMail({
                to: adminEmail,
                subject: 'Low Stock Alert',
                html: `<h1>Low Stock Warning</h1><ul>${itemsList}</ul><p>Please restock immediately.</p>`,
            });
            this.logger.log(`Low stock alert sent to ${adminEmail}`);
        } catch (error) {
            this.logger.error(`Failed to send low stock alert`, error);
        }
    }
}
