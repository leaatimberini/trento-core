
import { Module } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomersModule } from '../customers/customers.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { JwtCustomerStrategy } from './jwt-customer.strategy';

@Module({
    imports: [
        CustomersModule,
        PassportModule,
        JwtModule.register({
            secret: jwtConstants.secret,
            signOptions: { expiresIn: '7d' }, // Longer expiration for customers
        }),
    ],
    providers: [CustomerAuthService, JwtCustomerStrategy],
    controllers: [CustomerAuthController],
    exports: [CustomerAuthService],
})
export class CustomerAuthModule { }
