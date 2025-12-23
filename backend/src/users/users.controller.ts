
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @Roles('ADMIN')
    async findAll() {
        return this.usersService.findAll();
    }

    @Post()
    @Roles('ADMIN')
    async create(@Body() body: any) {
        return this.usersService.create(body); // Service handles hashing
    }
}
