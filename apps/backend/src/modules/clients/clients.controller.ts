import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Request,
} from '@nestjs/common';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  async create(@Request() req, @Body() body: any) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.clientsService.create(orgId, body);
  }

  @Get()
  async findAll(@Request() req) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.clientsService.findAll(orgId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.clientsService.findOne(orgId, id);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() body: any) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.clientsService.update(orgId, id, body);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    const orgId = req.user?.orgId || 'demo-org';
    return this.clientsService.delete(orgId, id);
  }
}
