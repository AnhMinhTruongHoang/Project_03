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
import { TrackingService } from './tracking.service';
import { CreateTrackingDto } from './dto/create-tracking.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ResponseMessage, Users } from 'src/health/decorator/customize';
import { IUser } from 'src/types/user.interface';

@ApiTags('tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post()
  @ResponseMessage('Tạo log tracking mới')
  create(@Body() dto: CreateTrackingDto, @Users() user: IUser) {
    return this.trackingService.create(dto, user);
  }

  @Get()
  @ResponseMessage('Danh sách log tracking')
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ) {
    return this.trackingService.findAll(+currentPage, +limit, qs);
  }

  @Get('shipment/:shipmentId')
  @ResponseMessage('Lấy timeline tracking theo shipment')
  findByShipment(@Param('shipmentId') shipmentId: string) {
    return this.trackingService.findByShipment(shipmentId);
  }

  @Get(':id')
  @ResponseMessage('Chi tiết tracking')
  findOne(@Param('id') id: string) {
    return this.trackingService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật tracking')
  update(@Param('id') id: string, @Body() dto: UpdateTrackingDto) {
    return this.trackingService.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Xóa tracking')
  remove(@Param('id') id: string, @Users() user: IUser) {
    return this.trackingService.remove(id, user);
  }
}
