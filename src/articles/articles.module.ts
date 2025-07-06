import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticleController } from './articles.controller';
import { UniqueIdModule } from '../unique-id/unique-id.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [UniqueIdModule, DatabaseModule],
  controllers: [ArticleController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
