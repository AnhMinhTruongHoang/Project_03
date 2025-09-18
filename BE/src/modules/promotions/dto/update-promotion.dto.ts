import { PartialType } from '@nestjs/swagger';
import { CreatePromoDto } from './create-promotion.dto';

export class UpdatePromoDto extends PartialType(CreatePromoDto) {}
