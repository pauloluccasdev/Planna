import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class PushSubscriptionKeysDto {
  @IsString()
  @MaxLength(512)
  p256dh!: string;

  @IsString()
  @MaxLength(512)
  auth!: string;
}

export class CreatePushSubscriptionDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  endpoint!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  expirationTime?: number | null;

  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;
}
