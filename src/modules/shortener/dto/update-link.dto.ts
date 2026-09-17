import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class UpdateLinkDto {
  @ApiProperty({
    description: 'The custom code for the shortened URL',
    example: 'my-custom-code',
    required: false,
  })
  @IsString({ message: 'Code must be a string' })
  @IsOptional()
  code?: string;

  @ApiProperty({
    description: 'The original URL to be shortened',
    example: 'https://www.example.com/some/long/url',
    required: false,
  })
  @IsString({ message: 'Original URL must be a string' })
  @IsOptional()
  original_url?: string;

  @ApiProperty({
    description: 'The expiration date of the shortened URL',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsDate({ message: 'Expires at must be a valid date' })
  @IsOptional()
  expires_at?: Date;
}
