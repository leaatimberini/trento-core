
import { Controller, Post, Body, UnauthorizedException, UseGuards, Request, Logger } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth/customer')
export class CustomerAuthController {
    private readonly logger = new Logger(CustomerAuthController.name);

    constructor(private customerAuthService: CustomerAuthService) { }

    @Post('login')
    async login(@Body() body: any) {
        this.logger.log(`[Auth] Login request for: ${body.email}`);
        const customer = await this.customerAuthService.validateCustomer(body.email, body.password);
        if (!customer) {
            this.logger.warn(`[Auth] Login failed for: ${body.email}`);
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.customerAuthService.login(customer);
    }

    @Post('register')
    async register(@Body() body: any) {
        return this.customerAuthService.register(body);
    }
}
