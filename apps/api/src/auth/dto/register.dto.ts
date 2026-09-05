import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[\p{L}\p{N}._-]+$/u, {
    message: 'Use apenas letras, números, ponto, hífen ou sublinhado.',
  })
  username!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
