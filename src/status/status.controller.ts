import { Controller, Get } from '@nestjs/common';

import { StatusService } from './status.service'

@Controller()
export class StatusController {
  constructor(private statusService: StatusService) {}

  @Get('/api/v1/status')
  async status() {
    return await this.statusService.healthCheck();
  }
}
