import { ArrayUnique, IsArray, IsEnum, IsUUID } from 'class-validator';
import { EventContentsStatus } from '../../generated/prisma/enums.js';

export class SetAcademicEventContentsDto {
  @IsEnum(EventContentsStatus)
  contentsStatus!: EventContentsStatus;

  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  contentIds!: string[];
}
