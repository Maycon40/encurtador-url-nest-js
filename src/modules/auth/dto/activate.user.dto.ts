import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class ActivateUserDto {
  @ApiProperty({
    description: 'Código de ativação do usuário',
  })
  @IsString({ message: 'Code must be a string' })
  @IsNotEmpty({ message: 'Code is required' })
  @MinLength(6, { message: 'Code must be at least 6 characters' })
  @MaxLength(6, { message: 'Code must be at most 6 characters' })
  code: string;
}
