import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CatalogSearchService {
  readonly term = signal('');
}
