import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRetroactiveSessionDto {
  @IsUUID()
  contentId!: string;

  @IsOptional()
  @IsUUID()
  studyBlockId?: string;

  @IsISO8601({ strict: true })
  startedAt!: string;

  @IsISO8601({ strict: true })
  endedAt!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pomodoroBreakDurationSeconds?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  completedPartIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
