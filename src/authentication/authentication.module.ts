import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [AuthenticationController],
  providers: [AuthenticationService],
})
export class AuthenticationModule {}
