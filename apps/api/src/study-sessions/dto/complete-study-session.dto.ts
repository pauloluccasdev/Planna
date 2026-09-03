import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CompleteStudySessionDto {
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
