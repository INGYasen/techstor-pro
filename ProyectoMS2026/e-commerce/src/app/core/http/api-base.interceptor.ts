import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export function requestPath(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
  const queryIndex = url.indexOf('?');
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
}

export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiUrl?.replace(/\/$/, '') ?? '';
  if (!base || req.url.startsWith('http://') || req.url.startsWith('https://')) {
    return next(req);
  }

  if (req.url.startsWith('/api') || req.url.startsWith('/auth')) {
    return next(req.clone({ url: `${base}${req.url}` }));
  }

  return next(req);
};
