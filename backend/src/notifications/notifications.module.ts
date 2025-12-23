import { Module, Global } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';

@Global()
@Module({
    imports: [
        MailerModule.forRootAsync({
            useFactory: () => ({
                transport: {
                    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    auth: {
                        user: process.env.SMTP_USER || 'ethereal_user',
                        pass: process.env.SMTP_PASS || 'ethereal_pass',
                    },
                },
                defaults: {
                    from: '"Trento System" <noreply@trento.com>',
                },
            }),
        }),
    ],
    providers: [EmailService],
    exports: [EmailService],
})
export class NotificationsModule { }
