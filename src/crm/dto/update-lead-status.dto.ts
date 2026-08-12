import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus, { message: 'Status must be NEW, CONTACTED, CONVERTED, or CLOSED' })
  @IsOptional()
  status?: LeadStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
