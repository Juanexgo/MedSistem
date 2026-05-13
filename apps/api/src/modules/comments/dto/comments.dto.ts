import { IsString, IsBoolean, IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CommentType {
  PATIENT_NOT_READY = 'PATIENT_NOT_READY',
  MISSING_OXYGEN_TANK = 'MISSING_OXYGEN_TANK',
  DOCTOR_ABSENT = 'DOCTOR_ABSENT',
  ELEVATOR_SATURATED = 'ELEVATOR_SATURATED',
  DELAY = 'DELAY',
  GENERAL = 'GENERAL',
  INCIDENT = 'INCIDENT',
}

export enum CommentSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum CommentStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class CreateCommentDto {
  @ApiProperty() @IsString() content: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isImportant?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID() transferRequestId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ enum: CommentType, default: CommentType.GENERAL }) @IsOptional() @IsEnum(CommentType) type?: CommentType;
  @ApiPropertyOptional({ enum: CommentSeverity, default: CommentSeverity.INFO }) @IsOptional() @IsEnum(CommentSeverity) severity?: CommentSeverity;
}

export class ResolveCommentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() resolution?: string;
}

export class QueryCommentsDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(CommentType) type?: CommentType;
  @ApiPropertyOptional() @IsOptional() @IsEnum(CommentSeverity) severity?: CommentSeverity;
  @ApiPropertyOptional() @IsOptional() @IsEnum(CommentStatus) status?: CommentStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() transferRequestId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() toDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isImportant?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() page?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() limit?: string;
}
