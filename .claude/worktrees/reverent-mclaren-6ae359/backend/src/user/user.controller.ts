import { Body, Controller, Get, Headers, Patch } from '@nestjs/common';
import { requireUserEmail } from '../common/user-email';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get('me')
  async me(@Headers() headers: Record<string, string | string[] | undefined>) {
    const email = requireUserEmail(headers);
    return await this.users.getMeByEmail(email);
  }

  @Patch('me')
  async updateMe(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: { name?: string },
  ) {
    const email = requireUserEmail(headers);
    return await this.users.updateMeByEmail(email, body ?? {});
  }
}
