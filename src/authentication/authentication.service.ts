import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SignUpDto } from './dto/sign-up.dto';
import { hash, compare } from 'bcrypt';
import { WrongCredentialsException } from './wrong-credentials.exception';
import { LogInDto } from '../users/log-in.dto';

@Injectable()
export class AuthenticationService {
  constructor(private readonly usersService: UsersService) {}

  async signUp(signUpData: SignUpDto) {
    const saltRounds = 10;
    const hashedPassword = await hash(signUpData.password, saltRounds);

    return await this.usersService.create({
      name: signUpData.name,
      email: signUpData.email,
      password: hashedPassword,
    });
  }

  private async getUserByEmail(email: string) {
    try {
      return this.usersService.getByEmail(email);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new WrongCredentialsException();
      }
      throw error;
    }
  }

  private async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ) {
    const isPasswordMatching = await compare(plainTextPassword, hashedPassword);
    if (!isPasswordMatching) {
      throw new WrongCredentialsException();
    }
  }

  async getAuthenticatedUser(logInData: LogInDto) {
    const user = await this.getUserByEmail(logInData.email);
    await this.verifyPassword(logInData.password, user.password);
    return user;
  }
}
