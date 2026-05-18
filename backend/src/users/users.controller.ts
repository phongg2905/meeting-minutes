import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(1)
  @ApiOperation({ summary: 'Danh sách người dùng (Admin)' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(1)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOneSafe(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật hồ sơ ca nhan' })
  updateMe(@Request() req, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.user_id, dto);
  }

  @Post()
  @Roles(1)
  @ApiOperation({ summary: 'Tạo người dùng (Admin)' })
  create(@Body() dto: CreateUserDto, @Request() req) {
    return this.usersService.create(dto, req.user.user_id);
  }

  @Patch(':id')
  @Roles(1)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @Request() req) {
    return this.usersService.update(id, dto, req.user.user_id);
  }

  @Patch(':id/status')
  @Roles(1)
  @ApiOperation({ summary: 'Khóa/mở khóa tài khoản' })
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: string, @Request() req) {
    return this.usersService.updateStatus(id, status, req.user.user_id);
  }

  @Delete(':id')
  @Roles(1)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.usersService.remove(id, req.user.user_id);
  }
}
