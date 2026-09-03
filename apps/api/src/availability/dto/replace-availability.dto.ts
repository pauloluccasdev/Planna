import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const localTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export class AvailabilityIntervalDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @Matches(localTimePattern)
  startLocalTime!: string;

  @Matches(localTimePattern)
  endLocalTime!: string;
}

export class ReplaceAvailabilityDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityIntervalDto)
  intervals!: AvailabilityIntervalDto[];
}
