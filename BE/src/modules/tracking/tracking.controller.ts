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
import { Public, ResponseMessage, Users } from 'src/health/decorator/customize';
import { IUser } from 'src/types/user.interface';

@ApiTags('tracking')
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
  @Public()
  findAll(
    @Query('current') current?: string,
    @Query('pageSize') pageSize?: string,
    @Query() query?: any,
  ) {
    const page = current ? Number(current) : 1;
    const size = pageSize ? Number(pageSize) : 10;
    return this.trackingService.findAll(page, size, query || {});
  }
  // @Public()
  // @Get('shipment/:shipmentId')
  // @ResponseMessage('Lấy timeline tracking theo shipment')
  // findByShipment(@Param('shipmentId') shipmentId: string) {
  //   return this.trackingService.findByShipment(shipmentId);
  // }

  @Public()
  @Get(':id')
  @ResponseMessage('Chi tiết tracking')
  findOne(@Param('id') id: string) {
    return this.trackingService.findOne(id);
  }

  @Public()
  @Get('waybill/:waybill')
  @ResponseMessage('Lấy hành trình theo mã vận đơn (waybill)')
  async findByWaybill(@Param('waybill') waybill: string) {
    return this.trackingService.findByWaybill(waybill);
  }

  // @Patch(':id')
  // @ResponseMessage('Cập nhật tracking')
  // update(@Param('id') id: string, @Body() dto: UpdateTrackingDto) {
  //   return this.trackingService.update(id, dto);
  // }

  @Delete(':id')
  @ResponseMessage('Xóa (soft) tracking')
  remove(@Param('id') id: string, @Users() user: IUser) {
    return this.trackingService.remove(id, user);
  }

  @Patch(':id/restore')
  @ResponseMessage('Khôi phục tracking')
  restore(@Param('id') id: string) {
    return this.trackingService.restore(id);
  }
}
