import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class StartUnplannedSessionDto {
  @IsUUID()
  contentId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
