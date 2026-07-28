import {
  Controller,
  Req,
  Res,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import type { Response, Request } from 'express';

import { ShortenerService } from './shortener.service';

interface Code {
  code: string;
}

interface CreateBody {
  original_url: string;
}

@Controller()
export class ShortenerController {
  constructor(private shortnerService: ShortenerService) {}

  @Get('/')
  home() {
    return 'Welcome to URL Shortener';
  }

  @Post('/shorten')
  async postShortener(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: CreateBody,
  ) {
    const url = `${req.protocol}://${req.get('host')}`;

    const createdLink = await this.shortnerService.create(
      body['original_url'],
      url,
    );

    const statusCode = 201;

    return res.status(statusCode).json({
      status_code: statusCode,
      code: createdLink.code,
      original_url: createdLink.original_url,
      short_url: createdLink.short_url,
      clicks: createdLink.clicks,
      expires_at: createdLink.expires_at,
      created_at: createdLink.created_at,
      updated_at: createdLink.updated_at,
    });
  }

  @Get('/:code')
  async getShortener(@Res() res: Response, @Param() params: Code) {
    const result = await this.shortnerService.getRedirectUrl(params['code']);

    return res.redirect(result.redirect);
  }

  @Put('/:code')
  async updateShortener(
    @Res() res: Response,
    @Body() body: CreateBody,
    @Param() params: Code,
  ) {
    const updatedLink = await this.shortnerService.update(body, params['code']);

    const statusCode = 200;

    return res.status(statusCode).json({
      status_code: statusCode,
      code: updatedLink.code,
      original_url: updatedLink.original_url,
      short_url: updatedLink.short_url,
    });
  }

  @Delete('/:code')
  async deleteShortener(@Res() res: Response, @Param() params: Code) {
    const deletedLink = await this.shortnerService.delete(params['code']);

    const statusCode = 200;

    return res.status(statusCode).json({
      status_code: statusCode,
      code: deletedLink.code,
      original_url: deletedLink.original_url,
      short_url: deletedLink.short_url,
    });
  }

  @Get('/statistics/:code')
  async getStatistics(@Res() res: Response, @Param() params: Code) {
    const statistics = await this.shortnerService.statistics(params['code']);

    const statusCode = 200;

    return res.status(statusCode).json({
      status_code: statusCode,
      code: statistics.code,
      original_url: statistics.original_url,
      short_url: statistics.short_url,
      clicks: statistics.clicks,
      expires_at: statistics.expires_at,
      created_at: statistics.created_at,
      updated_at: statistics.updated_at,
    });
  }
}
