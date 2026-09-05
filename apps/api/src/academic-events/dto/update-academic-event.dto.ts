import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EventContentsStatus } from '../../generated/prisma/enums.js';

export class UpdateAcademicEventDto {
  @IsOptional()
  @IsUUID()
  eventTypeId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  startsAt?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  endsAt?: string | null;

  @IsOptional()
  @IsEnum(EventContentsStatus)
  contentsStatus?: EventContentsStatus;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  contentIds?: string[];
}
