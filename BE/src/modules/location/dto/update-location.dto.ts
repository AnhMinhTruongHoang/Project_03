// update-address.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './create-location.dto';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
