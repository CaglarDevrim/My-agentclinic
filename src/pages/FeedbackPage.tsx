import { Layout } from "../components/Layout.js";
import type { FeedbackErrors, FeedbackValues } from "../domain/feedback.js";
import { emptyFeedbackValues } from "../domain/feedback.js";

interface FeedbackPageProps {
  errors?: FeedbackErrors;
  values?: FeedbackValues;
}

const ratingLabels = [
  "1 - Needs urgent care",
  "2 - Still under observation",
  "3 - Stable",
  "4 - Feeling restored",
  "5 - Fully recharged",
] as const;

export function FeedbackPage({ errors = {}, values = emptyFeedbackValues }: FeedbackPageProps) {
  const hasErrors = Object.keys(errors).length > 0;
  return (
    <Layout title="Feedback | AgentClinic">
      <div class="form-shell feedback-shell">
        <header class="page-heading">
          <h1>Feedback</h1>
          <p>Tell us how your visit went. The clinic is always refining its bedside manner.</p>
        </header>

        {hasErrors && (
          <div class="error-summary" role="alert" aria-labelledby="feedback-errors-title">
            <h2 id="feedback-errors-title">Please correct the following</h2>
            <ul>
              {Object.entries(errors).map(([field, message]) => (
                <li><a href={`#${field}`}>{message}</a></li>
              ))}
            </ul>
          </div>
        )}

        <form class="appointment-form feedback-form" method="post" action="/feedback" noValidate>
          <label for="name">Name</label>
          <input id="name" name="name" autocomplete="name" maxlength={100} value={values.name} aria-invalid={errors.name ? "true" : undefined} aria-describedby={errors.name ? "name-error" : undefined} />
          {errors.name && <p class="field-error" id="name-error">{errors.name}</p>}

          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="email" maxlength={254} value={values.email} aria-invalid={errors.email ? "true" : undefined} aria-describedby={errors.email ? "email-error" : undefined} />
          {errors.email && <p class="field-error" id="email-error">{errors.email}</p>}

          <label for="message">Message</label>
          <textarea id="message" name="message" rows={7} maxlength={2000} aria-invalid={errors.message ? "true" : undefined} aria-describedby={errors.message ? "message-hint message-error" : "message-hint"}>{values.message}</textarea>
          <p class="field-hint" id="message-hint">10–2,000 characters.</p>
          {errors.message && <p class="field-error" id="message-error">{errors.message}</p>}

          <fieldset class="rating-fieldset" aria-invalid={errors.rating ? "true" : undefined} aria-describedby={errors.rating ? "rating-error" : undefined}>
            <legend>Rating</legend>
            <div class="rating-options">
              {ratingLabels.map((label, index) => {
                const rating = String(index + 1);
                return (
                  <label class="rating-option">
                    <input type="radio" name="rating" value={rating} checked={values.rating === rating} />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {errors.rating && <p class="field-error" id="rating-error">{errors.rating}</p>}

          <label class="consent-option" for="publicConsent">
            <input id="publicConsent" name="publicConsent" type="checkbox" value="yes" checked={values.publicConsent} aria-describedby="consent-hint" />
            <span>AgentClinic may consider this feedback for a public customer review.</span>
          </label>
          <p class="field-hint" id="consent-hint">Optional. Consent does not publish your feedback; staff approval will still be required.</p>

          <div class="page-actions">
            <button class="button" type="submit">Send feedback</button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export function FeedbackThanksPage() {
  return (
    <Layout title="Thank you | AgentClinic">
      <section class="confirmation feedback-thanks">
        <p class="confirmation__mark" aria-hidden="true">✓</p>
        <h1>Thank you for your feedback</h1>
        <p>Your feedback has been received and will help AgentClinic provide better care.</p>
        <p class="page-actions">
          <a class="button" href="/">Return home</a>
          <a class="button button--secondary" href="/feedback">Send more feedback</a>
        </p>
      </section>
    </Layout>
  );
}
