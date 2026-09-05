import { IsISO8601, IsInt, Min } from 'class-validator';

export class UpdateReplanningSuggestionDto {
  @IsInt()
  @Min(1)
  revision!: number;

  @IsISO8601({ strict: true })
  startsAt!: string;

  @IsISO8601({ strict: true })
  endsAt!: string;
}
