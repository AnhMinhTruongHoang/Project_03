import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import { LocationService } from './location.service';
import { UpdateAddressDto } from './dto/update-location.dto';
import { Public } from 'src/health/decorator/customize';

@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  
  @Public()
  @Get('provinces')
  getProvinces() {
    return this.locationService.getProvinces();
  }

  @Public()
  @Get('Communes')
  getCommunes(@Query('provinceId') provinceId: string) {
    return this.locationService.getCommunes(provinceId);
  }

  @Get('addresses')
  listAddresses(
    @Query('current') current = '1',
    @Query('pageSize') pageSize = '10',
    @Query('q') q?: string,
  ) {
    return this.locationService.listAddresses(+current, +pageSize, q);
  }

  @Post('addresses')
  createAddress(@Body() body: any) {
    return this.locationService.createAddress(body);
  }

  @Patch('addresses/:id')
  updateAddress(@Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.locationService.updateAddress(id, dto);
  }

  @Get('addresses/:id')
  getAddress(@Param('id') id: string) {
    return this.locationService.getAddressById(id);
  }
}
