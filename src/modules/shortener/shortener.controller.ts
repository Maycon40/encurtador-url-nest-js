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
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { ShortenerService } from './shortener.service';
import type { AuthenticatedRequest } from '../auth/auth.controller';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CreateLinkDto } from './dto/create-link.dto';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { OptionalAuthGuard } from 'src/common/guards/optional-auth.guard';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export interface Code {
  code: string;
}

@Controller('/api/v1/links')
export class ShortenerController {
  constructor(private shortnerService: ShortenerService) {}

  @Get('/')
  @ApiOperation({
    summary: 'Get all shortened links for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'List of shortened links' })
  @ApiResponse({ status: 401, description: 'User not authenticated.' })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission required.',
  })
  @ApiResponse({
    status: 404,
    description: 'Could not find any shortened link!',
  })
  @UseGuards(AuthGuard, AuthorizationGuard('read:link:all'))
  async getShortener(@Res() res: Response, @Req() req: AuthenticatedRequest) {
    const userId: string = req.user?.id ?? '';
    const allLinks = await this.shortnerService.findAll(userId);

    const statusCode = 200;

    const response = allLinks?.map((link) => ({
      status_code: statusCode,
      code: link.code,
      original_url: link.original_url,
      short_url: link.short_url,
    }));

    return res.status(statusCode).json(response);
  }

  @Post('/')
  @ApiOperation({ summary: 'Create a new shortened link' })
  @ApiResponse({
    status: 201,
    description: 'Shortened link created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'User not authenticated.' })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission required.',
  })
  @UseGuards(OptionalAuthGuard)
  async postShortener(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Body() body: CreateLinkDto,
  ) {
    const url = `${req.protocol}://${req.get('host')}`;
    const userId = req.payload?.id ?? null;

    const createdLink = await this.shortnerService.create(
      userId,
      body['original_url'],
      url,
    );

    const statusCode = 201;

    return res.status(statusCode).json({
      id: createdLink.id,
      user_id: createdLink.user_id,
      code: createdLink.code,
      claim_token: createdLink.claim_token,
      original_url: createdLink.original_url,
      short_url: createdLink.short_url,
      clicks: createdLink.clicks,
      expires_at: createdLink.expires_at,
      created_at: createdLink.created_at,
      updated_at: createdLink.updated_at,
      status_code: statusCode,
    });
  }

  @Get('/:code')
  @ApiOperation({ summary: 'Get statistics for a shortened link' })
  @ApiParam({
    name: 'code',
    example: '12345678',
    description: 'The unique code of the shortened link to get statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics for the shortened link retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Shortened link not found' })
  @ApiResponse({ status: 401, description: 'User not authenticated.' })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission required.',
  })
  @UseGuards(AuthGuard, AuthorizationGuard('read:link'))
  async getStatistics(
    @Res() res: Response,
    @Param() params: Code,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId: string = req.user?.id ?? '';

    const statistics = await this.shortnerService.statistics(
      userId,
      params['code'],
    );

    const statusCode = 200;

    return res.status(statusCode).json({
      code: statistics.code,
      original_url: statistics.original_url,
      short_url: statistics.short_url,
      clicks: statistics.clicks,
      expires_at: statistics.expires_at,
      created_at: statistics.created_at,
      updated_at: statistics.updated_at,
      status_code: statusCode,
    });
  }

  @Put('/:code')
  @ApiOperation({ summary: 'Update an existing shortened link' })
  @ApiParam({
    name: 'code',
    example: '12345678',
    description: 'The unique code of the shortened link to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Shortened link updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Shortened link not found' })
  @ApiResponse({ status: 401, description: 'User not authenticated.' })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission required.',
  })
  @UseGuards(AuthGuard, AuthorizationGuard('update:link'))
  async updateShortener(
    @Res() res: Response,
    @Body() body: CreateLinkDto,
    @Param() params: Code,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId: string = req.user?.id ?? '';

    const updatedLink = await this.shortnerService.update(
      userId,
      params['code'],
      body,
    );

    const statusCode = 200;

    return res.status(statusCode).json({
      status_code: statusCode,
      code: updatedLink.code,
      original_url: updatedLink.original_url,
      short_url: updatedLink.short_url,
      updated_at: updatedLink.updated_at,
      created_at: updatedLink.created_at,
    });
  }

  @Delete('/:code')
  @ApiOperation({ summary: 'Delete an existing shortened link' })
  @ApiParam({
    name: 'code',
    example: '12345678',
    description: 'The unique code of the shortened link to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Shortened link deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Shortened link not found' })
  @ApiResponse({ status: 401, description: 'User not authenticated.' })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission required.',
  })
  @UseGuards(AuthGuard, AuthorizationGuard('delete:link'))
  async deleteShortener(
    @Res() res: Response,
    @Param() params: Code,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId: string = req.user?.id ?? '';

    const deletedLink = await this.shortnerService.delete(
      userId,
      params['code'],
    );

    const statusCode = 200;

    return res.status(statusCode).json({
      status_code: statusCode,
      code: deletedLink.code,
      original_url: deletedLink.original_url,
      short_url: deletedLink.short_url,
    });
  }
}
