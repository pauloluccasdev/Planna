import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReorderContentPartsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  partIds!: string[];
}
