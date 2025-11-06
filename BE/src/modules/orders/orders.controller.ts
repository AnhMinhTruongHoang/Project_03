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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ResponseMessage, Users } from 'src/health/decorator/customize';
import { IUser } from 'src/types/user.interface';

@ApiTags('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ResponseMessage('Tạo đơn hàng mới')
  create(@Body() dto: CreateOrderDto, @Users() user: IUser) {
    return this.ordersService.create(dto, user);
  }

  @Get()
  @ResponseMessage('Danh sách đơn hàng')
  findAll(
    @Query('current') current?: string,
    @Query('pageSize') limit?: string,
    @Query() query?: any,
  ) {
    const page = current ? Number(current) : 1;
    const size = limit ? Number(limit) : 10;
    return this.ordersService.findAll(page, size, query || {});
  }

  @Get(':id')
  @ResponseMessage('Chi tiết đơn hàng')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật đơn hàng')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Xóa đơn hàng (soft)')
  remove(@Param('id') id: string, @Users() user: IUser) {
    return this.ordersService.remove(id, user);
  }
}
