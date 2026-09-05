import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { AccountStatus } from '../../generated/prisma/enums.js';

export class ListAdminUsersQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
