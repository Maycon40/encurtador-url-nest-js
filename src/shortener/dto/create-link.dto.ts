import { IsString } from 'class-validator';

export class CreateLinkDto {
  @IsString()
  original_url: string;
}
