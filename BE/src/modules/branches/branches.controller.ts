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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ResponseMessage } from 'src/health/decorator/customize';

@ApiTags('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @ResponseMessage('Tạo chi nhánh mới')
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Get()
  @ResponseMessage('Danh sách chi nhánh')
  findAll(
    @Query('current') current?: string,
    @Query('pageSize') size?: string,
    @Query() query?: any,
  ) {
    const page = current ? Number(current) : 1;
    const limit = size ? Number(size) : 10;
    return this.branchesService.findAll(page, limit, query || {});
  }

  @Get(':id')
  @ResponseMessage('Chi tiết chi nhánh')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật chi nhánh')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Xóa (soft) chi nhánh')
  remove(@Param('id') id: string) {
    // TODO: truyền req.user nếu muốn lưu deletedBy
    return this.branchesService.remove(id);
  }

  @Patch(':id/restore')
  @ResponseMessage('Khôi phục chi nhánh')
  restore(@Param('id') id: string) {
    return this.branchesService.restore(id);
  }

  @Delete(':id/force')
  @ResponseMessage('Xóa vĩnh viễn chi nhánh')
  hardDelete(@Param('id') id: string) {
    return this.branchesService.hardDelete(id);
  }
}
