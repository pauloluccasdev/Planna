import { IsInt, IsPositive } from 'class-validator';

export class UpdatePomodoroPreferenceDto {
  @IsInt()
  @IsPositive()
  focusSeconds!: number;

  @IsInt()
  @IsPositive()
  breakSeconds!: number;
}
