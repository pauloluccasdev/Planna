import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  academicPeriodId?: string;
}
