import { HttpErrorResponse } from '@angular/common/http';

export function extractHttpErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  if (!(err instanceof HttpErrorResponse)) {
    return fallback;
  }

  const body = err.error;
  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  if (body && typeof body === 'object') {
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }

    const validationErrors = body.validationErrors as Record<string, string> | undefined;
    if (validationErrors) {
      const messages = Object.values(validationErrors).filter(Boolean);
      if (messages.length) {
        return messages.join('. ');
      }
    }
  }

  if (err.status === 401) {
    return 'Sesión expirada o credenciales inválidas';
  }

  if (err.status === 403) {
    return 'No tienes permisos para realizar esta acción';
  }

  if (err.status === 409) {
    return 'Ese nombre de usuario ya está en uso';
  }

  return fallback;
}
