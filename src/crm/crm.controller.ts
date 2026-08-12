import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CrmService } from './crm.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeadStatus } from '@prisma/client';

@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  // Public endpoint for visitors to submit blog inquiries
  @Post('leads')
  async createLead(@Body() createLeadDto: CreateLeadDto) {
    return this.crmService.createLead(createLeadDto);
  }

  // Admin-only endpoint to view CRM lead pipeline
  @UseGuards(JwtAuthGuard)
  @Get('leads')
  async findAllLeads(@Query('status') status?: LeadStatus) {
    return this.crmService.findAllLeads(status);
  }

  // Admin-only endpoint to update lead status/notes
  @UseGuards(JwtAuthGuard)
  @Patch('leads/:id')
  async updateLead(
    @Param('id') id: string,
    @Body() updateLeadStatusDto: UpdateLeadStatusDto,
  ) {
    return this.crmService.updateLead(id, updateLeadStatusDto);
  }

  // Admin-only endpoint to remove lead
  @UseGuards(JwtAuthGuard)
  @Delete('leads/:id')
  async deleteLead(@Param('id') id: string) {
    return this.crmService.deleteLead(id);
  }
}
