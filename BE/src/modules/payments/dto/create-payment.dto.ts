import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    example: '64fbc1bba5f08b4a6df8a123',
    description: 'ID của đơn hàng liên kết',
  })
  @IsNotEmpty({ message: 'orderId không được để trống' })
  @IsMongoId({ message: 'orderId không hợp lệ' })
  orderId: string;

  @ApiProperty({ example: 300000, description: 'Số tiền thanh toán (VNĐ)' })
  @IsNotEmpty({ message: 'amount không được để trống' })
  @IsNumber({}, { message: 'amount phải là số' })
  amount: number;

  @ApiProperty({
    example: 'MOMO',
    enum: ['COD', 'MOMO', 'VNPAY', 'BANK_TRANSFER', 'CREDIT_CARD'],
    description: 'Phương thức thanh toán',
  })
  @IsNotEmpty({ message: 'method không được để trống' })
  @IsEnum(['COD', 'MOMO', 'VNPAY', 'BANK_TRANSFER', 'CREDIT_CARD'], {
    message: 'Phương thức thanh toán không hợp lệ',
  })
  method: string;

  @ApiProperty({
    example: 'paid',
    enum: ['pending', 'paid', 'failed', 'refunded'],
    required: false,
    description: 'Trạng thái thanh toán (mặc định: pending)',
  })
  @IsOptional()
  @IsEnum(['pending', 'paid', 'failed', 'refunded'], {
    message: 'Trạng thái không hợp lệ',
  })
  status?: string;

  @ApiProperty({
    example: 'TXN_1234567890',
    required: false,
    description: 'Mã giao dịch (transaction ID)',
  })
  @IsOptional()
  @IsString({ message: 'transactionId phải là chuỗi' })
  transactionId?: string;
}
