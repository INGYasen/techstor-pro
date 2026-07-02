import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { requestPath } from '../http/api-base.interceptor';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  const headers: Record<string, string> = {};
  const path = requestPath(req.url);

  if (token && !path.startsWith('/auth/login') && !path.startsWith('/auth/register') && !path.startsWith('/nominatim')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (auth.isLoggedIn() && path.startsWith('/api/v1/carritos')) {
    headers['X-User-Id'] = String(auth.getUserId());
  }

  if (Object.keys(headers).length > 0) {
    req = req.clone({ setHeaders: headers });
  }

  return next(req);
};
