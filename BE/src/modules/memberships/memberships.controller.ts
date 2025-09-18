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
import { MembershipsService } from './memberships.service';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { Public, ResponseMessage, Users } from 'src/health/decorator/customize';
import { IUser } from 'src/types/user.interface';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('memberships')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post()
  @ResponseMessage('Create new membership')
  async create(
    @Body() createMembershipDto: CreateMembershipDto,
    @Users() user: IUser,
  ) {
    const newMembership = await this.membershipsService.create(
      createMembershipDto,
      user,
    );
    return {
      _id: newMembership._id,
      createdAt: newMembership.createdAt,
      createdBy: newMembership.createdBy,
    };
  }

  @Get()
  @ResponseMessage('Fetch memberships with paginate')
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ) {
    return this.membershipsService.findAll();
  }

  @Public()
  @Get(':id')
  @ResponseMessage('Fetch membership by id')
  findOne(@Param('id') id: string) {
    return this.membershipsService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Update a membership')
  update(
    @Body() updateMembershipDto: UpdateMembershipDto,
    @Users() user: IUser,
    @Param('id') id: string,
  ) {
    return this.membershipsService.update(id, updateMembershipDto);
  }

  @Delete(':id')
  @ResponseMessage('Delete a membership')
  remove(@Param('id') id: string, @Users() user: IUser) {
    return this.membershipsService.remove(id);
  }
}
