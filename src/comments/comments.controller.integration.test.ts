import {
  INestApplication,
  ExecutionContext,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { Prisma } from '@prisma/client';
import { PrismaError } from '../database/prisma-error.enum';

describe('CommentsController (HTTP integration)', () => {
  let app: INestApplication;
  const findManyMock = jest.fn();
  const findUniqueMock = jest.fn();
  const createMock = jest.fn();
  const updateMock = jest.fn();
  const deleteMock = jest.fn();
  const mockAuthGuard = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = { id: 1, email: 'test@user.com' };
      return true;
    },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        CommentsService,
        {
          provide: PrismaService,
          useValue: {
            comment: {
              findMany: findManyMock,
              findUnique: findUniqueMock,
              create: createMock,
              update: updateMock,
              delete: deleteMock,
            },
          },
        },
      ],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue(mockAuthGuard)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await app.close();
  });
  describe('when GET /comments endpoint is called', () => {
    it('responds 200 with a list of comments', async () => {
      const comments = [
        { id: 1, content: 'Nice article!', articleId: 10 },
        { id: 2, content: 'I disagree', articleId: 10 },
      ];
      findManyMock.mockResolvedValueOnce(comments);
      await request(app.getHttpServer())
        .get('/comments')
        .expect(200)
        .expect(comments);
      expect(findManyMock).toHaveBeenCalledTimes(1);
    });
  });
  describe('when GET /comments/:id endpoint is called', () => {
    it('responds 200 with a single comment when it exists', async () => {
      const comment = { id: 7, content: 'Refactoring is great', articleId: 12 };
      findUniqueMock.mockImplementation(({ where: { id } }: any) =>
        id === 7 ? Promise.resolve(comment) : Promise.resolve(null),
      );
      await request(app.getHttpServer())
        .get('/comments/7')
        .expect(200)
        .expect(comment);
      expect(findUniqueMock).toHaveBeenCalledTimes(1);
    });
    it('responds 404 when the comment does not exist', async () => {
      findUniqueMock.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).get('/comments/999').expect(404);
    });
    it('responds 400 when id is not a number (ParseIntPipe)', async () => {
      await request(app.getHttpServer()).get('/comments/abc').expect(400);
    });
  });
  describe('when POST /comments endpoint is called', () => {
    it('responds 201 with the created comment when payload is valid', async () => {
      const payload = { content: 'Great!', articleId: 10 };
      const created = { ...payload, id: 101 };
      createMock.mockResolvedValueOnce(created);

      await request(app.getHttpServer())
        .post('/comments')
        .send(payload)
        .expect(201)
        .expect(created);
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith({ data: payload });
    });
    it('responds 400 when payload fails validation (missing content)', async () => {
      await request(app.getHttpServer())
        .post('/comments')
        .send({ articleId: 10 })
        .expect(400);
    });
    it('responds 400 when articleId is not a number', async () => {
      await request(app.getHttpServer())
        .post('/comments')
        .send({ content: 'Ok', articleId: '10' })
        .expect(400);
    });
    it('responds 400 when content has wrong type', async () => {
      await request(app.getHttpServer())
        .post('/comments')
        .send({ content: 123, articleId: 10 })
        .expect(400);
    });
    it('responds 400 when payload has extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/comments')
        .send({ content: 'Ok', articleId: 10, extra: 'nope' })
        .expect(400);
    });
  });
  describe('when PATCH /comments/:id endpoint is called', () => {
    it('responds 200 with the updated comment when payload is valid', async () => {
      const updated = { id: 5, content: 'Updated text', articleId: 10 };
      updateMock.mockResolvedValueOnce(updated);
      await request(app.getHttpServer())
        .patch('/comments/5')
        .send({ content: 'Updated text' })
        .expect(200)
        .expect(updated);
      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { content: 'Updated text' },
      });
    });
    it('responds 400 when id is not a number', async () => {
      await request(app.getHttpServer())
        .patch('/comments/xyz')
        .send({ content: 'x' })
        .expect(400);
    });
    it('responds 400 when payload has wrong type (content not a string)', async () => {
      await request(app.getHttpServer())
        .patch('/comments/5')
        .send({ content: 123 })
        .expect(400);
    });
    it('responds 400 when payload has extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .patch('/comments/5')
        .send({ content: 'Ok', extra: 'nope' })
        .expect(400);
    });
    it('responds 404 when Prisma reports RecordDoesNotExist on update', async () => {
      updateMock.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: PrismaError.RecordDoesNotExist,
          clientVersion: Prisma.prismaVersion.client,
        }),
      );
      await request(app.getHttpServer())
        .patch('/comments/999')
        .send({ content: 'Anything' })
        .expect(404);
    });
  });
  describe('when DELETE /comments/:id endpoint is called', () => {
    it('responds 200 on successful deletion (empty body)', async () => {
      deleteMock.mockResolvedValueOnce({ id: 1 });
      await request(app.getHttpServer()).delete('/comments/1').expect(200);
      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(deleteMock).toHaveBeenCalledWith({ where: { id: 1 } });
    });
    it('responds 400 when id is not a number', async () => {
      await request(app.getHttpServer()).delete('/comments/abc').expect(400);
    });
    it('responds 404 when Prisma reports RecordDoesNotExist on delete', async () => {
      deleteMock.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: PrismaError.RecordDoesNotExist,
          clientVersion: Prisma.prismaVersion.client,
        }),
      );
      await request(app.getHttpServer()).delete('/comments/999').expect(404);
    });
  });
});
