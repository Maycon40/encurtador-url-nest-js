import { Controller, Get } from '@nestjs/common';

import { StatusService } from './status.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class StatusController {
  constructor(private statusService: StatusService) {}

  @Get('/')
  home() {
    return 'Welcome to URL Shortener';
  }

  @Get('/api/v1/status')
  @ApiOperation({ summary: 'Get the health status of the application' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
  })
  async status() {
    return await this.statusService.healthCheck();
  }
}
