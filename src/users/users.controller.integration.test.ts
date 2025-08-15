import { INestApplication, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { Prisma } from '@prisma/client';
import { PrismaError } from '../database/prisma-error.enum';

describe('UsersController (HTTP integration)', () => {
  let app: INestApplication;

  const userUpdateMock = jest.fn();

  const txArticleUpdateManyMock = jest.fn();
  const txArticleDeleteManyMock = jest.fn();
  const txUserDeleteMock = jest.fn();

  const transactionMock = jest.fn(async (callback: any) => {
    const prismaClient = {
      article: {
        updateMany: txArticleUpdateManyMock,
        deleteMany: txArticleDeleteManyMock,
      },
      user: {
        delete: txUserDeleteMock,
      },
    };
    return callback(prismaClient);
  });

  const mockAuthGuard = {
    canActivate: (context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest();
      request.user = { id: 1, email: 'user@test.com' };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: transactionMock,
            user: {
              update: userUpdateMock,
            },
          },
        },
      ],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();

    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => app.close());

  describe('when PATCH /users/update-phone endpoint is called', () => {
    it('responds 200 and updates phone for the authenticated user', async () => {
      const updatedUser = {
        id: 1,
        email: 'user@test.com',
        name: 'John',
        phoneNumber: '******789',
      };
      userUpdateMock.mockResolvedValueOnce({
        ...updatedUser,
        phoneNumber: '123456789',
      });

      const res = await request(app.getHttpServer())
        .patch('/users/update-phone')
        .send({ phoneNumber: '123456789' })
        .expect(200);

      expect(userUpdateMock).toHaveBeenCalledTimes(1);
      expect(userUpdateMock).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { phoneNumber: '123456789' },
      });

      expect(res.body.phoneNumber).toBe('******789');
      expect(res.body).toEqual(
        expect.objectContaining({
          id: 1,
          email: 'user@test.com',
          name: expect.any(String),
        }),
      );
    });

    it('ignores extra fields and still updates', async () => {
      userUpdateMock.mockResolvedValueOnce({
        id: 1,
        email: 'user@test.com',
        name: 'John',
        phoneNumber: '123456999',
      });

      const res = await request(app.getHttpServer())
        .patch('/users/update-phone')
        .send({ phoneNumber: '123456999', extra: 'ignored' })
        .expect(200);

      expect(userUpdateMock).toHaveBeenCalledTimes(1);
      expect(userUpdateMock).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { phoneNumber: '123456999' },
      });

      expect(res.body.phoneNumber.endsWith('999')).toBe(true);
      expect(res.body.phoneNumber.replace('999', '')).toMatch(/^\*+$/);
      expect(res.body).toEqual(
        expect.objectContaining({
          id: 1,
          email: 'user@test.com',
          name: expect.any(String),
        }),
      );
    });

    it('responds 404 when Prisma throws P2025 (user not found)', async () => {
      userUpdateMock.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: PrismaError.RecordDoesNotExist,
          clientVersion: Prisma.prismaVersion.client,
        }),
      );

      await request(app.getHttpServer())
        .patch('/users/update-phone')
        .send({ phoneNumber: '111222333' })
        .expect(404);

      expect(userUpdateMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when DELETE /users endpoint is called', () => {
    it('responds 200 and deletes user + deletes their articles when newAuthorId is NOT provided', async () => {
      txArticleDeleteManyMock.mockResolvedValueOnce({ count: 3 });
      txUserDeleteMock.mockResolvedValueOnce({ id: 1 });

      await request(app.getHttpServer())
        .delete('/users')
        .expect(200)
        .expect({ id: 1 });

      expect(txArticleDeleteManyMock).toHaveBeenCalledTimes(1);
      expect(txArticleDeleteManyMock).toHaveBeenCalledWith({
        where: { authorId: 1 },
      });
      expect(txArticleUpdateManyMock).not.toHaveBeenCalled();

      expect(txUserDeleteMock).toHaveBeenCalledTimes(1);
      expect(txUserDeleteMock).toHaveBeenCalledWith({ where: { id: 1 } });

      expect(transactionMock).toHaveBeenCalledTimes(1);
    });

    it('responds 200 and reassigns articles to new author when newAuthorId is provided', async () => {
      txArticleUpdateManyMock.mockResolvedValueOnce({ count: 3 });
      txUserDeleteMock.mockResolvedValueOnce({ id: 1 });

      await request(app.getHttpServer())
        .delete('/users')
        .query({ newAuthorId: 5 })
        .expect(200)
        .expect({ id: 1 });

      expect(txArticleUpdateManyMock).toHaveBeenCalledTimes(1);
      expect(txArticleUpdateManyMock).toHaveBeenCalledWith({
        where: { authorId: 1 },
        data: { authorId: 5 },
      });
      expect(txArticleDeleteManyMock).not.toHaveBeenCalled();

      expect(txUserDeleteMock).toHaveBeenCalledTimes(1);
      expect(txUserDeleteMock).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(transactionMock).toHaveBeenCalledTimes(1);
    });

    it('responds 400 when newAuthor is not a number (ParseIntPipe on query)', async () => {
      await request(app.getHttpServer())
        .delete('/users')
        .query({ newAuthorId: 'abc' })
        .expect(400);

      expect(transactionMock).not.toHaveBeenCalled();
      expect(txArticleUpdateManyMock).not.toHaveBeenCalled();
      expect(txArticleDeleteManyMock).not.toHaveBeenCalled();
      expect(txUserDeleteMock).not.toHaveBeenCalled();
    });

    it('responds 404 when user deletion fails with P2025 inside transaction', async () => {
      txArticleDeleteManyMock.mockResolvedValueOnce({ count: 0 });
      txUserDeleteMock.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: PrismaError.RecordDoesNotExist, // P2025
          clientVersion: Prisma.prismaVersion.client,
        }),
      );

      await request(app.getHttpServer()).delete('/users').expect(404);

      expect(transactionMock).toHaveBeenCalledTimes(1);
    });
  });
});
