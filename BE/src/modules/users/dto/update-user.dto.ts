import { OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEmail, IsMongoId, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/swagger';


export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const)) {
  // @IsNotEmpty({ message: '_id not null !' })
  // _id: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsMongoId({ message: 'Chi nhánh không hợp lệ' })
  branchId?: string;
}
