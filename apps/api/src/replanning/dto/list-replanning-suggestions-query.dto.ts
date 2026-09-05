import { IsEnum, IsOptional } from 'class-validator';
import { SuggestionStatus } from '../../generated/prisma/enums.js';

export class ListReplanningSuggestionsQueryDto {
  @IsOptional()
  @IsEnum(SuggestionStatus)
  status?: SuggestionStatus;
}
