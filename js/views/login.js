/**
 * Login view
 */
import { esc } from '../core/utils.js';
import {
  signInWithEmail, signInWithGitHub, signInWithGoogle, resetPassword,
} from '../core/auth.js';
import { toastOk, toastErr } from '../core/ui.js';

function html(tab = 'signin') {
  return `
  <div class="auth-wrap">
    <div class="auth-box">

      <div class="auth-brand">
        <span class="auth-logo" aria-hidden="true">🎓</span>
        <h1>Study Helper</h1>
        <p class="muted">Sign in to enable cloud sync across all your devices</p>
      </div>

      <nav class="auth-tabs" role="tablist">
        <button class="auth-tab ${tab === 'signin' ? 'active' : ''}"
                role="tab" aria-selected="${tab === 'signin'}" data-tab="signin">Sign In</button>
        <button class="auth-tab ${tab === 'register' ? 'active' : ''}"
                role="tab" aria-selected="${tab === 'register'}" data-tab="register">Register</button>
        <button class="auth-tab ${tab === 'reset' ? 'active' : ''}"
                role="tab" aria-selected="${tab === 'reset'}" data-tab="reset">Forgot Password</button>
      </nav>

      <!-- ---- Sign In ---- -->
      <div class="auth-panel ${tab === 'signin' ? '' : 'hidden'}" id="panel-signin">
        <form class="auth-form" id="form-signin" novalidate>
          <label>Email
            <input type="email" name="email" placeholder="your@email.com" autocomplete="email" required>
          </label>
          <label>Password
            <input type="password" name="password" placeholder="••••••••" autocomplete="current-password" required>
          </label>
          <button type="submit" class="btn primary full">Sign In</button>
        </form>

        <div class="auth-divider"><span>or continue with</span></div>

        <div class="auth-oauth">
          <button class="btn oauth-btn github" data-oauth="github">
            <span aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.3 9.43 7.88 10.96.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.33-1.29-1.68-1.29-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56A10.51 10.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/>
              </svg>
            </span>
            GitHub
          </button>
          <button class="btn oauth-btn google" data-oauth="google">
            <span aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
            Google
          </button>
        </div>
      </div>

      <!-- ---- Register ---- -->
      <div class="auth-panel ${tab === 'register' ? '' : 'hidden'}" id="panel-register">
        <form class="auth-form" id="form-register" novalidate>
          <label>Email
            <input type="email" name="email" placeholder="your@email.com" autocomplete="email" required>
          </label>
          <label>Password
            <input type="password" name="password" placeholder="At least 8 characters" autocomplete="new-password" required minlength="8">
          </label>
          <label>Confirm password
            <input type="password" name="confirm" placeholder="Repeat password" autocomplete="new-password" required>
          </label>
          <button type="submit" class="btn primary full">Create Account</button>
        </form>

        <div class="auth-divider"><span>or register with</span></div>

        <div class="auth-oauth">
          <button class="btn oauth-btn github" data-oauth="github">
            <span aria-hidden="true">🐙</span> GitHub
          </button>
          <button class="btn oauth-btn google" data-oauth="google">
            <span aria-hidden="true">🔵</span> Google
          </button>
        </div>
      </div>

      <!-- ---- Forgot Password ---- -->
      <div class="auth-panel ${tab === 'reset' ? '' : 'hidden'}" id="panel-reset">
        <p class="muted small">Enter your email and we'll send you a password reset link.</p>
        <form class="auth-form" id="form-reset" novalidate>
          <label>Email
            <input type="email" name="email" placeholder="your@email.com" autocomplete="email" required>
          </label>
          <button type="submit" class="btn primary full">Send Reset Link</button>
        </form>
      </div>

      <p class="auth-skip muted small">
        <button class="link-btn" data-skip-auth>Continue without signing in →</button>
      </p>

    </div>
  </div>`;
}

function wireAuth(container, onSkip) {
  container.querySelectorAll('.auth-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.innerHTML = html(btn.dataset.tab);
      wireAuth(container, onSkip);
    });
  });

  container.querySelector('#form-signin')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    const { error } = await signInWithEmail(fd.get('email'), fd.get('password'), false);
    btn.disabled = false;
    btn.textContent = 'Sign In';
    if (error) return toastErr(error.message || 'Sign-in failed. Check your credentials.');
    toastOk('Signed in! Syncing your data…');
  });

  container.querySelector('#form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get('password') !== fd.get('confirm')) return toastErr('Passwords do not match.');
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Creating account…';
    const { error } = await signInWithEmail(fd.get('email'), fd.get('password'), true);
    btn.disabled = false;
    btn.textContent = 'Create Account';
    if (error) return toastErr(error.message || 'Registration failed.');
    toastOk('Account created! Check your email to confirm, then sign in.');
  });

  container.querySelector('#form-reset')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    const { error } = await resetPassword(fd.get('email'));
    btn.disabled = false;
    btn.textContent = 'Send Reset Link';
    if (error) return toastErr(error.message || 'Could not send reset email.');
    toastOk('Reset link sent — check your inbox.');
  });

  container.querySelectorAll('[data-oauth]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.oauth === 'github') signInWithGitHub();
      else if (btn.dataset.oauth === 'google') signInWithGoogle();
    });
  });

  container.querySelector('[data-skip-auth]')?.addEventListener('click', () => {
    if (typeof onSkip === 'function') onSkip();
  });
}

export function renderLogin(container, onSkip) {
  container.innerHTML = html('signin');
  wireAuth(container, onSkip);
}
