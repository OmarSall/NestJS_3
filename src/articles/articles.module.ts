import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticleController } from './articles.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ArticleController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
