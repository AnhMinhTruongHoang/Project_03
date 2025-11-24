import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../health/decorator/roles.decorator';
import { ResponseMessage } from '../health/decorator/customize';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('system')
  @Roles('ADMIN')
  @ResponseMessage('Thống kê toàn hệ thống')
  async getSystemStatistics(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const m = month ? Number(month) : undefined;
    const y = year ? Number(year) : undefined;
    return this.dashboardService.getSystemStatistics(m, y);
  }
}