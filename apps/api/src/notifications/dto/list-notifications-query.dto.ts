import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { NotificationStatus } from '../../generated/prisma/enums.js';

export class ListNotificationsQueryDto {
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @IsUUID()
  cursor?: string;
}
