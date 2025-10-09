import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsMongoId,
} from 'class-validator';

export class CreateShipmentDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Tên người gửi' })
  @IsNotEmpty({ message: 'senderName không được để trống' })
  @IsString()
  senderName: string;

  @ApiProperty({
    example: '0987654321',
    description: 'Số điện thoại người gửi',
  })
  @IsNotEmpty({ message: 'senderPhone không được để trống' })
  @IsString()
  senderPhone: string;

  @ApiProperty({
    example: '123 Trần Hưng Đạo, Hà Nội',
    description: 'Địa chỉ người gửi',
  })
  @IsNotEmpty({ message: 'senderAddress không được để trống' })
  @IsString()
  senderAddress: string;

  @ApiProperty({ example: 'Trần Thị B', description: 'Tên người nhận' })
  @IsNotEmpty({ message: 'receiverName không được để trống' })
  @IsString()
  receiverName: string;

  @ApiProperty({
    example: '0911222333',
    description: 'Số điện thoại người nhận',
  })
  @IsNotEmpty({ message: 'receiverPhone không được để trống' })
  @IsString()
  receiverPhone: string;

  @ApiProperty({
    example: '456 Lê Lợi, TP.HCM',
    description: 'Địa chỉ người nhận',
  })
  @IsNotEmpty({ message: 'receiverAddress không được để trống' })
  @IsString()
  receiverAddress: string;

  @ApiProperty({
    example: '653f2a2bb70f7a1f4fa11111',
    description: 'ID chi nhánh gửi',
  })
  @IsNotEmpty({ message: 'originBranchId không được để trống' })
  @IsMongoId()
  originBranchId: string;

  @ApiProperty({
    example: '653f2a2bb70f7a1f4fa22222',
    description: 'ID chi nhánh nhận',
  })
  @IsNotEmpty({ message: 'destinationBranchId không được để trống' })
  @IsMongoId()
  destinationBranchId: string;

  @ApiProperty({ example: 1500, description: 'Trọng lượng đơn vị gram' })
  @IsNotEmpty({ message: 'weight không được để trống' })
  @IsNumber()
  weight: number;

  @ApiProperty({ example: 'EXPRESS', description: 'Loại dịch vụ vận chuyển' })
  @IsNotEmpty({ message: 'serviceType không được để trống' })
  @IsString()
  serviceType: string;

  @ApiProperty({ example: 30000, description: 'Phí vận chuyển (VNĐ)' })
  @IsNotEmpty({ message: 'shippingFee không được để trống' })
  @IsNumber()
  shippingFee: number;

  @ApiProperty({
    required: false,
    example: 'Giao nhanh trong ngày',
    description: 'Ghi chú vận đơn (tùy chọn)',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
