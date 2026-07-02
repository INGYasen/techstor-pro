import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-logout',
  template: '<p class="logout-msg">Cerrando sesión...</p>',
  styles: `
    .logout-msg {
      min-height: 100vh;
      display: grid;
      place-items: center;
      margin: 0;
      color: #475569;
      font-family: system-ui, sans-serif;
    }
  `,
})
export class LogoutComponent implements OnInit {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.logout();
  }
}
