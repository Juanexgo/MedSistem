import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiProperty() @IsString() fullName: string;
  @ApiProperty() @IsString() bedNumber: string;
  @ApiProperty() @IsString() floor: string;
  @ApiPropertyOptional() @IsOptional() @IsString() medicalRecordNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdatePatientDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bedNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() floor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() medicalRecordNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
