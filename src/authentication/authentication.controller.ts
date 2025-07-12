import { Controller, Body, Post, HttpCode } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { SignUpDto } from './dto/sign-up.dto';
import { LogInDto } from '../users/log-in.dto';

@Controller('authentication')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('sign-up')
  async signUp(@Body() signUpData: SignUpDto) {
    return await this.authenticationService.signUp(signUpData);
  }

  @HttpCode(200)
  @Post('log-in')
  async logIn(@Body() logInData: LogInDto) {
    return await this.authenticationService.getAuthenticatedUser(logInData);
  }
}
