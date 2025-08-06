import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SignUpDto } from './dto/sign-up.dto';
import { hash, compare } from 'bcrypt';
import { WrongCredentialsException } from './wrong-credentials.exception';
import { LogInDto } from './dto/log-in.dto';
import { TokenPayload } from './token-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signUp(signUpData: SignUpDto) {
    try {
      const saltRounds = 10;
      const hashedPassword = await hash(signUpData.password, saltRounds);

      return await this.usersService.create({
        name: signUpData.name,
        email: signUpData.email,
        phoneNumber: signUpData.phoneNumber,
        password: hashedPassword,
        address: signUpData.address,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException();
      }
      throw error;
    }
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

  getCookieWithJwtToken(userId: number) {
    const payload: TokenPayload = { userId };
    const expiresIn = Number(this.configService.get('JWT_EXPIRES'));
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn,
    });

    return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get(
      'JWT_EXPIRES',
    )}`;
  }

  getCookieForLogOut() {
    return 'Authentication=; HttpOnly; Path=/; Max-Age=0';
  }
}
