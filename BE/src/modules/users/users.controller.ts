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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public, ResponseMessage, Users } from 'src/health/decorator/customize';
import { IUser } from 'src/types/user.interface';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ResponseMessage('Create New User')
  async create(@Body() createUserDto: CreateUserDto, @Users() user: IUser) {
    const NewUser = await this.usersService.create(createUserDto, user);
    return {
      _id: NewUser?._id,
      createdAt: NewUser?.createdAt,
      createdBy: NewUser?.createdBy,
    };
  }

  @Get()
  @ResponseMessage('Fetch user with paginate')
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ) {
    return this.usersService.findAll(+currentPage, +limit, qs);
  }

  // Danh sách đã xoá mềm
  @Get('trash')
  @ResponseMessage('Fetch deleted users')
  findAllDeleted(@Query() qs: any) {
    return this.usersService.findAllDeleted(qs);
  }

  @Public() // bỏ qua JwtAuthGuard
  @ResponseMessage('fetch user by id')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Public() // bỏ qua JwtAuthGuard
  @ResponseMessage('Fetch user by role')
  @Post(':role')
  async findUserByRole(@Param('role') role: string) {
    return this.usersService.findUserByRole(role);
  }

  @Patch(':id')
  @ResponseMessage('Update a User')
  async update(
    @Body() updateUserDto: UpdateUserDto,
    @Users() users: IUser,
    @Param('id') id: string,
  ) {
    return this.usersService.update(updateUserDto, users, id);
  }

  // Xoá mềm
  @Delete(':id')
  @ResponseMessage('Delete a User')
  remove(@Param('id') id: string, @Users() users: IUser) {
    return this.usersService.remove(id, users);
  }

  // Restore a User
  @Patch(':id/restore')
  @ResponseMessage('Restore a User')
  restore(@Param('id') id: string, @Users() users: IUser) {
    return this.usersService.restore(id, users);
  }

  // Xoá vĩnh viễn
  @Delete(':id/hard')
  @ResponseMessage('Hard delete a User')
  hardDelete(@Param('id') id: string) {
    return this.usersService.hardDelete(id);
  }
}
