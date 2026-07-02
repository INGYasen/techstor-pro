import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NominatimResult } from '../models/nominatim.models';

@Injectable({ providedIn: 'root' })
export class NominatimService {
  private readonly base = '/nominatim/search';

  constructor(private readonly http: HttpClient) {}

  buscar(query: string) {
    const normalized = query.trim();
    const withCountry = /peru|perú/i.test(normalized) ? normalized : `${normalized}, Perú`;

    const params = new HttpParams()
      .set('q', withCountry)
      .set('format', 'json')
      .set('addressdetails', '1')
      .set('limit', '6')
      .set('countrycodes', 'pe');

    return this.http.get<NominatimResult[]>(this.base, { params });
  }

  reversa(lat: number, lon: number) {
    const params = new HttpParams()
      .set('lat', String(lat))
      .set('lon', String(lon))
      .set('format', 'json');

    return this.http.get<NominatimResult>(`/nominatim/reverse`, { params });
  }
}
