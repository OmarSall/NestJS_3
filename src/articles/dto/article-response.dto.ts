import { Article } from '@prisma/client';
import { Exclude, Expose, Transform } from 'class-transformer';

export class ArticleResponseDto implements Article {
  id: number;

  @Transform(({ value }) => {
    if (!value) {
      return value;
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  })
  title: string;

  @Transform(({ value }) => {
    if (!value) {
      return value;
    }
    return value.length > 100 ? value.slice(0, 100) + '...' : value;
  })
  @Expose()
  text: string | null;

  @Transform(({ obj }) => obj.text?.length ?? 0)
  @Expose()
  textLength: number;

  urlSlug: string;
  upvotes: number;
  authorId: number;
}
