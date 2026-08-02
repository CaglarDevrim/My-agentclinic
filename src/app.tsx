import { serveStatic } from "@hono/node-server/serve-static";
import { Hono, type MiddlewareHandler } from "hono";
import { jsxRenderer } from "hono/jsx-renderer";

import { clearLoginCsrfCookie, clearSessionCookie, readLoginCsrfCookie, readSessionCookie, setLoginCsrfCookie, setSessionCookie } from "./auth/cookies.js";
import { authenticateStaffCredentials, authenticateStaffSession, createStaffSession, endStaffSession } from "./auth/service.js";
import { constantTimeStringEqual, createLoginCsrfToken, hasSameOrigin, isFreshLoginCsrfToken, isValidStaffEmail, isValidStaffPassword, normalizeStaffEmail, safeDashboardReturnTo } from "./auth/security.js";
import type { AuthenticatedStaff } from "./auth/types.js";
import { approveReview, cancelAppointment, confirmAppointment, createAppointment, createFeedback, findAgent, findAppointment, getDashboard, listAgents, listAilments, listPublicReviews, listReviewModerationItems, listTherapies, unpublishReview, type ClinicDatabase } from "./db/index.js";
import { findAgentBySlug } from "./domain/care.js";
import { validateFeedback, type FeedbackValues } from "./domain/feedback.js";
import { AgentPage } from "./pages/AgentPage.js";
import { AgentDetailPage, AgentsPage, AilmentsPage, AppointmentConfirmationPage, AppointmentFormPage, DashboardPage, ErrorPage, TherapiesPage, type AppointmentErrors, type AppointmentValues } from "./pages/ClinicPages.js";
import { HomePage } from "./pages/HomePage.js";
import { FeedbackPage, FeedbackThanksPage } from "./pages/FeedbackPage.js";
import { ReviewModerationPage, ReviewsPage } from "./pages/ReviewPages.js";
import { AboutPage } from "./pages/AboutPage.js";
import { LoginPage, type LoginErrors } from "./pages/AuthPage.js";

export type RequestLogger = (message: string) => void;

type AppEnv = { Variables: { staffAuth: AuthenticatedStaff } };

function parsePositiveId(value: string): number | undefined {
  if (!/^[1-9]\d*$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
}

function singleFormValue(formData: FormData, name: string): string | undefined {
  const values = formData.getAll(name);
  return values.length === 1 && typeof values[0] === "string" ? values[0] : undefined;
}

function staffHeader(auth: AuthenticatedStaff) {
  return { displayName: auth.displayName, csrfToken: auth.csrfToken };
}

function validateAppointment(values: AppointmentValues, now: Date): AppointmentErrors {
  const errors: AppointmentErrors = {};
  if (!values.therapistName.trim()) errors.therapistName = "Enter a therapist name.";
  else if (values.therapistName.trim().length > 100) errors.therapistName = "Therapist name must be 100 characters or fewer.";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) errors.date = "Enter a valid appointment date.";
  if (!/^\d{2}:\d{2}$/.test(values.time)) errors.time = "Enter a valid appointment time.";
  if (!errors.date && !errors.time) {
    const scheduled = new Date(`${values.date}T${values.time}:00`);
    const [year, month, day] = values.date.split("-").map(Number);
    const [hour, minute] = values.time.split(":").map(Number);
    const isReal = !Number.isNaN(scheduled.getTime()) && scheduled.getFullYear() === year && scheduled.getMonth() === month - 1 && scheduled.getDate() === day && scheduled.getHours() === hour && scheduled.getMinutes() === minute;
    if (!isReal) errors.date = "Enter a real calendar date and time.";
    else if (scheduled <= now) errors.date = "Choose an appointment in the future.";
  }
  return errors;
}

