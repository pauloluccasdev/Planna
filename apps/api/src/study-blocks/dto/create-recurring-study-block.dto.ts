import { Matches } from 'class-validator';
import { CreateStudyBlockDto } from './create-study-block.dto.js';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class CreateRecurringStudyBlockDto extends CreateStudyBlockDto {
  @Matches(datePattern)
  repeatUntil!: string;
}
