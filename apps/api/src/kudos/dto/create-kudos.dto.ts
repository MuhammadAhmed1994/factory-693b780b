import { IsString, MaxLength, Matches } from 'class-validator';

/** Request body used to create a kudos item. */
export class CreateKudosDto {
  @IsString()
  @Matches(/\S/, { message: 'message must not be blank' })
  @MaxLength(280)
  message!: string;

  @IsString()
  @Matches(/\S/, { message: 'recipientId must not be blank' })
  recipientId!: string;
}
