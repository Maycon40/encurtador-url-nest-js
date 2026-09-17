import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

@Injectable()
export class GoogleOAuthService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI, // Ex: http://localhost:3000/api/v1/auth/google/callback
    );
  }

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const url: string = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    return url;
  }

  async getUserProfileFromCode(code: string): Promise<GoogleUserProfile> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        throw new UnauthorizedException('Google user profile invalid.');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name || '',
        picture: payload.picture,
      };
    } catch {
      throw new UnauthorizedException('Error on google authentication.');
    }
  }
}
