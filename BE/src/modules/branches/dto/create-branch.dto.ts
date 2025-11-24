import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

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
    description: 'Số điện thoại (10 số, bắt đầu bằng 0)',
    required: true,
  })
  @IsNotEmpty({ message: 'Số điện thoại là bắt buộc' })
  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  @Matches(/^[0-9]{9,11}$/)
  phone: string;

  @ApiProperty({
    example: 'Hà Nội',
    description: 'Tên thành phố hiển thị (không bắt buộc)',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  // @ApiProperty({
  //   required: false,
  //   example: '653f2a2bb70f7a1f4fa22222',
  //   description: 'ProvinceId (Mongo ObjectId)',
  // })
  // @IsOptional()
  // @IsMongoId()
  // provinceId?: string;

  // @ApiProperty({
  //   required: false,
  //   example: '653f2a2bb70f7a1f4fa33333',
  //   description: 'CommuneId (Mongo ObjectId)',
  // })
  // @IsOptional()
  // @IsMongoId()
  // communeId?: string;

  @ApiProperty({ required: false, example: 'Hà Nội' })
  @IsOptional()
  @IsString()
  provinceName?: string;

  @ApiProperty({ required: false, example: 'Phường Hoàn Kiếm' })
  @IsOptional()
  @IsString()
  communeName?: string;

  @ApiProperty({
    example: true,
    description: 'Chi nhánh đang hoạt động hay không',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
