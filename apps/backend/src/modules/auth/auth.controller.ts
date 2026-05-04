import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ medium: { limit: 5, ttl: 60000 } }) // 5 attempts/min per IP — anti-brute-force
  @Post('register')
  async register(
    @Body()
    body: {
      email: string;
      password: string;
      name: string;
      organizationName: string;
    },
  ) {
    return this.authService.register(body);
  }

  @Public()
  @Throttle({ medium: { limit: 5, ttl: 60000 } }) // 5 attempts/min per IP — anti-brute-force
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }
}
