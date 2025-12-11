import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthPayload } from 'src/common/interface';
import { CacheService } from 'src/shared/services';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    protected readonly jwtService: JwtService,
    protected readonly cacheService: CacheService,
    protected readonly configService: ConfigService,
  ) {}

  protected getSecret(): string {
    const secret = this.configService.get<string>('app.jwt.secret');
    if (!secret) {
      throw new Error('JWT secret is not configured');
    }
    return secret;
  }

  protected extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async afterVerify(payload: AuthPayload): Promise<void> {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async verifyCache(payload: AuthPayload): Promise<void> {
    return;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    Object.assign(request, { user: null });
    try {
      const payload = await this.jwtService.verifyAsync<AuthPayload>(token!, {
        secret: this.getSecret(),
      });
      Object.assign(request, { user: payload });
      await this.afterVerify(payload);
    } catch {
      Object.assign(request, { user: null });
    }
    return true;
  }
}
