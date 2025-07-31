import { Module } from '@nestjs/common';
import { ProfileImageService } from './profile-image.service';
import { ProfileImageController } from './profile-image.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ProfileImageService],
  controllers: [ProfileImageController],
})
export class ProfileImageModule {}
