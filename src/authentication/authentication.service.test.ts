import { UsersService } from '../users/users.service';
import { AuthenticationService } from './authentication.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { User } from '@prisma/client';
import { hash } from 'bcrypt';
import { NotFoundException } from '@nestjs/common';
import { WrongCredentialsException } from './wrong-credentials.exception';

describe('The AuthenticationService', () => {
  let userData: User;
  let authenticationService: AuthenticationService;
  let password: string;
  let getByEmailMock: jest.Mock;
  beforeEach(async () => {
    getByEmailMock = jest.fn();
    password = 'strongPassword123';
    const hashedPassword = await hash(password, 10);
    userData = {
      id: 1,
      email: 'john@smith.com',
      name: 'John',
      password: hashedPassword,
      addressId: null,
      phoneNumber: null,
    };
    const module = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: UsersService,
          useValue: {
            getByEmail: getByEmailMock,
          },
        },
      ],
      imports: [
        UsersModule,
        await ConfigModule.forRoot(),
        JwtModule.register({
          secretOrPrivateKey: 'Secret key',
        }),
        DatabaseModule,
      ],
    }).compile();

    authenticationService = await module.get(AuthenticationService);
  });
  describe('when the getCookieForLogOut method is called', () => {
    it('should return a cookie with an empty Authentication token', () => {
      const cookie = authenticationService.getCookieForLogOut();

      const containsAuthenticationToken = cookie.includes('Authentication=;');

      expect(containsAuthenticationToken).toBe(true);
    });
    it('should return a cookie marked with HttpOnly', () => {
      const cookie = authenticationService.getCookieForLogOut();

      const containsHttpOnly = cookie.includes('HttpOnly;');

      expect(containsHttpOnly).toBe(true);
    });
  });
  describe('when the getAuthenticatedUser method is called', () => {
    describe('and a valid email and password are provided', () => {
      beforeEach(() => {
        getByEmailMock.mockResolvedValue(userData);
      });
      it('should return a new user', async () => {
        const result = await authenticationService.getAuthenticatedUser({
          email: userData.email,
          password,
        });
        expect(result).toBe(userData);
      });
    });
    describe('and an invalid emaild is provided', () => {
      beforeEach(() => {
        getByEmailMock.mockRejectedValue(new NotFoundException());
      });
      it('should throw the BadRequestException', () => {
        return expect(async () => {
          await authenticationService.getAuthenticatedUser({
            email: 'john@smith.com',
            password,
          });
        }).rejects.toThrow(WrongCredentialsException);
      });
    });
  });
});
