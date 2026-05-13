import { IsString, IsEnum, IsBoolean, IsOptional, IsInt, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransferPriority, TransportType, TransferStatus } from '@prisma/client';

export class CreateTransferDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiProperty() @IsString() bedNumber: string;
  @ApiProperty() @IsString() floor: string;
  @ApiProperty() @IsString() origin: string;
  @ApiProperty() @IsString() destination: string;
  @ApiProperty({ enum: TransferPriority }) @IsEnum(TransferPriority) priority: TransferPriority;
  @ApiProperty({ enum: TransportType }) @IsEnum(TransportType) transportType: TransportType;
  @ApiPropertyOptional() @IsOptional() @IsString() requestedStudy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresOxygen?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) oxygenLiters?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTankId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) tankLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) manometer?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresDoctorCompanion?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorCompanionName?: string;
}

export class UpdateTransferDto {
  @ApiPropertyOptional() @IsOptional() @IsString() bedNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() floor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() origin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destination?: string;
  @ApiPropertyOptional({ enum: TransferPriority }) @IsOptional() @IsEnum(TransferPriority) priority?: TransferPriority;
  @ApiPropertyOptional({ enum: TransportType }) @IsOptional() @IsEnum(TransportType) transportType?: TransportType;
  @ApiPropertyOptional() @IsOptional() @IsString() requestedStudy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) oxygenLiters?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTankId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) tankLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) manometer?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorCompanionName?: string;
}

export class UpdateTransferStatusDto {
  @ApiProperty({ enum: TransferStatus })
  @IsEnum(TransferStatus)
  status: TransferStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cancellationReason?: string;
}

export class TransferFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() transporterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() origin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destination?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortOrder?: 'asc' | 'desc';
}