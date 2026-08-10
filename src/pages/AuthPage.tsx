import { Layout } from "../components/Layout.js";

export interface LoginValues {
  email: string;
  returnTo: string;
}

export interface LoginErrors {
  email?: string;
  password?: string;
  form?: string;
}

export function LoginPage({
  csrfToken,
  values = { email: "", returnTo: "/dashboard" },
  errors = {},
}: {
  csrfToken: string;
  values?: LoginValues;
  errors?: LoginErrors;
}) {
  const hasErrors = Object.keys(errors).length > 0;
  return (
    <Layout title="Staff login | AgentClinic">
      <div class="form-shell login-page">
        <header class="page-heading">
          <p class="page-eyebrow">Secure clinic access</p>
          <h1>Staff login</h1>
          <p>Sign in to manage appointments, reviews, and clinic activity.</p>
        </header>
        {hasErrors && (
          <div class="error-summary" role="alert" tabIndex={-1} autofocus>
            <h2>We could not sign you in</h2>
            <ul>
              {errors.form && <li>{errors.form}</li>}
              {errors.email && <li><a href="#email">{errors.email}</a></li>}
              {errors.password && <li><a href="#password">{errors.password}</a></li>}
            </ul>
          </div>
        )}
        <form class="appointment-form login-form" method="post" action="/login" noValidate>
          <input type="hidden" name="_csrf" value={csrfToken} />
          <input type="hidden" name="returnTo" value={values.returnTo} />
          <label for="email">Email address</label>
          <input id="email" name="email" type="email" autocomplete="username" value={values.email} aria-invalid={errors.email ? "true" : undefined} aria-describedby={errors.email ? "email-error" : undefined} autofocus={!hasErrors} />
          {errors.email && <p class="field-error" id="email-error">{errors.email}</p>}
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" aria-invalid={errors.password ? "true" : undefined} aria-describedby={errors.password ? "password-error" : undefined} />
          {errors.password && <p class="field-error" id="password-error">{errors.password}</p>}
          <div class="page-actions">
            <button class="button" type="submit">Sign in</button>
            <a class="button button--secondary" href="/">Return home</a>
          </div>
        </form>
      </div>
    </Layout>
  );
}
