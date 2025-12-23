import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { CustomersService } from '../customers/customers.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { Customer } from '@prisma/client';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class CustomerAuthService {
    private readonly logger = new Logger(CustomerAuthService.name);

    constructor(
        private customersService: CustomersService,
        private jwtService: JwtService,
        private emailService: EmailService
    ) { }

    async validateCustomer(email: string, pass: string): Promise<any> {
        const normalizedEmail = email.toLowerCase();
        const customer = await this.customersService.findByEmail(normalizedEmail);

        this.logger.log(`[Auth] Validating customer: ${normalizedEmail}`);

        if (customer) {
            const hasPassword = !!customer.password;

            if (hasPassword) {
                const isMatch = await bcrypt.compare(pass, customer.password);

                if (isMatch) {
                    const { password, ...result } = customer;
                    return result;
                }
            } else {
                this.logger.warn('[Auth] Customer has no password (pos-created?)');
            }
        } else {
            this.logger.warn('[Auth] Customer not found');
        }

        return null;
    }

    async login(customer: any) {
        const payload = { email: customer.email, sub: customer.id, type: 'CUSTOMER' };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                type: 'CUSTOMER',
                customerType: customer.type
            }
        };
    }

    async register(data: { name: string; email: string; password: string; phone?: string }) {
        const normalizedEmail = data.email.toLowerCase();

        // Check if exists
        const existing = await this.customersService.findByEmail(normalizedEmail);
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.customersService.create({
            ...data,
            email: normalizedEmail,
            password: hashedPassword,
        });
    }
}
