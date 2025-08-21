import {
  INestApplication,
  ExecutionContext,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ProfileImageController } from './profile-image.controller';
import { ProfileImageService } from './profile-image.service';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { Prisma } from '@prisma/client';
import { PrismaError } from '../database/prisma-error.enum';

describe('ProfileImageController (HTTP integration)', () => {
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
    const moduleRef = await Test.createTestingModule({
      controllers: [ProfileImageController],
      providers: [
        ProfileImageService,
        {
          provide: PrismaService,
          useValue: {
            profileImage: {
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

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  describe('when POST /profile-image endpoint is called', () => {
    it('responds 201 with created profile image when payload is valid', async () => {
      const payload = { url: 'https://cdn.example.com/avatar.png', userId: 10 };
      const created = { id: 101, ...payload };
      createMock.mockResolvedValueOnce(created);

      await request(app.getHttpServer())
        .post('/profile-image')
        .send(payload)
        .expect(201)
        .expect(created);

      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith({ data: payload });
    });

    it('responds 400 when url is not a valid URL', async () => {
      await request(app.getHttpServer())
        .post('/profile-image')
        .send({ url: 'not-a-url', userId: 10 })
        .expect(400);

      expect(createMock).not.toHaveBeenCalled();
    });

    it('responds 400 when url is missing', async () => {
      await request(app.getHttpServer())
        .post('/profile-image')
        .send({ userId: 10 })
        .expect(400);

      expect(createMock).not.toHaveBeenCalled();
    });

    it('responds 400 when userId is missing', async () => {
      await request(app.getHttpServer())
        .post('/profile-image')
        .send({ url: 'https://cdn.example.com/p.png' })
        .expect(400);

      expect(createMock).not.toHaveBeenCalled();
    });

    it('responds 400 when userId is not an integer', async () => {
      await request(app.getHttpServer())
        .post('/profile-image')
        .send({ url: 'https://cdn.example.com/p.png', userId: '10' }) // string, not number
        .expect(400);

      expect(createMock).not.toHaveBeenCalled();
    });

    it('responds 400 when payload has extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/profile-image')
        .send({
          url: 'https://cdn.example.com/p.png',
          userId: 10,
          extra: 'nope',
        })
        .expect(400);

      expect(createMock).not.toHaveBeenCalled();
    });
  });

  describe('when GET /profile-image endpoint is called', () => {
    it('responds 200 with a list including user relation', async () => {
      const list = [
        {
          id: 1,
          url: 'https://a.png',
          userId: 10,
          user: { id: 10, email: 'a@a.com' },
        },
        {
          id: 2,
          url: 'https://b.png',
          userId: 11,
          user: { id: 11, email: 'b@b.com' },
        },
      ];
      findManyMock.mockResolvedValueOnce(list);

      await request(app.getHttpServer())
        .get('/profile-image')
        .expect(200)
        .expect(list);

      expect(findManyMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when GET /profile-image/:id endpoint is called', () => {
    it('responds 200 with a single image when it exists', async () => {
      const item = {
        id: 7,
        url: 'https://x.png',
        userId: 12,
        user: { id: 12, email: 'u@u.com' },
      };
      findUniqueMock.mockImplementation(({ where: { id } }: any) =>
        id === 7 ? Promise.resolve(item) : Promise.resolve(null),
      );

      await request(app.getHttpServer())
        .get('/profile-image/7')
        .expect(200)
        .expect(item);

      expect(findUniqueMock).toHaveBeenCalledTimes(1);
    });

    it('responds 404 when the image does not exist', async () => {
      findUniqueMock.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).get('/profile-image/999').expect(404);
    });

    it('responds 400 when id is not a number (ParseIntPipe)', async () => {
      await request(app.getHttpServer()).get('/profile-image/abc').expect(400);
      expect(findUniqueMock).not.toHaveBeenCalled();
    });
  });

  describe('when PATCH /profile-image/:id is called', () => {
    it('responds 200 with updated image when payload is valid', async () => {
      const updated = { id: 5, url: 'https://new.png', userId: 10 };
      updateMock.mockResolvedValueOnce(updated);

      await request(app.getHttpServer())
        .patch('/profile-image/5')
        .send({ url: 'https://new.png' })
        .expect(200)
        .expect(updated);

      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { url: 'https://new.png' },
      });
    });

    it('responds 400 when id is not a number', async () => {
      await request(app.getHttpServer())
        .patch('/profile-image/xyz')
        .send({ url: 'https://ok.png' })
        .expect(400);

      expect(updateMock).not.toHaveBeenCalled();
    });

    it('responds 400 when url is not a valid URL', async () => {
      await request(app.getHttpServer())
        .patch('/profile-image/5')
        .send({ url: 'not-a-url' })
        .expect(400);

      expect(updateMock).not.toHaveBeenCalled();
    });

    it('responds 400 when payload has extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .patch('/profile-image/5')
        .send({ url: 'https://ok.png', extra: 'nope' })
        .expect(400);

      expect(updateMock).not.toHaveBeenCalled();
    });

    it('responds 404 when Prisma reports RecordDoesNotExist on update', async () => {
      updateMock.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: PrismaError.RecordDoesNotExist,
          clientVersion: Prisma.prismaVersion.client,
        }),
      );

      await request(app.getHttpServer())
        .patch('/profile-image/999')
        .send({ url: 'https://ok.png' })
        .expect(404);
    });
  });

  describe('when DELETE /profile-image/:id endpoint is called', () => {
    it('responds 200 on successful deletion', async () => {
      deleteMock.mockResolvedValueOnce({ id: 1 });

      await request(app.getHttpServer()).delete('/profile-image/1').expect(200);

      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(deleteMock).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('responds 400 when id is not a number', async () => {
      await request(app.getHttpServer())
        .delete('/profile-image/abc')
        .expect(400);
      expect(deleteMock).not.toHaveBeenCalled();
    });

    it('responds 404 when Prisma reports RecordDoesNotExist on delete', async () => {
      deleteMock.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: PrismaError.RecordDoesNotExist,
          clientVersion: Prisma.prismaVersion.client,
        }),
      );

      await request(app.getHttpServer())
        .delete('/profile-image/999')
        .expect(404);
    });
  });
});
