import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Microsoft 365 SSO provider using MSAL.
 *
 * Note: @azure/msal-node is an optional dependency.
 * When MS365_CLIENT_ID is not configured, Microsoft auth operations will throw.
 */
@Injectable()
export class MicrosoftAuthProvider {
  private msalClient: any;
  private readonly logger = new Logger(MicrosoftAuthProvider.name);
  private readonly isConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    const clientId = this.config.get<string>('MS365_CLIENT_ID');
    const tenantId = this.config.get<string>('MS365_TENANT_ID');
    const clientSecret = this.config.get<string>('MS365_CLIENT_SECRET');

    this.isConfigured = !!(clientId && tenantId && clientSecret);

    if (this.isConfigured) {
      this.initializeMsal(clientId!, tenantId!, clientSecret!);
    } else {
      this.logger.warn(
        'Microsoft 365 SSO is not configured. Set MS365_CLIENT_ID, MS365_TENANT_ID, and MS365_CLIENT_SECRET.',
      );
    }
  }

  private async initializeMsal(
    clientId: string,
    tenantId: string,
    clientSecret: string,
  ) {
    try {
      // Dynamic import to make @azure/msal-node optional
      const { ConfidentialClientApplication } = await import('@azure/msal-node');

      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId,
          authority: `https://login.microsoftonline.com/${tenantId}`,
          clientSecret,
        },
      });

      this.logger.log('MSAL client initialized');
    } catch {
      this.logger.warn(
        '@azure/msal-node is not installed. Microsoft 365 SSO is disabled.',
      );
    }
  }

  /**
   * Exchange an authorization code for user info.
   */
  async exchangeCodeForUser(
    code: string,
    redirectUri: string,
  ): Promise<{
    oid: string;
    displayName: string;
    mail: string;
    preferredUsername: string;
  }> {
    if (!this.isConfigured || !this.msalClient) {
      throw new UnauthorizedException('Microsoft 365 認証が設定されていません');
    }

    try {
      const result = await this.msalClient.acquireTokenByCode({
        code,
        scopes: ['user.read'],
        redirectUri,
      });

      const claims = result.idTokenClaims as Record<string, unknown>;

      return {
        oid: claims.oid as string,
        displayName: (claims.name as string) ?? 'Unknown',
        mail: (claims.preferred_username as string) ?? '',
        preferredUsername: (claims.preferred_username as string) ?? '',
      };
    } catch (error) {
      this.logger.error('Microsoft token exchange failed', error);
      throw new UnauthorizedException('Microsoft 認証に失敗しました');
    }
  }

  /**
   * Generate an Azure AD authorization URL.
   */
  async getAuthUrl(redirectUri: string): Promise<string> {
    if (!this.isConfigured || !this.msalClient) {
      throw new UnauthorizedException('Microsoft 365 認証が設定されていません');
    }

    return this.msalClient.getAuthCodeUrl({
      scopes: ['user.read', 'openid', 'profile', 'email'],
      redirectUri,
    });
  }
}
