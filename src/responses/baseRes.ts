import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BaseRes {
  @Field(() => String)
  status: 'success' | 'error';

  @Field(() => String)
  message: string;
}
