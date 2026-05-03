import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

type OnSignInBody = {
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('on-sign-in')
  async onSignIn(@Body() body: OnSignInBody) {
    const { email, name, image } = body ?? {};
    const result = await this.auth.onSignIn({ email, name, image });
    return result;
  }
}
