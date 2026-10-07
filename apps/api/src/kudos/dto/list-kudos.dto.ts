import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/** Page-number query accepted by GET /kudos; the first page is the default. */
export class ListKudosDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
