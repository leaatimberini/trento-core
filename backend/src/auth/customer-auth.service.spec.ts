
import { Test, TestingModule } from '@nestjs/testing';
import { CustomerAuthService } from './customer-auth.service';
import { CustomersService } from '../customers/customers.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../notifications/email.service';
import * as bcrypt from 'bcrypt';

describe('CustomerAuthService', () => {
    let service: CustomerAuthService;
    let customersService: CustomersService;

    const mockCustomer = {
        id: '1',
        name: 'Test',
        email: 'test@example.com',
        password: 'hashedpassword',
        type: 'RETAIL'
    };

    const mockCustomersService = {
        findByEmail: jest.fn(),
        create: jest.fn(),
    };

    const mockJwtService = {
        sign: jest.fn(() => 'token'),
    };

    const mockEmailService = {};

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerAuthService,
                { provide: CustomersService, useValue: mockCustomersService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: EmailService, useValue: mockEmailService },
            ],
        }).compile();

        service = module.get<CustomerAuthService>(CustomerAuthService);
        customersService = module.get<CustomersService>(CustomersService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateCustomer', () => {
        it('should return null if customer not found', async () => {
            mockCustomersService.findByEmail.mockResolvedValue(null);
            const result = await service.validateCustomer('test@example.com', 'pass');
            expect(result).toBeNull();
        });

        it('should return null if password mismatch', async () => {
            // Mock hash comparison manually since we can't easily mock bcrypt.compare if it's imported as * as bcrypt
            // Actually we can execute real bcrypt
            const hash = await bcrypt.hash('password123', 10);
            mockCustomersService.findByEmail.mockResolvedValue({ ...mockCustomer, password: hash });

            const result = await service.validateCustomer('test@example.com', 'wrongpass');
            expect(result).toBeNull();
        });

        it('should return customer result if password match', async () => {
            const hash = await bcrypt.hash('password123', 10);
            mockCustomersService.findByEmail.mockResolvedValue({ ...mockCustomer, password: hash });

            const result = await service.validateCustomer('test@example.com', 'password123');
            expect(result).toEqual({
                id: mockCustomer.id,
                name: mockCustomer.name,
                email: mockCustomer.email,
                type: mockCustomer.type
            });
        });
    });
});
