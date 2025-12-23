
import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Allows Admin access
import { JwtCustomerAuthGuard } from '../auth/jwt-customer-auth.guard'; // Custom guard for customers

@Controller('profile')
@UseGuards(JwtCustomerAuthGuard)
export class CustomerProfileController {
    constructor(private readonly customersService: CustomersService) { }

    @Get()
    async getProfile(@Request() req: any) {
        // req.user is populated by JwtStrategy (Customer)
        const customer = await this.customersService.findOne(req.user.userId);
        if (!customer) return null;

        // Exclude password
        const { password, ...result } = customer;
        return result;
    }

    @Put()
    async updateProfile(@Request() req: any, @Body() updateData: any) {
        // Prevent updating critical fields if necessary
        const allowedUpdates = {
            name: updateData.name,
            phone: updateData.phone,
            address: updateData.address,
            city: updateData.city,
            zipCode: updateData.zipCode
        };

        const updated = await this.customersService.update(req.user.userId, allowedUpdates);
        const { password, ...result } = updated;
        return result;
    }

    @Get('orders')
    async getMyOrders(@Request() req: any) {
        const customer = await this.customersService.findOne(req.user.userId);
        return customer?.sales || [];
    }
}
