import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaError } from '../database/prisma-error.enum';

describe('TasksController (HTTP integration)', () => {
  let app: INestApplication;

  const createMock = jest.fn();
  const findManyMock = jest.fn();
  const findUniqueMock = jest.fn();
  const updateMock = jest.fn();
  const deleteMock = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: {
            task: {
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
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  describe('when POST /tasks endpoint is called', () => {
    it('responds 201 with created task when payload is valid', async () => {
      const payload = {
        title: 'Do dishes',
        description: 'Kitchen sink',
        isCompleted: true,
      };
      const created = { id: 101, ...payload };
      createMock.mockResolvedValueOnce(created);

      await request(app.getHttpServer())
        .post('/tasks')
        .send(payload)
        .expect(201)
        .expect(created);

      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith({ data: payload });
    });

    it('responds 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .send({ description: 'Only desc' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/tasks')
        .send({ title: 'Only title' })
        .expect(400);

      expect(createMock).not.toHaveBeenCalled();
    });

    it('responds 400 when payload has wrong types', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .send({ title: 123, description: 'ok' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/tasks')
        .send({ title: 'ok', description: 123 })
        .expect(400);

      await request(app.getHttpServer())
        .post('/tasks')
        .send({ title: 'ok', description: 'ok', isCompleted: 'true' })
        .expect(400);

      expect(createMock).not.toHaveBeenCalled();
    });

    it('responds 400 when payload has extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .send({ title: 'ok', description: 'ok', extra: 'nope' })
        .expect(400);

      expect(createMock).not.toHaveBeenCalled();
    });
  });

  describe('when GET /tasks endpoint is called', () => {
    it('responds 200 with a list of tasks', async () => {
      const list = [
        { id: 1, title: 'A', description: 'a', isCompleted: false },
        { id: 2, title: 'B', description: 'b', isCompleted: true },
      ];
      findManyMock.mockResolvedValueOnce(list);

      await request(app.getHttpServer()).get('/tasks').expect(200).expect(list);

      expect(findManyMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when GET /tasks/:id endpoint is called', () => {
    it('responds 200 with a task when it exists', async () => {
      const task = {
        id: 7,
        title: 'Refactor',
        description: 'service',
        isCompleted: false,
      };
      findUniqueMock.mockImplementation(({ where: { id } }: any) =>
        id === 7 ? Promise.resolve(task) : Promise.resolve(null),
      );

      await request(app.getHttpServer())
        .get('/tasks/7')
        .expect(200)
        .expect(task);

      expect(findUniqueMock).toHaveBeenCalledTimes(1);
    });

    it('responds 404 when task does not exist', async () => {
      findUniqueMock.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).get('/tasks/999').expect(404);
    });

    it('responds 400 when id is not a number (ParseIntPipe)', async () => {
      await request(app.getHttpServer()).get('/tasks/abc').expect(400);

      expect(findUniqueMock).not.toHaveBeenCalled();
    });
  });

  describe('when PATCH /tasks/:id endpoint is called', () => {
    it('responds 200 with updated task when payload is valid', async () => {
      const updated = {
        id: 5,
        title: 'New',
        description: 'Updated',
        isCompleted: true,
      };
      updateMock.mockResolvedValueOnce(updated);

      await request(app.getHttpServer())
        .patch('/tasks/5')
        .send({ title: 'New', description: 'Updated', isCompleted: true })
        .expect(200)
        .expect(updated);

      expect(updateMock).toHaveBeenCalledTimes(1);
      // Service assigns id: undefined in data spread to prevent id update
      expect(updateMock).toHaveBeenCalledWith({
        data: {
          title: 'New',
          description: 'Updated',
          isCompleted: true,
          id: undefined,
        },
        where: { id: 5 },
      });
    });

    it('responds 400 when id is not a number', async () => {
      await request(app.getHttpServer())
        .patch('/tasks/xyz')
        .send({ title: 'X' })
        .expect(400);

      expect(updateMock).not.toHaveBeenCalled();
    });

    it('responds 400 when payload has wrong types', async () => {
      await request(app.getHttpServer())
        .patch('/tasks/5')
        .send({ title: 123 })
        .expect(400);

      await request(app.getHttpServer())
        .patch('/tasks/5')
        .send({ description: 123 })
        .expect(400);

      expect(updateMock).not.toHaveBeenCalled();
    });

    it('responds 400 when payload has extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .patch('/tasks/5')
        .send({ title: 'Ok', extra: 'nope' })
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
        .patch('/tasks/999')
        .send({ title: 'Anything' })
        .expect(404);
    });
  });

  describe('when DELETE /tasks/:id endpoint is called', () => {
    it('responds 200 on successful deletion', async () => {
      deleteMock.mockResolvedValueOnce({ id: 1 });

      await request(app.getHttpServer()).delete('/tasks/1').expect(200);

      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(deleteMock).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('responds 400 when id is not a number', async () => {
      await request(app.getHttpServer()).delete('/tasks/abc').expect(400);

      expect(deleteMock).not.toHaveBeenCalled();
    });

    it('responds 404 when Prisma reports RecordDoesNotExist on delete', async () => {
      deleteMock.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: PrismaError.RecordDoesNotExist,
          clientVersion: Prisma.prismaVersion.client,
        }),
      );

      await request(app.getHttpServer()).delete('/tasks/999').expect(404);
    });
  });
});
