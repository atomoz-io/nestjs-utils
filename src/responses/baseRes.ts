import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BaseRes {
  @Field()
  status: string;
  @Field()
  message: string;
}
