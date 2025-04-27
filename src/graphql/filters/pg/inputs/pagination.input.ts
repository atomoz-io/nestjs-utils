import { Field, InputType, Int } from '@nestjs/graphql';
import { Min } from 'class-validator';

@InputType({ description: 'Pagination generic input' })
export class PaginationInput {
  @Field(() => Int, { description: 'The page number' })
  @Min(1)
  page: number;

  @Field(() => Int, { description: 'The number of items per page' })
  @Min(1)
  count: number;
}
