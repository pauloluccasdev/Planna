import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateAcademicPeriodDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number | null;

  @IsOptional()
  @Matches(datePattern)
  startsOn?: string | null;

  @IsOptional()
  @Matches(datePattern)
  endsOn?: string | null;
}
