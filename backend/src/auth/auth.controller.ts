
import { Controller, Request, Post, UseGuards, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CustomersService } from '../customers/customers.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private customersService: CustomersService
    ) { }

    @Post('login')
    async login(@Body() body) {
        const user = await this.authService.validateUser(body.email, body.password);
        if (!user) {
            throw new UnauthorizedException();
        }
        return this.authService.login(user);
    }


}
