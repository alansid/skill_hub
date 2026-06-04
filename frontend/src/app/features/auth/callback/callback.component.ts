import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="min-h-screen flex items-center justify-center">
      <mat-spinner diameter="52" />
    </div>
  `,
})
export class CallbackComponent implements OnInit {
  private route       = inject(ActivatedRoute);
  private authService = inject(AuthService);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) this.authService.handleOAuthToken(token);
  }
}
