import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'HNI001', description: 'Mã chi nhánh' })
  @IsNotEmpty({ message: 'code không được để trống' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Bưu cục Hà Nội', description: 'Tên chi nhánh' })
  @IsNotEmpty({ message: 'name không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({ example: '123 Trần Hưng Đạo, Hà Nội', description: 'Địa chỉ' })
  @IsNotEmpty({ message: 'address không được để trống' })
  @IsString()
  address: string;

  @ApiProperty({
    example: '0987654321',
    description: 'Số điện thoại',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'Hà Nội',
    description: 'Tên thành phố hiển thị (không bắt buộc)',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    required: false,
    example: '653f2a2bb70f7a1f4fa22222',
    description: 'ProvinceId (Mongo ObjectId)',
  })
  @IsOptional()
  @IsMongoId()
  provinceId?: string;

  @ApiProperty({
    required: false,
    example: '653f2a2bb70f7a1f4fa33333',
    description: 'CommuneId (Mongo ObjectId)',
  })
  @IsOptional()
  @IsMongoId()
  communeId?: string;
}
