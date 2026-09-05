import { IsEmail, MaxLength } from 'class-validator';

export class PasswordRecoveryDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
