export class CreateWarehouseDto {
    name: string;
    type: 'DEPOT' | 'STORE' | 'VEHICLE';
    address?: string;
}
