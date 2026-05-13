import { IsString, IsInt, IsEnum, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OxygenTankStatus } from '@prisma/client';

export class CreateOxygenTankDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsInt() @Min(0) level: number;
  @ApiPropertyOptional({ enum: OxygenTankStatus }) @IsOptional() @IsEnum(OxygenTankStatus) status?: OxygenTankStatus;
  @ApiProperty() @IsInt() @Min(0) psi: number;
  @ApiProperty() @IsInt() @Min(0) capacity: number;
  @ApiProperty() @IsString() location: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateOxygenTankDto {
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) level?: number;
  @ApiPropertyOptional({ enum: OxygenTankStatus }) @IsOptional() @IsEnum(OxygenTankStatus) status?: OxygenTankStatus;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) psi?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateTankLevelDto {
  @ApiProperty() @IsInt() @Min(0) level: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) psi?: number;
  @ApiPropertyOptional({ enum: OxygenTankStatus }) @IsOptional() @IsEnum(OxygenTankStatus) status?: OxygenTankStatus;
}

export class TankFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() isAvailable?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}
