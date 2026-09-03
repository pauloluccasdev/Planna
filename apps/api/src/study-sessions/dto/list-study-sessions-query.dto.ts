import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { SessionKind } from '../../generated/prisma/enums.js';

export class ListStudySessionsQueryDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @IsOptional()
  @IsUUID()
  contentId?: string;

  @IsOptional()
  @IsEnum(SessionKind)
  kind?: SessionKind;
}
