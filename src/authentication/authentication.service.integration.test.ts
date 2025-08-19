jest.mock('bcrypt', () => ({
  hash: () => {
    return Promise.resolve('hashed-password');
  },
}));

import { AuthenticationService } from './authentication.service';
import { Test } from '@nestjs/testing';
import { UsersService } from '../users/users.service';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { SignUpDto } from './dto/sign-up.dto';
import { Prisma, User } from '@prisma/client';
import { PrismaError } from '../database/prisma-error.enum';
import { ConflictException } from '@nestjs/common';

let prismaCreateMock: jest.Mock;

describe('The AuthenticationService (integration)', () => {
  let authenticationService: AuthenticationService;
  let signUpData: SignUpDto;
  beforeEach(async () => {
    prismaCreateMock = jest.fn();
    signUpData = {
      email: 'john@smith.com',
      name: 'John',
      password: 'strongPassword123',
      phoneNumber: '12345678',
    };
    const module = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: prismaCreateMock,
            },
          },
        },
      ],
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          secretOrPrivateKey: 'Secret key',
        }),
      ],
    }).compile();
    authenticationService = await module.get(AuthenticationService);
  });
  describe('when the signUp function is called', () => {
    it('should call the create method from the PrismaService', async () => {
      await authenticationService.signUp(signUpData);
      expect(prismaCreateMock).toBeCalledWith({
        data: {
          ...signUpData,
          address: {
            create: signUpData.address,
          },
          password: 'hashed-password',
        },
        include: {
          address: true,
          articles: true,
        },
      });
    });
    describe('when the PrismaService returns a valid user', () => {
      let createdUser: User;
      beforeEach(() => {
        createdUser = {
          ...signUpData,
          id: 1,
          addressId: null,
          phoneNumber: '123456789',
        };
        prismaCreateMock.mockResolvedValue(createdUser);
      });
      it('should return the user as well', async () => {
        const result = await authenticationService.signUp(signUpData);
        expect(result).toBe(createdUser);
      });
    });
    describe('when the PrismaService throws the UniqueConstraintViolated error', () => {
      beforeEach(() => {
        prismaCreateMock.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: PrismaError.UniqueConstraintViolated,
            clientVersion: Prisma.prismaVersion.client,
          }),
        );
      });
      it('should throw the ConflictException', () => {
        return expect(async () => {
          await authenticationService.signUp(signUpData);
        }).rejects.toThrow(ConflictException);
      });
      it('re-throws unknown Prisma errors (no swallowing)', async () => {
        const unknown = new Prisma.PrismaClientKnownRequestError('Unknown', {
          code: 'SOME_OTHER_CODE' as any,
          clientVersion: Prisma.prismaVersion.client,
        });
        prismaCreateMock.mockRejectedValueOnce(unknown);
        await expect(authenticationService.signUp(signUpData)).rejects.toThrow(
          unknown,
        );
      });
    });
  });
});
