import { IsEnum, IsOptional } from 'class-validator';
import { RecordStatus } from '../../generated/prisma/enums.js';

export class ListCoursesQueryDto {
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
