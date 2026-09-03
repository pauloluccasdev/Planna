import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';

export class CreateStudyBlockDto {
  @IsUUID()
  contentId!: string;

  @IsISO8601({ strict: true })
  startsAt!: string;

  @IsISO8601({ strict: true })
  endsAt!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  partIds?: string[];

  @IsOptional()
  @IsInt()
  @IsPositive()
  focusSeconds?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  breakSeconds?: number;
}
