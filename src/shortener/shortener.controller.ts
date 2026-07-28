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

    const response = await this.shortnerService.create(
      body['original_url'],
      url,
    );

    if (response.statusCode && response.statusCode >= 400) {
      return res
        .status(response.statusCode)
        .json({ status_code: response.statusCode, error: response.error });
    }

    return res.status(response.statusCode).json({
      status_code: response.statusCode,
      code: response.code,
      original_url: response.original_url,
      short_url: response.short_url,
      expires_at: response.expires_at,
      created_at: response.created_at,
      updated_at: response.updated_at,
    });
  }

  @Get('/:code')
  async getShortener(@Res() res: Response, @Param() params: Code) {
    const result = await this.shortnerService.read(params['code']);

    if (result.statusCode && result.statusCode >= 400) {
      return res
        .status(result.statusCode)
        .json({ status_code: result.statusCode, error: result.error });
    }

    if (result.statusCode === 302 && result.redirect) {
      return res.redirect(result.redirect);
    }
  }

  @Put('/:code')
  async updateShortener(
    @Res() res: Response,
    @Body() body: CreateBody,
    @Param() params: Code,
  ) {
    const response = await this.shortnerService.update(
      body['original_url'],
      params['code'],
    );

    if ((response.statusCode && response.statusCode >= 400) || response.error) {
      return res
        .status(response.statusCode)
        .json({ status_code: response.statusCode, error: response.error });
    }

    return res.status(response.statusCode).json({
      status_code: response.statusCode,
      code: response.code,
      original_url: response.original_url,
      short_url: response.short_url,
    });
  }

  @Delete('/:code')
  async deleteShortener(@Res() res: Response, @Param() params: Code) {
    const response = await this.shortnerService.delete(params['code']);

    if ((response.statusCode && response.statusCode >= 400) || response.error) {
      return res
        .status(response.statusCode)
        .json({ status_code: response.statusCode, error: response.error });
    }

    return res.status(response.statusCode).json({
      status_code: response.statusCode,
      message: response.message,
    });
  }

  @Get('/statistics/:code')
  async getStatistics(@Res() res: Response, @Param() params: Code) {
    const response = await this.shortnerService.statistics(params['code']);

    if ((response.statusCode && response.statusCode >= 400) || response.error) {
      return res
        .status(response.statusCode)
        .json({ status_code: response.statusCode, error: response.error });
    }

    return res.status(response.statusCode).json({
      status_code: response.statusCode,
      code: response.code,
      original_url: response.original_url,
      short_url: response.short_url,
      clicks: response.clicks,
      expires_at: response.expires_at,
      created_at: response.created_at,
      updated_at: response.updated_at,
    });
  }
}
