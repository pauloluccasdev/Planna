import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RecordStatus } from '../../generated/prisma/enums.js';

export class ListSubjectsQueryDto {
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;

  @IsOptional()
  @IsUUID()
  academicPeriodId?: string;
}
