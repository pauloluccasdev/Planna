import { IsEnum, IsOptional } from 'class-validator';
import { RecordStatus } from '../../generated/prisma/enums.js';

export class ListContentsQueryDto {
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
