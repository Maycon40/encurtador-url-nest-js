import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateLinkDto {
  @ApiProperty({
    description: 'The original URL to be shortened',
    example: 'https://www.example.com/some/long/url',
  })
  @IsString({ message: 'original_url must be a string' })
  @IsUrl()
  @IsNotEmpty({ message: 'original_url is required' })
  original_url: string;
}
