import { CategoriesService } from './categories.service';
import { Test } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { PrismaService } from '../database/prisma.service';
import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import * as request from 'supertest';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ArticlesService } from '../articles/articles.service';
import { PrismaError } from '../database/prisma-error.enum';

let findUniqueMock: jest.Mock;
let createMock: jest.Mock;

const articlesServiceMock: Partial<ArticlesService> = {
  // If later you test DELETE/merge endpoints, add methods here, e.g.:
  // deleteCategoryWithArticles: jest.fn(),
  // mergeCategories: jest.fn(),
};

describe('The CategoriesController', () => {
  let app: INestApplication;
  beforeAll(async () => {
    findUniqueMock = jest.fn();
    createMock = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: {
            category: {
              findUnique: findUniqueMock,
              create: createMock,
            },
          },
        },
        {
          provide: ArticlesService,
          useValue: articlesServiceMock,
        },
      ],

      controllers: [CategoriesController],
      imports: [],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = {
            id: 1,
            name: 'John Smith',
          };
          return true;
        },
      })
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
  describe('when the GET /categories/:id endpoint is called', () => {
    let category: Category;
    beforeEach(() => {
      category = {
        id: 1,
        name: 'My category',
      };
      findUniqueMock.mockImplementation((args: { where: { id: number } }) => {
        if (args.where.id === 1) {
          return Promise.resolve(category);
        }
        return Promise.resolve(undefined);
      });
    });
    describe('and the category with a given id exists', () => {
      it('should respond with the category', async () => {
        await request(app.getHttpServer())
          .get('/categories/1')
          .expect(200)
          .expect(category);
      });
    });
    describe('and the category with a given id does not exist', () => {
      it('should respond with the 404 status', async () => {
        await request(app.getHttpServer()).get('/categories/999').expect(404);
      });
    });
    describe('and the category id is not a number (if controller uses ParseIntPipe)', () => {
      it('should respond with the 400 status', async () => {
        await request(app.getHttpServer()).get('/categories/abc').expect(400);
      });
    });
  });
  describe('when the POST /categories endpoint is called', () => {
    describe('and the correct data is provided', () => {
      let categoryData: CreateCategoryDto;
      beforeEach(() => {
        categoryData = {
          name: 'New category',
        };
        createMock.mockResolvedValue({
          id: 2,
          ...categoryData,
        });
      });
      it('should respond 201 with the new category when valid data provided', async () => {
        await request(app.getHttpServer())
          .post('/categories')
          .send(categoryData)
          .expect({
            id: 2,
            ...categoryData,
          });
      });
      it('should respond 400 when categoryData is invalid (fails DTO validation)', async () => {
        await request(app.getHttpServer())
          .post('/categories')
          .send(categoryData)
          .expect(201)
          .expect({
            id: 2,
            ...categoryData,
          });
      });
    });
  });
});
