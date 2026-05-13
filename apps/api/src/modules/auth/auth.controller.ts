import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { issueCsrfToken } from '../../common/middleware/csrf';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private getRefreshCookieOptions(): CookieOptions {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    // In production the web (Vercel) and api (Railway/Render) live on different
    // origins, so the cookie has to be sameSite='none' + secure=true to be sent
    // on cross-site requests. Locally we keep 'strict' for stronger CSRF posture.
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE_NAME, token, this.getRefreshCookieOptions());
  }

  private clearRefreshCookie(res: Response) {
    const { maxAge: _maxAge, ...clearOptions } = this.getRefreshCookieOptions();
    res.clearCookie(REFRESH_COOKIE_NAME, clearOptions);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto.email, loginDto.password, request);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _refreshToken, ...payload } = result;
    return payload;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) res: Response) {
    const token = request.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const result = await this.authService.refreshToken(token, request);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _refreshToken, ...payload } = result;
    return payload;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = request.cookies?.[REFRESH_COOKIE_NAME];
    this.clearRefreshCookie(res);
    if (token) {
      return this.authService.logout(userId, token, request);
    }
    return { message: 'Logged out' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions for current user' })
  async logoutAll(
    @CurrentUser('id') userId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.clearRefreshCookie(res);
    return this.authService.globalLogout(userId, request);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getCurrentUser(userId);
  }

  @Public()
  @Get('csrf-token')
  @ApiOperation({
    summary: 'Issue a CSRF token (also sets the httpOnly csrf cookie). Send the returned token as the X-CSRF-Token header on subsequent mutations.',
  })
  async getCsrfToken(@Req() request: Request, @Res({ passthrough: true }) res: Response) {
    const token = issueCsrfToken(request, res);
    return { token };
  }
}
