import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { hash, compare } from 'bcrypt';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const passwordInPlainText = 'StrongPassword123!';
  const saltRounds = 10;
  const hashedPassword = await hash(passwordInPlainText, saltRounds);

  const isPasswordMatching = await compare(passwordInPlainText, hashedPassword);
  console.log(isPasswordMatching); //true

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: configService.get('FRONTEND_URL'),
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