export function createApp(db: ClinicDatabase, options: { logger?: RequestLogger; now?: () => Date } = {}) {
  const app = new Hono<AppEnv>();
  const logger = options.logger ?? console.log;
  const now = options.now ?? (() => new Date());

  app.use("*", async (context, next) => {
    const started = performance.now();
    await next();
    logger(`${context.req.method} ${context.req.path} ${context.res.status} ${Math.round(performance.now() - started)}ms`);
  });
  app.use(jsxRenderer());
  app.use("/static/*", serveStatic({ root: "./" }));

  const requireStaff: MiddlewareHandler<AppEnv> = async (context, next) => {
    context.header("Cache-Control", "no-store");
    const sessionToken = readSessionCookie(context);
    const auth = await authenticateStaffSession(db, sessionToken, now());
    if (!auth) {
      if (sessionToken) clearSessionCookie(context);
      const requestUrl = new URL(context.req.url);
      const requestedDestination = context.req.method === "GET" || context.req.method === "HEAD"
        ? safeDashboardReturnTo(`${requestUrl.pathname}${requestUrl.search}`)
        : "/dashboard";
      return context.redirect(`/login?returnTo=${encodeURIComponent(requestedDestination)}`, 303);
    }

    context.set("staffAuth", auth);
    if (context.req.method === "POST") {
      let csrfToken: string | undefined;
      try {
        csrfToken = singleFormValue(await context.req.raw.clone().formData(), "_csrf");
      } catch {
        csrfToken = undefined;
      }
      if (!hasSameOrigin(context.req.raw) || !csrfToken || !constantTimeStringEqual(csrfToken, auth.csrfToken)) {
        context.status(403);
        return context.render(<ErrorPage status={403} title="Request forbidden" message="This staff action could not be verified. Return to the dashboard and try again." staff={staffHeader(auth)} />);
      }
    }
    await next();
  };

  app.use("/dashboard", requireStaff);
  app.use("/dashboard/*", requireStaff);

  app.get("/health", (context) => context.json({ status: "ok" }));
  app.get("/", (context) => context.render(<HomePage />));
  app.get("/agents", async (context) => context.render(<AgentsPage agents={await listAgents(db)} />));
  app.get("/ailments", async (context) => context.render(<AilmentsPage ailments={await listAilments(db)} />));
  app.get("/therapies", async (context) => context.render(<TherapiesPage therapies={await listTherapies(db)} />));
  app.get("/login", async (context) => {
    context.header("Cache-Control", "no-store");
    const returnTo = safeDashboardReturnTo(context.req.query("returnTo"));
    const sessionToken = readSessionCookie(context);
    const auth = await authenticateStaffSession(db, sessionToken, now());
    if (auth) return context.redirect(returnTo, 303);
    if (sessionToken) clearSessionCookie(context);
    const csrfToken = createLoginCsrfToken(now());
    setLoginCsrfCookie(context, csrfToken);
    return context.render(<LoginPage csrfToken={csrfToken} values={{ email: "", returnTo }} />);
  });

  app.post("/login", async (context) => {
    context.header("Cache-Control", "no-store");
    const requestTime = now();
    if (!hasSameOrigin(context.req.raw)) {
      context.status(403);
      return context.render(<ErrorPage status={403} title="Request forbidden" message="This login request could not be verified. Reload the login page and try again." />);
    }

    let formData: FormData;
    try {
      formData = await context.req.raw.formData();
    } catch {
      context.status(422);
      const csrfToken = createLoginCsrfToken(requestTime);
      setLoginCsrfCookie(context, csrfToken);
      return context.render(<LoginPage csrfToken={csrfToken} errors={{ form: "Submit the login form using valid fields." }} />);
    }

    const submittedCsrf = singleFormValue(formData, "_csrf");
    const cookieCsrf = readLoginCsrfCookie(context);
    if (!submittedCsrf || !cookieCsrf || !isFreshLoginCsrfToken(cookieCsrf, requestTime) || !constantTimeStringEqual(submittedCsrf, cookieCsrf)) {
      context.status(403);
      return context.render(<ErrorPage status={403} title="Request forbidden" message="This login request could not be verified. Reload the login page and try again." />);
    }

    const returnTo = safeDashboardReturnTo(singleFormValue(formData, "returnTo"));
    const emailValue = singleFormValue(formData, "email");
    const password = singleFormValue(formData, "password");
    const email = normalizeStaffEmail(emailValue ?? "");
    const errors: LoginErrors = {};
    if (emailValue === undefined || !isValidStaffEmail(email)) errors.email = "Enter a valid staff email address.";
    if (password === undefined || !isValidStaffPassword(password)) errors.password = "Enter a password between 12 and 128 characters.";

    const renderFailure = (status: 401 | 422 | 429, failureErrors: LoginErrors, retryAfter?: number) => {
      const csrfToken = createLoginCsrfToken(requestTime);
      setLoginCsrfCookie(context, csrfToken);
      if (retryAfter !== undefined) context.header("Retry-After", String(retryAfter));
      context.status(status);
      return context.render(<LoginPage csrfToken={csrfToken} values={{ email, returnTo }} errors={failureErrors} />);
    };

    if (Object.keys(errors).length || password === undefined) return renderFailure(422, errors);
    const result = await authenticateStaffCredentials(db, email, password, requestTime);
    if (result.status === "invalid") return renderFailure(401, { form: "The email address or password is incorrect." });
    if (result.status === "throttled") return renderFailure(429, { form: "Too many sign-in attempts. Try again later." }, result.retryAfter);

    const previousSessionToken = readSessionCookie(context);
    const auth = await createStaffSession(db, result.staff, requestTime, previousSessionToken);
    setSessionCookie(context, auth.sessionToken);
    clearLoginCsrfCookie(context);
    return context.redirect(returnTo, 303);
  });

  app.post("/logout", async (context) => {
    context.header("Cache-Control", "no-store");
    const sessionToken = readSessionCookie(context);
    const auth = await authenticateStaffSession(db, sessionToken, now());
    if (!auth || !sessionToken) {
      clearSessionCookie(context);
      return context.redirect("/login", 303);
    }
    let csrfToken: string | undefined;
    try {
      csrfToken = singleFormValue(await context.req.raw.formData(), "_csrf");
    } catch {
      csrfToken = undefined;
    }
    if (!hasSameOrigin(context.req.raw) || !csrfToken || !constantTimeStringEqual(csrfToken, auth.csrfToken)) {
      context.status(403);
      return context.render(<ErrorPage status={403} title="Request forbidden" message="This sign-out request could not be verified. Return to the dashboard and try again." staff={staffHeader(auth)} />);
    }
    await endStaffSession(db, sessionToken);
    clearSessionCookie(context);
    return context.redirect("/login", 303);
  });

  app.get("/dashboard", async (context) => {
    const auth = context.get("staffAuth");
    return context.render(<DashboardPage data={await getDashboard(db)} staff={staffHeader(auth)} />);
  });
  app.post("/dashboard/appointments/:appointmentId/confirm", async (context) => {
    const id = parsePositiveId(context.req.param("appointmentId"));
    if (!id) return context.notFound();
    const result = await confirmAppointment(db, id);
    if (result === "not_found") return context.notFound();
    if (result === "invalid_transition") {
      context.status(409);
      return context.render(<ErrorPage status={409} title="Appointment conflict" message="A cancelled appointment cannot be confirmed." staff={staffHeader(context.get("staffAuth"))} />);
    }
    return context.redirect("/dashboard", 303);
  });
  app.post("/dashboard/appointments/:appointmentId/cancel", async (context) => {
    const id = parsePositiveId(context.req.param("appointmentId"));
    if (!id) return context.notFound();
    const result = await cancelAppointment(db, id);
    if (result === "not_found") return context.notFound();
    if (result === "invalid_transition") {
      context.status(409);
      return context.render(<ErrorPage status={409} title="Appointment conflict" message="This appointment cannot be cancelled from its current state." staff={staffHeader(context.get("staffAuth"))} />);
    }
    return context.redirect("/dashboard", 303);
  });
  app.get("/dashboard/reviews", async (context) => {
    const auth = context.get("staffAuth");
    return context.render(<ReviewModerationPage items={await listReviewModerationItems(db)} staff={staffHeader(auth)} />);
  });
  app.post("/dashboard/reviews/:feedbackId/approve", async (context) => {
    const id = parsePositiveId(context.req.param("feedbackId"));
    if (!id || !await approveReview(db, id)) return context.notFound();
    return context.redirect("/dashboard/reviews", 303);
  });
  app.post("/dashboard/reviews/:feedbackId/unpublish", async (context) => {
    const id = parsePositiveId(context.req.param("feedbackId"));
    if (!id || !await unpublishReview(db, id)) return context.notFound();
    return context.redirect("/dashboard/reviews", 303);
  });
  app.get("/reviews", async (context) => context.render(<ReviewsPage reviews={await listPublicReviews(db)} />));
  app.get("/about", (context) => context.render(<AboutPage />));
  app.get("/feedback", (context) => context.render(<FeedbackPage />));
  app.get("/feedback/thanks", (context) => context.render(<FeedbackThanksPage />));
  app.post("/feedback", async (context) => {
    const formData = await context.req.raw.formData();
    const singleValue = (name: string): string => {
      const values = formData.getAll(name);
      return values.length === 1 && typeof values[0] === "string" ? values[0] : "";
    };
    const consentValues = formData.getAll("publicConsent");
    const values: FeedbackValues = {
      name: singleValue("name"),
      email: singleValue("email"),
      message: singleValue("message"),
      rating: singleValue("rating"),
      publicConsent: consentValues.length === 1 && consentValues[0] === "yes",
    };
    const result = validateFeedback(values);
    if (!result.input) {
      context.status(422);
      return context.render(<FeedbackPage errors={result.errors} values={result.values} />);
    }
    await createFeedback(db, result.input);
    return context.redirect("/feedback/thanks", 303);
  });

  app.get("/agents/:agentId", async (context) => {
    const value = context.req.param("agentId");
    if (value === "patch") {
      const patch = findAgentBySlug(value);
      return patch ? context.render(<AgentPage agent={patch} />) : context.notFound();
    }
    const id = parsePositiveId(value);
    const agent = id ? await findAgent(db, id) : undefined;
    return agent ? context.render(<AgentDetailPage agent={agent} />) : context.notFound();
  });

  app.get("/agents/:agentId/appointments/new", async (context) => {
    const id = parsePositiveId(context.req.param("agentId"));
    const agent = id ? await findAgent(db, id) : undefined;
    return agent ? context.render(<AppointmentFormPage agent={agent} />) : context.notFound();
  });

  app.post("/agents/:agentId/appointments", async (context) => {
    const id = parsePositiveId(context.req.param("agentId"));
    const agent = id ? await findAgent(db, id) : undefined;
    if (!id || !agent) return context.notFound();
    const body = await context.req.parseBody();
    const values: AppointmentValues = {
      therapistName: typeof body.therapistName === "string" ? body.therapistName.trim() : "",
      date: typeof body.date === "string" ? body.date : "",
      time: typeof body.time === "string" ? body.time : "",
    };
    const errors = validateAppointment(values, now());
    if (Object.keys(errors).length) {
      context.status(422);
      return context.render(<AppointmentFormPage agent={agent} values={values} errors={errors} />);
    }
    const result = await createAppointment(db, { agentId: id, therapistName: values.therapistName, scheduledAt: `${values.date}T${values.time}` });
    if (result.status === "conflict") {
      errors.therapistName = "This therapist already has an appointment at that time.";
      context.status(422);
      return context.render(<AppointmentFormPage agent={agent} values={values} errors={errors} />);
    }
    return context.redirect(`/agents/${id}/appointments/${result.appointmentId}`, 303);
  });

  app.get("/agents/:agentId/appointments/:appointmentId", async (context) => {
    const agentId = parsePositiveId(context.req.param("agentId"));
    const appointmentId = parsePositiveId(context.req.param("appointmentId"));
    const appointment = agentId && appointmentId ? await findAppointment(db, agentId, appointmentId) : undefined;
    return appointment ? context.render(<AppointmentConfirmationPage appointment={appointment} />) : context.notFound();
  });

  app.notFound((context) => {
    context.status(404);
    return context.render(<ErrorPage status={404} title="Page not found" message="The page or clinic record you requested could not be found." />);
  });
  app.onError((error, context) => {
    console.error("Unhandled AgentClinic error", error);
    context.status(500);
    return context.render(<ErrorPage status={500} title="Clinic system error" message="Something went wrong while preparing this page. Please try again." />);
  });
  return app;
}
