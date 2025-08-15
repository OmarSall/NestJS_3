import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaError } from '../database/prisma-error.enum';

describe('ProductsController (HTTP integration)', () => {
  let app: INestApplication;

  const createMock = jest.fn();
  const findManyMock = jest.fn();
  const findUniqueMock = jest.fn();
  const updateMock = jest.fn();
  const deleteMock = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              create: createMock,
              findMany: findManyMock,
              findUnique: findUniqueMock,
              update: updateMock,
              delete: deleteMock,
            },
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true, // enables ParseIntPipe on params etc.
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

  describe('when POST /products endpoint is called', () => {
    it('responds 201 with created product when payload is valid', async () => {
      const payload = { name: 'Keyboard', price: 199.99, isInStock: true };
      const created = { id: 101, ...payload };
      createMock.mockResolvedValueOnce(created);

      await request(app.getHttpServer())
        .post('/products')
        .send(payload)
        .expect(201)
        .expect(created);

      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith({ data: payload });
    });

    it('responds 400 when payload is missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({ price: 10, isInStock: true })
        .expect(400);

      expect(createMock).not.toHaveBeenCalled();
    });

    it('responds 400 when payload has wrong types', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({ name: 'X', price: '10', isInStock: true })
        .expect(400);

      await request(app.getHttpServer())
        .post('/products')
        .send({ name: 'X', price: 10, isInStock: 'true' })
        .expect(400);

      expect(createMock).not.toHaveBeenCalled();
    });

    it('responds 400 when payload has extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({ name: 'X', price: 10, isInStock: true, extra: 'nope' })
        .expect(400);

      expect(createMock).not.toHaveBeenCalled();
    });
  });

  describe('when GET /products endpoint is called', () => {
    it('responds 200 with a list of products', async () => {
      const list = [
        { id: 1, name: 'Mouse', price: 49.9, isInStock: true },
        { id: 2, name: 'Monitor', price: 899, isInStock: false },
      ];
      findManyMock.mockResolvedValueOnce(list);

      await request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect(list);

      expect(findManyMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when GET /products/:id endpoint is called', () => {
    it('responds 200 with a product when it exists', async () => {
      const product = { id: 7, name: 'Stand', price: 99, isInStock: true };
      findUniqueMock.mockImplementation(({ where: { id } }: any) =>
        id === 7 ? Promise.resolve(product) : Promise.resolve(null),
      );

      await request(app.getHttpServer())
        .get('/products/7')
        .expect(200)
        .expect(product);

      expect(findUniqueMock).toHaveBeenCalledTimes(1);
    });

    it('responds 404 when product does not exist', async () => {
      findUniqueMock.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).get('/products/999').expect(404);
    });

    it('responds 400 when id is not a number (ParseIntPipe)', async () => {
      await request(app.getHttpServer()).get('/products/abc').expect(400);

      expect(findUniqueMock).not.toHaveBeenCalled();
    });
  });

  describe('when PATCH /products/:id endpoint is called', () => {
    it('responds 200 with updated product when payload is valid', async () => {
      const updated = { id: 5, name: 'New Name', price: 120, isInStock: false };
      updateMock.mockResolvedValueOnce(updated);

      await request(app.getHttpServer())
        .patch('/products/5')
        .send({ name: 'New Name', price: 120, isInStock: false })
        .expect(200)
        .expect(updated);

      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { name: 'New Name', price: 120, isInStock: false },
      });
    });

    it('responds 400 when id is not a number', async () => {
      await request(app.getHttpServer())
        .patch('/products/xyz')
        .send({ name: 'X' })
        .expect(400);

      expect(updateMock).not.toHaveBeenCalled();
    });

    it('responds 400 when payload has wrong types', async () => {
      await request(app.getHttpServer())
        .patch('/products/5')
        .send({ price: '10' })
        .expect(400);

      await request(app.getHttpServer())
        .patch('/products/5')
        .send({ isInStock: 'true' })
        .expect(400);

      expect(updateMock).not.toHaveBeenCalled();
    });

    it('responds 400 when payload has extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .patch('/products/5')
        .send({ name: 'Ok', extra: 'nope' })
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
        .patch('/products/999')
        .send({ name: 'Anything' })
        .expect(404);
    });
  });

  describe('when DELETE /products/:id endpoint', () => {
    it('responds 200 on successful deletion', async () => {
      deleteMock.mockResolvedValueOnce({ id: 1 });

      await request(app.getHttpServer()).delete('/products/1').expect(200);

      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(deleteMock).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('responds 400 when id is not a number', async () => {
      await request(app.getHttpServer()).delete('/products/abc').expect(400);

      expect(deleteMock).not.toHaveBeenCalled();
    });

    it('responds 404 when Prisma reports RecordDoesNotExist on update)', async () => {
      deleteMock.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: PrismaError.RecordDoesNotExist,
          clientVersion: Prisma.prismaVersion.client,
        }),
      );

      await request(app.getHttpServer()).delete('/products/999').expect(404);
    });
  });
});
