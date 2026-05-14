import { doubleCsrf } from 'csrf-csrf';
import type { Request, Response } from 'express';

const CSRF_COOKIE_NAME = '__Host-csrf-token';
const CSRF_COOKIE_NAME_DEV = 'csrf-token';

export const CSRF_HEADER_NAME = 'x-csrf-token';

type CsrfBundle = ReturnType<typeof doubleCsrf>;

let cachedBundle: CsrfBundle | null = null;

export function createCsrfProtection(secret: string, isProd: boolean): CsrfBundle {
  if (cachedBundle) return cachedBundle;
  const cookieName = isProd ? CSRF_COOKIE_NAME : CSRF_COOKIE_NAME_DEV;

  cachedBundle = doubleCsrf({
    getSecret: () => secret,
    // Double-submit cookie pattern: protection comes from the attacker not being
    // able to read the cookie nor set a custom header cross-origin. Binding the
    // token to req.ip is brittle behind proxies/CDNs (the IP can change between
    // issuing and verifying the token, causing false-positive rejections), so we
    // use a stable per-app identifier instead.
    getSessionIdentifier: () => 'mediflow',
    cookieName,
    cookieOptions: {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'strict',
      secure: isProd,
      path: '/',
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req) => req.headers[CSRF_HEADER_NAME] as string,
  });
  return cachedBundle;
}

export function getCsrfBundle(): CsrfBundle {
  if (!cachedBundle) {
    throw new Error('CSRF protection is not initialized. Call createCsrfProtection first.');
  }
  return cachedBundle;
}

export function issueCsrfToken(req: Request, res: Response): string {
  return getCsrfBundle().generateCsrfToken(req, res, { overwrite: true });
}
