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
import type { Response } from 'express';

import { ShortenerService } from './shortener.service';

interface Code {
  code: string;
}

interface CreateBody {
  original_url;
}

@Controller()
export class ShortenerController {
  constructor(private shortnerService: ShortenerService) {}

  @Get('/static/:code')
  getStaticShortener(@Req() req: Request, @Param() params: Code) {
    return this.shortnerService.static(req, params['code']);
  }

  @Get('/')
  home() {
    return 'Welcome to URL Shortener';
  }

  @Post('/shorten')
  postShortener(@Req() req: Request, @Body() body: CreateBody) {
    return this.shortnerService.create(req, body['original_url']);
  }

  @Get('/:code')
  async getShortener(@Res() res: Response, @Param() params: Code) {
    return await this.shortnerService.read(res, params['code']);
  }

  @Put('/:code')
  updateShortener(
    @Req() req: Request,
    @Body() body: CreateBody,
    @Param() params: Code,
  ) {
    return this.shortnerService.update(
      req,
      body['original_url'],
      params['code'],
    );
  }

  @Delete('/:code')
  deleteShortener(@Param() params: Code) {
    console.log("params", params)
    return this.shortnerService.delete(params['code']);
  }
}
