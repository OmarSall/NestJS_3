import { UsersService } from '../users/users.service';
import { AuthenticationService } from './authentication.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { User } from '@prisma/client';
import { hash } from 'bcrypt';
import { NotFoundException } from '@nestjs/common';
import { WrongCredentialsException } from './wrong-credentials.exception';
import { SignUpDto } from './dto/sign-up.dto';

describe('The AuthenticationService', () => {
  let userData: User;
  let authenticationService: AuthenticationService;
  let password: string;
  let getByEmailMock: jest.Mock;
  let createMock: jest.Mock<unknown, [SignUpDto]>;
  let jwtService: JwtService;
  let configService: ConfigService;
  beforeEach(async () => {
    getByEmailMock = jest.fn();
    createMock = jest.fn<unknown, [SignUpDto]>();

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token'),
    } as unknown as JwtService;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_EXPIRES') return '3600';
        if (key === 'JWT_SECRET') return 'super-secret';
        return null;
      }),
    } as unknown as ConfigService;

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
            create: createMock,
          },
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
      imports: [
        UsersModule,
        ConfigModule.forRoot(),
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
    describe('and an invalid email is provided', () => {
      beforeEach(() => {
        getByEmailMock.mockRejectedValue(new NotFoundException());
      });
      it('should throw WrongCredentialsException', () => {
        return expect(async () => {
          await authenticationService.getAuthenticatedUser({
            email: 'invalid@smith.com',
            password,
          });
        }).rejects.toThrow(WrongCredentialsException);
      });
    });
  });
  describe('when signUp method is called', () => {
    it('should hash the password and call usersService.create with correct data', async () => {
      const testUserDto: SignUpDto = {
        name: 'John',
        email: 'john@smith.com',
        phoneNumber: '123456789',
        password: 'strongPassword123',
        address: {
          city: 'City',
          street: 'Street',
          country: 'Country',
        },
      };

      await authenticationService.signUp(testUserDto);

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: testUserDto.email,
          name: testUserDto.name,
          phoneNumber: testUserDto.phoneNumber,
          address: testUserDto.address,
          password: expect.any(String),
        }),
      );
      const passedPassword = (
        createMock.mock.calls[0][0] as { password: string }
      ).password;
      expect(passedPassword).not.toBe(testUserDto.password);
    });
  });
  describe('when getCookieWithJwtToken is  called', () => {
    it('should return a properly formatted cookie with the JWT token', () => {
      const userId = 42;

      const result = authenticationService.getCookieWithJwtToken(userId);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { userId },
        {
          secret: 'super-secret',
          expiresIn: 3600,
        },
      );

      expect(result).toBe(
        'Authentication=mocked-jwt-token; HttpOnly; Path=/; Max-Age=3600',
      );
    });
  });
});
