import { ArrayMaxSize, IsArray, IsDateString, IsUUID } from 'class-validator';

export class CreatePlanningProposalDto {
  @IsDateString({ strict: true })
  periodStart!: string;

  @IsDateString({ strict: true })
  periodEnd!: string;

  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  courseIds!: string[];

  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  subjectIds!: string[];
}
