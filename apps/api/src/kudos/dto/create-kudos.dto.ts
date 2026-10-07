import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateKudosDto {
  @IsString()
  @IsNotEmpty()
  recipientId!: string;

  @IsString()
  @Matches(/\S/, { message: 'message must not be blank' })
  @MaxLength(280)
  message!: string;
}
