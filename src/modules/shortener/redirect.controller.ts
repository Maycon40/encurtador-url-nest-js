import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';

import { ShortenerService } from './shortener.service';
import type { Code } from './shortener.controller';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller()
export class RedirectController {
  constructor(private shortnerService: ShortenerService) {}

  @Get('/:code')
  @ApiOperation({
    summary: 'Redirect to the original URL based on the short code',
  })
  @ApiParam({
    name: 'code',
    example: '12345678',
    description: 'The short code to redirect to the original URL',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirecting to the original URL',
  })
  @ApiResponse({
    status: 404,
    description: 'Short code not found',
  })
  @ApiResponse({
    status: 410,
    description: 'This link has expired!',
  })
  async redirect(@Res() res: Response, @Param() params: Code) {
    const result = await this.shortnerService.getRedirectUrl(params['code']);

    return res.redirect(result.redirect);
  }
}
