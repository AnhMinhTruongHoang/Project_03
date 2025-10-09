import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CodeAuthDto {
  @ApiProperty({ example: '652f2d...abc', description: 'ID người dùng' })
  @IsNotEmpty({ message: '_id không được để trống' })
  @IsString()
  _id: string;

  @ApiProperty({ example: 'f7a8b3c...', description: 'Mã xác thực' })
  @IsNotEmpty({ message: 'code không được để trống' })
  @IsString()
  code: string;
}
