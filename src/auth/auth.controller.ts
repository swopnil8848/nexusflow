import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UserLoginDto } from './dto/user-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}


  @Get('health')
  health() {
    return { ok: true, module: 'auth' };
  }

  @Post('user/login')
  userLogin(@Body() dto: UserLoginDto) {
    return this.authService.loginUser(dto);
  }

  @Post('admin/login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.loginAdmin(dto);
  }
}
