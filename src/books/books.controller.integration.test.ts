import {
  INestApplication,
  ExecutionContext,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { Prisma } from '@prisma/client';
import { PrismaError } from '../database/prisma-error.enum';

describe('Books Controller (HTTP integration', () => {
  let app: INestApplication;

  const findManyMock = jest.fn();
  const findUniqueMock = jest.fn();
  const createMock = jest.fn();
  const updateMock = jest.fn();
  const deleteMock = jest.fn();

  const mockAuthGuard = {
    canActivate: (ctx: ExecutionContext) => {
      const req = ctx.switchToHttp().getRequest();
      req.user = { id: 1, email: 'test@user.com' };
      return true;
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [
        BooksService,
        {
          provide: PrismaService,
          useValue: {
            book: {
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
  describe('when the GET /books endpoint is called', () => {
    it('responds 200 with a list of books including authors', async () => {
      const books = [
        {
          id: 1,
          title: 'Clean Code',
          authors: [{ id: 10, name: 'Robert C. Martin' }],
        },
        {
          id: 2,
          title: 'The Pragmatic Programmer',
          authors: [{ id: 11, name: 'Andrew Hunt' }],
        },
      ];
      findManyMock.mockResolvedValueOnce(books);

      await request(app.getHttpServer())
        .get('/books')
        .expect(200)
        .expect(books);

      expect(findManyMock).toHaveBeenCalledTimes(1);
    });
  });
  describe('when the GET /books/:id endpoint is called', () => {
    it('responds 200 with a single book when it exists', async () => {
      const book = {
        id: 7,
        title: 'Refactoring',
        authors: [{ id: 12, name: 'Martin Fowler' }],
      };
      findUniqueMock.mockImplementation(({ where: { id } }: any) =>
        id === 7 ? Promise.resolve(book) : Promise.resolve(null),
      );

      await request(app.getHttpServer())
        .get('/books/7')
        .expect(200)
        .expect(book);

      expect(findUniqueMock).toHaveBeenCalledTimes(1);
    });

    it('responds 404 when the book does not exist', async () => {
      findUniqueMock.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).get('/books/999').expect(404);
    });

    it('responds 400 when id is not a number (ParseIntPipe)', async () => {
      await request(app.getHttpServer()).get('/books/abc').expect(400);
    });
  });
  describe('when the POST /books endpoint is called', () => {
    it('responds 201 with the created book when payload is valid', async () => {
      const payload = { title: 'New Book', authorIds: [10, 11] };
      const created = {
        id: 101,
        title: payload.title,
        authors: [
          { id: 10, name: 'A' },
          { id: 11, name: 'B' },
        ],
      };
      createMock.mockResolvedValueOnce(created);

      await request(app.getHttpServer())
        .post('/books')
        .send(payload)
        .expect(201)
        .expect(created);

      expect(createMock).toHaveBeenCalledTimes(1);
    });

    it('responds 400 when payload fails validation (missing title)', async () => {
      await request(app.getHttpServer())
        .post('/books')
        .send({ authorIds: [1, 2] })
        .expect(400);
    });

    it('responds 400 when payload has wrong types (title not a string)', async () => {
      await request(app.getHttpServer())
        .post('/books')
        .send({ title: 123 })
        .expect(400);
    });

    it('responds 400 when payload has non-numeric authorIds', async () => {
      await request(app.getHttpServer())
        .post('/books')
        .send({ title: 'Book', authorIds: ['x', 2] })
        .expect(400);
    });

    it('responds 400 when payload has extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/books')
        .send({ title: 'Book', extra: 'nope' })
        .expect(400);
    });

    it('responds 400 when Prisma reports RecordDoesNotExist for authorIds', async () => {
      createMock.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: PrismaError.RecordDoesNotExist,
          clientVersion: Prisma.prismaVersion.client,
        }),
      );

      await request(app.getHttpServer())
        .post('/books')
        .send({ title: 'Book', authorIds: [999] })
        .expect(400);
    });
  });
  describe('when PATCH /books/:id endpoint is called', () => {
    it('responds 200 with the updated book when payload is valid', async () => {
      const updated = { id: 5, title: 'Updated Title', authors: [] };
      updateMock.mockResolvedValueOnce(updated);

      await request(app.getHttpServer())
        .patch('/books/5')
        .send({ title: 'Updated Title' })
        .expect(200)
        .expect(updated);

      expect(updateMock).toHaveBeenCalledTimes(1);
    });

    it('responds 400 when id is not a number', async () => {
      await request(app.getHttpServer())
        .patch('/books/xyz')
        .send({ title: 'T' })
        .expect(400);
    });

    it('responds 400 when payload has wrong type (title not a string)', async () => {
      await request(app.getHttpServer())
        .patch('/books/5')
        .send({ title: 123 })
        .expect(400);
    });

    it('responds 400 when payload has extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .patch('/books/5')
        .send({ title: 'Ok', extra: 'nope' })
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
        .patch('/books/5')
        .send({ title: 'Anything' })
        .expect(404);
    });
  });
  describe('when DELETE /books/:id endpoint is called', () => {
    it('responds 200 on successful deletion (no body)', async () => {
      deleteMock.mockResolvedValueOnce({ id: 1 });
      await request(app.getHttpServer()).delete('/books/1').expect(200);

      expect(deleteMock).toHaveBeenCalledTimes(1);
    });

    it('responds 400 when id is not a number', async () => {
      await request(app.getHttpServer()).delete('/books/abc').expect(400);
    });

    it('responds 404 when Prisma reports RecordDoesNotExist on delete', async () => {
      deleteMock.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: PrismaError.RecordDoesNotExist,
          clientVersion: Prisma.prismaVersion.client,
        }),
      );

      await request(app.getHttpServer()).delete('/books/999').expect(404);
    });
  });
});
