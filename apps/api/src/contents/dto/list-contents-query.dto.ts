import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RecordStatus } from '../../generated/prisma/enums.js';

export class ListContentsQueryDto {
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;
}
