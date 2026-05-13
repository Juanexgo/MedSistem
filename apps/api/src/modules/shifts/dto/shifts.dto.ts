import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftType } from '@prisma/client';

export class StartShiftDto {
  @ApiProperty({ enum: ShiftType }) @IsEnum(ShiftType) type: ShiftType;
}

export class EndShiftDto {
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
}

export class ShiftHandoffDto {
  @ApiPropertyOptional() @IsOptional() @IsString() completedServices?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pendingServices?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientsInTransfer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() incompleteStudies?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() incidents?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lowOxygenTanks?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
  @ApiProperty() @IsUUID() receivedById: string;
}
