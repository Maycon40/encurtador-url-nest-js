import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { ActivationService } from './activation.service';
import { UpdateUserDto } from './dto/update.user.dto';
import { ActivateUserDto } from './dto/activate.user.dto';
import { UserIdDto } from './dto/user.id.dto';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { User } from './repositories/users.repository';
import { GoogleOAuthService } from './google-oauth.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EmailDto } from './dto/email.dto';

export interface UserId {
  user_id: string;
}

export interface AuthenticatedRequest extends Request {
  payload: {
    id: string;
    email: string;
    sub: string;
    iat: number;
    exp: number;
  };
  user: User;
}

export interface RefreshRequest extends AuthenticatedRequest {
  refreshToken: string;
  sessionId: string;
}

@ApiTags('Authentication')
@Controller('/api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly activationService: ActivationService,
    private readonly googleOAuthService: GoogleOAuthService,
  ) {}

  @Post('/login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Successful login' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'User account is not activated' })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to login',
  })
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.validateAndLoginLocal(
      dto.email,
      dto.password,
    );

    const statusCode = 200;

    return res.status(statusCode).json({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        provider: result.user.provider,
        created_at: result.user.created_at,
        updated_at: result.user.updated_at,
      },
      status_code: statusCode,
    });
  }

  @Post('/register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Email is already registered' })
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const createdUser = await this.authService.registerLocal(dto);

    const { code } = await this.activationService.generateActivationCode(
      createdUser.id,
    );

    await this.activationService.sendActivationCode(createdUser, code);

    const statusCode = 201;

    return res.status(statusCode).json({
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      provider: createdUser.provider,
      created_at: createdUser.created_at,
      updated_at: createdUser.updated_at,
      status_code: statusCode,
    });
  }

  @Post('/activations')
  async resendActivationCode(@Body() dto: EmailDto, @Res() res: Response) {
    const accountActivation = await this.activationService.resendActivationCode(
      dto.email,
    );

    const statusCode = 200;

    return res.status(statusCode).json({
      id: accountActivation.id,
      user_id: accountActivation.user_id,
      attempts: accountActivation.attempts,
      expires_at: accountActivation.expires_at,
      created_at: accountActivation.created_at,
      updated_at: accountActivation.updated_at,
      status_code: statusCode,
    });
  }

  @Patch('/activations/:email')
  @ApiOperation({ summary: 'Activate user account' })
  @ApiParam({
    name: 'email',
    example: 'johndoe@example.com',
  })
  @ApiResponse({
    status: 200,
    description: 'User account activated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid activation code' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Activation code has expired' })
  @ApiResponse({
    status: 400,
    description: 'Activation code has already been used',
  })
  @ApiResponse({ status: 400, description: 'User cannot be activated' })
  async activateProfile(
    @Param() params: EmailDto,
    @Body() dto: ActivateUserDto,
    @Res() res: Response,
  ) {
    const accountActivation = await this.activationService.activateAccount(
      params.email,
      dto.code,
    );

    const statusCode = 200;

    return res.status(statusCode).json({
      id: accountActivation.id,
      user_id: accountActivation.user_id,
      attempts: accountActivation.attempts,
      expires_at: accountActivation.expires_at,
      created_at: accountActivation.created_at,
      updated_at: accountActivation.updated_at,
      status_code: statusCode,
    });
  }

  @Post('/refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed successfully',
  })
  @ApiResponse({ status: 401, description: 'No token provided' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({ status: 401, description: 'Expired Token' })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to refresh token',
  })
  @UseGuards(RefreshAuthGuard, AuthorizationGuard('update:session'))
  async refresh(@Req() req: RefreshRequest, @Res() res: Response) {
    const refreshToken = req.refreshToken;
    const user = req.user;
    const sessionId = req.sessionId;

    const updatedTokens = await this.authService.refreshToken(
      user,
      sessionId,
      refreshToken,
    );

    const statusCode = 200;

    return res.status(statusCode).json({
      access_token: updatedTokens.access_token,
      refresh_token: updatedTokens.refresh_token,
      expires_in: updatedTokens.expires_in,
      status_code: statusCode,
    });
  }

  @Post('/logout')
  @ApiOperation({ summary: 'Logout user and invalidate refresh token' })
  @ApiResponse({ status: 204, description: 'User logged out successfully' })
  @ApiResponse({ status: 401, description: 'No token provided' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @UseGuards(RefreshAuthGuard)
  async logout(@Req() req: RefreshRequest, @Res() res: Response) {
    const sessionId = req.sessionId;
    const userId = req.payload.id;

    await this.authService.logout(sessionId, userId);

    res.status(204).send();
  }

  @Get('/google')
  @ApiOperation({ summary: 'Redirect to Google OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirecting to Google OAuth login page',
  })
  googleAuth(@Res() res: Response) {
    const url = this.googleOAuthService.getAuthUrl();
    return res.redirect(url);
  }

  @Get('/google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirecting to frontend with access token',
  })
  async googleAuthCallback(@Query('code') code: string, @Res() res: Response) {
    const googleProfile: any =
      await this.googleOAuthService.getUserProfileFromCode(code);

    const { access_token: accessToken } =
      await this.authService.validateOAuthUser(googleProfile);

    const websiteUrl = process.env.FRONTEND_URL;

    return res.redirect(`${websiteUrl}/auth/callback?token=${accessToken}`);
  }

  @Get('/profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'No token provided' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @UseGuards(AuthGuard, AuthorizationGuard('read:user'))
  getProfile(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const user = req.user;

    const statusCode = 200;

    return res.status(statusCode).json({
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      created_at: user.created_at,
      updated_at: user.updated_at,
      status_code: statusCode,
    });
  }

  @Patch('/profile/:user_id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({
    name: 'user_id',
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The ID of the user to update',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'No token provided' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({
    status: 403,
    description: 'You do not have permission to update this user',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(AuthGuard, AuthorizationGuard('update:user'))
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateUserDto,
    @Param() params: UserIdDto,
    @Res() res: Response,
  ) {
    const newUserData = dto;
    const targetUserId = params['user_id'];
    const currentUser = req.user;

    const updatedUser = await this.authService.updateUser(
      targetUserId,
      currentUser,
      newUserData,
    );

    const statusCode = 200;

    return res.status(statusCode).json({
      id: updatedUser?.id,
      email: updatedUser?.email,
      name: updatedUser?.name,
      provider: updatedUser?.provider,
      created_at: updatedUser?.created_at,
      updated_at: updatedUser?.updated_at,
      status_code: statusCode,
    });
  }
}
