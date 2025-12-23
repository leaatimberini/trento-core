
import { CreateSaleItemDto } from './create-sale.dto';

export class CreateEcommerceSaleDto {
    items: CreateSaleItemDto[];
    customer: {
        name: string;
        email: string;
        phone?: string;
    };
    paymentMethod: string;
}
