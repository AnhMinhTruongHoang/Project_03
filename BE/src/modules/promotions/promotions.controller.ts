import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PromosService } from './promotions.service';
import { CreatePromoDto } from './dto/create-promotion.dto';
import { UpdatePromoDto } from './dto/update-promotion.dto';
import { Public, ResponseMessage, Users } from 'src/health/decorator/customize';
import { IUser } from 'src/types/user.interface';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('promos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('promos')
export class PromosController {
  constructor(private readonly promosService: PromosService) {}

  @Post()
  @ResponseMessage('Create new promo')
  async create(@Body() dto: CreatePromoDto, @Users() user: IUser) {
    const newPromo = await this.promosService.create(dto, user);
    return {
      _id: newPromo._id,
      createdAt: newPromo.createdAt,
      createdBy: newPromo.createdBy,
    };
  }

  @Get()
  @ResponseMessage('Fetch promos')
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ) {
    return this.promosService.findAll();
  }

  @Public()
  @Get(':id')
  @ResponseMessage('Fetch promo by id')
  findOne(@Param('id') id: string) {
    return this.promosService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Update a promo')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePromoDto,
    @Users() user: IUser,
  ) {
    return this.promosService.update(id, dto, user);
  }

  @Delete(':id')
  @ResponseMessage('Delete a promo')
  remove(@Param('id') id: string, @Users() user: IUser) {
    return this.promosService.remove(id, user);
  }
}
