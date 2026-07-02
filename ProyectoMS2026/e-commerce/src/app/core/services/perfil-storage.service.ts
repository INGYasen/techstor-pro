import { Injectable } from '@angular/core';
import { PerfilUpdateRequest, PerfilUsuario } from '../models/api.models';

const storageKey = (userId: number) => `ts-perfil-${userId}`;

export interface PerfilSemilla {
  nombreCompleto?: string;
  email?: string;
  nombres?: string;
  apellidos?: string;
}

@Injectable({ providedIn: 'root' })
export class PerfilStorageService {
  leer(userId: number): PerfilUpdateRequest | null {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PerfilUpdateRequest;
    } catch {
      localStorage.removeItem(storageKey(userId));
      return null;
    }
  }

  guardar(userId: number, data: PerfilUpdateRequest): void {
    localStorage.setItem(storageKey(userId), JSON.stringify(data));
  }

  sembrarDesdeRegistro(userId: number, nombreCompleto: string, email: string): PerfilUpdateRequest {
    const { nombres, apellidos } = this.dividirNombre(nombreCompleto);
    const data: PerfilUpdateRequest = {
      nombres,
      apellidos,
      nombreCompleto: nombreCompleto.trim(),
      email: email.trim(),
      pais: 'Perú',
    };
    this.guardar(userId, data);
    return data;
  }

  construirDesdeSesion(
    userId: number,
    username: string | null,
    semilla?: PerfilSemilla | null,
  ): PerfilUsuario {
    const local = this.leer(userId);
    const nombreCompleto =
      local?.nombreCompleto?.trim() ||
      semilla?.nombreCompleto?.trim() ||
      this.componerNombre(local, semilla) ||
      '';

    let nombres = local?.nombres?.trim() || semilla?.nombres?.trim() || '';
    let apellidos = local?.apellidos?.trim() || semilla?.apellidos?.trim() || '';

    if (!nombres && nombreCompleto) {
      ({ nombres, apellidos } = this.dividirNombre(nombreCompleto));
    }

    const email =
      local?.email?.trim() ||
      semilla?.email?.trim() ||
      (username ? `${username}@techstore.com` : '');

    return {
      id: userId,
      username: username ?? 'usuario',
      nombreCompleto: nombreCompleto || `${nombres} ${apellidos}`.trim() || username || 'Usuario',
      email,
      nombres,
      apellidos,
      dni: local?.dni ?? '',
      fechaNacimiento: local?.fechaNacimiento ?? null,
      sexo: local?.sexo ?? '',
      telefono: local?.telefono ?? '',
      pais: local?.pais ?? 'Perú',
      departamento: local?.departamento ?? '',
      provincia: local?.provincia ?? '',
      distrito: local?.distrito ?? '',
      codigoPostal: local?.codigoPostal ?? '',
      direccion: local?.direccion ?? '',
      referencia: local?.referencia ?? '',
      roles: ['ROLE_USER'],
      enabled: true,
    };
  }

  private componerNombre(local: PerfilUpdateRequest | null, semilla?: PerfilSemilla | null): string {
    const partes = [
      local?.nombres ?? semilla?.nombres,
      local?.apellidos ?? semilla?.apellidos,
    ].filter(Boolean);
    return partes.join(' ').trim();
  }

  dividirNombre(nombreCompleto: string): { nombres: string; apellidos: string } {
    const parts = nombreCompleto.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { nombres: '', apellidos: '' };
    if (parts.length === 1) return { nombres: parts[0], apellidos: '' };
    return { nombres: parts[0], apellidos: parts.slice(1).join(' ') };
  }
}
