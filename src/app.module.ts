import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticlesModule } from './articles/articles.module';
import { ConfigModule } from '@nestjs/config';
import { TasksModule } from './tasks/tasks.module';
import * as Joi from 'joi';
import { ProductsModule } from './products/products.module';
import { AuthenticationModule } from './authentication/authentication.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
      }),
    }),
    ArticlesModule,
    TasksModule,
    ProductsModule,
    AuthenticationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
