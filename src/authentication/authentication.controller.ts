import { Controller, Body, Post, HttpCode, Res } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { SignUpDto } from './dto/sign-up.dto';
import { LogInDto } from '../users/log-in.dto';
import { response } from 'express';

@Controller('authentication')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('sign-up')
  async signUp(@Body() signUpData: SignUpDto) {
    return await this.authenticationService.signUp(signUpData);
  }

  @HttpCode(200)
  @Post('log-in')
  async logIn(
    @Body() logInData: LogInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user =
      await this.authenticationService.getAuthenticatedUser(logInData);
    const cookie = this.authenticationService.getCookieWithJwtToken(user.id);

    response.setHeader('Set-Cookie', cookie);

    response.send(user);
  }
}
