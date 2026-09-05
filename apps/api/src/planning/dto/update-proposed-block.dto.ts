import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsISO8601,
  IsPositive,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateProposedBlockDto {
  @IsInt()
  @Min(1)
  revision!: number;

  @IsUUID()
  contentId!: string;

  @IsISO8601({ strict: true })
  startsAt!: string;

  @IsISO8601({ strict: true })
  endsAt!: string;

  @IsInt()
  @IsPositive()
  focusSeconds!: number;

  @IsInt()
  @IsPositive()
  breakSeconds!: number;

  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  partIds!: string[];
}
