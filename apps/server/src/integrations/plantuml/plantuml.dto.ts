import { IsString, MaxLength } from 'class-validator';

export class RenderPlantumlDto {
  @IsString()
  @MaxLength(50000)
  code: string;
}
