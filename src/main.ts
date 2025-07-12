import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { hash, compare } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

const secret = 'secret-string';

const twelveHours = 43200;

const jwtSecret = new JwtService({
  signOptions: {
    expiresIn: twelveHours,
  },
});

const dataToEncode = {
  userId: 1,
};

const token = jwtSecret.sign(dataToEncode, {
  secret,
});
console.log(token);

const decodedData = jwtSecret.verify(token, {
  secret,
});
console.log(decodedData.userId);

async function bootstrap() {
  const passwordInPlainText = 'StrongPassword123!';
  const saltRounds = 10;
  const hashedPassword = await hash(passwordInPlainText, saltRounds);
  console.log(hashedPassword);

  const isPasswordMatching = await compare(passwordInPlainText, hashedPassword);
  console.log(isPasswordMatching); //true

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
