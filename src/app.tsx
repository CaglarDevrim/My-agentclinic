import { serveStatic } from "@hono/node-server/serve-static";
import { Hono, type MiddlewareHandler } from "hono";
import { jsxRenderer } from "hono/jsx-renderer";

import { clearLoginCsrfCookie, clearSessionCookie, readLoginCsrfCookie, readSessionCookie, setLoginCsrfCookie, setSessionCookie } from "./auth/cookies.js";
import { authenticateStaffCredentials, authenticateStaffSession, createStaffSession, endStaffSession } from "./auth/service.js";
import { constantTimeStringEqual, createLoginCsrfToken, hasSameOrigin, isFreshLoginCsrfToken, isValidStaffEmail, isValidStaffPassword, normalizeStaffEmail, safeDashboardReturnTo } from "./auth/security.js";
import type { AuthenticatedStaff } from "./auth/types.js";
import { approveReview, cancelAppointment, confirmAppointment, createAppointmentFromSlot, createFeedback, createTherapistSlot, findAgent, findAppointment, getClinicReport, getDashboard, listAgents, listAilments, listAvailableSlots, listPublicReviews, listReportAppointments, listReviewModerationItems, listTherapistAppointments, listTherapists, listTherapistSlots, listTherapies, removeTherapistSlot, unpublishReview, type ClinicDatabase } from "./db/index.js";
import { findAgentBySlug } from "./domain/care.js";
import { validateFeedback, type FeedbackValues } from "./domain/feedback.js";
import { normalizeNotificationEmail, validateNotificationContact } from "./domain/notifications.js";
import { parseReportDateRange, reportCsvFilename, serializeAppointmentReportCsv } from "./domain/reporting.js";
import { AgentPage } from "./pages/AgentPage.js";
import { AgentDetailPage, AgentsPage, AilmentsPage, AppointmentConfirmationPage, AppointmentFormPage, DashboardPage, ErrorPage, TherapistAppointmentsPage, TherapistDirectoryPage, TherapistSchedulePage, TherapiesPage, type AppointmentErrors, type AppointmentValues } from "./pages/ClinicPages.js";
import { HomePage } from "./pages/HomePage.js";
import { FeedbackPage, FeedbackThanksPage } from "./pages/FeedbackPage.js";
import { ReviewModerationPage, ReviewsPage } from "./pages/ReviewPages.js";
import { AboutPage } from "./pages/AboutPage.js";
import { LoginPage, type LoginErrors } from "./pages/AuthPage.js";
import { ClinicReportPage } from "./pages/ReportPage.js";

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
  return { displayName: auth.displayName, csrfToken: auth.csrfToken, role: auth.role };
}

function validateAppointment(values: AppointmentValues): AppointmentErrors {
  const errors: AppointmentErrors = {};
  if (!parsePositiveId(values.slotId)) errors.slotId = "Choose an available appointment time.";
  Object.assign(errors, validateNotificationContact(values.email, values.notificationConsent).errors);
  return errors;
}

function validateScheduledAt(value: string, now: Date): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return "Enter a valid appointment date and time.";
  const scheduled = new Date(`${value}:00`);
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const isReal = !Number.isNaN(scheduled.getTime()) && scheduled.getFullYear() === year && scheduled.getMonth() === month - 1 && scheduled.getDate() === day && scheduled.getHours() === hour && scheduled.getMinutes() === minute;
  if (!isReal) return "Enter a real calendar date and time.";
  if (scheduled <= now) return "Choose an appointment time in the future.";
  return undefined;
}

function permittedReturnTo(auth: AuthenticatedStaff, returnTo: string): string {
  if (auth.role === "staff") return returnTo === "/dashboard/schedule" || returnTo === "/dashboard/appointments" ? "/dashboard" : returnTo;
  return returnTo === "/dashboard/appointments" || returnTo === "/dashboard/schedule" ? returnTo : "/dashboard/schedule";
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
    if (auth) return context.redirect(permittedReturnTo(auth, returnTo), 303);
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
    return context.redirect(permittedReturnTo(auth, returnTo), 303);
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
    if (auth.role === "therapist") return context.redirect("/dashboard/schedule", 303);
    return context.render(<DashboardPage data={await getDashboard(db)} staff={staffHeader(auth)} />);
  });
  app.get("/dashboard/reports", async (context) => {
    const auth = context.get("staffAuth");
    if (auth.role !== "staff") {
      context.status(403);
      return context.render(<ErrorPage status={403} title="Staff access required" message="Clinic-wide reports are available to staff only." staff={staffHeader(auth)} />);
    }
    const query = new URL(context.req.url).searchParams;
    const result = parseReportDateRange(query.getAll("from"), query.getAll("to"), now());
    if (!result.range) {
      context.status(422);
      return context.render(<ClinicReportPage values={result.values} errors={result.errors} staff={staffHeader(auth)} />);
    }
    return context.render(<ClinicReportPage report={await getClinicReport(db, result.range)} values={result.values} staff={staffHeader(auth)} />);
  });
  app.on(["GET", "HEAD"], "/dashboard/reports.csv", async (context) => {
    const auth = context.get("staffAuth");
    if (auth.role !== "staff") {
      context.status(403);
      return context.render(<ErrorPage status={403} title="Staff access required" message="Clinic-wide reports are available to staff only." staff={staffHeader(auth)} />);
    }
    const query = new URL(context.req.url).searchParams;
    const result = parseReportDateRange(query.getAll("from"), query.getAll("to"), now());
    if (!result.range) return context.text("Enter a valid report date range.", 422);
    context.header("Content-Type", "text/csv; charset=utf-8");
    context.header("Content-Disposition", `attachment; filename="${reportCsvFilename(result.range)}"`);
    if (context.req.method === "HEAD") return context.body(null, 200);
    return context.body(serializeAppointmentReportCsv(await listReportAppointments(db, result.range)));
  });
  app.get("/dashboard/therapists", async (context) => {
    const auth = context.get("staffAuth");
    if (auth.role !== "staff") {
      context.status(403);
      return context.render(<ErrorPage status={403} title="Staff access required" message="This clinic-wide therapist directory is available to staff only." staff={staffHeader(auth)} />);
    }
    return context.render(<TherapistDirectoryPage therapists={await listTherapists(db, now())} staff={staffHeader(auth)} />);
  });
  app.get("/dashboard/schedule", async (context) => {
    const auth = context.get("staffAuth");
    if (auth.role !== "therapist" || !auth.therapistId) {
      context.status(403);
      return context.render(<ErrorPage status={403} title="Therapist access required" message="This schedule belongs to a linked therapist account." staff={staffHeader(auth)} />);
    }
    return context.render(<TherapistSchedulePage slots={await listTherapistSlots(db, auth.therapistId, now())} staff={staffHeader(auth)} />);
  });
  app.post("/dashboard/schedule/slots", async (context) => {
    const auth = context.get("staffAuth");
    if (auth.role !== "therapist" || !auth.therapistId) {
      context.status(403);
      return context.render(<ErrorPage status={403} title="Therapist access required" message="Only linked therapists can open appointment times." staff={staffHeader(auth)} />);
    }
    const form = await context.req.raw.formData();
    const scheduledAt = singleFormValue(form, "scheduledAt") ?? "";
    const error = validateScheduledAt(scheduledAt, now());
    if (error) {
      context.status(422);
      return context.render(<TherapistSchedulePage slots={await listTherapistSlots(db, auth.therapistId, now())} staff={staffHeader(auth)} values={{ scheduledAt }} errors={{ scheduledAt: error }} />);
    }
    const result = await createTherapistSlot(db, auth.therapistId, scheduledAt);
    if (result === "duplicate") {
      context.status(422);
      return context.render(<TherapistSchedulePage slots={await listTherapistSlots(db, auth.therapistId, now())} staff={staffHeader(auth)} values={{ scheduledAt }} errors={{ scheduledAt: "You already opened this appointment time." }} />);
    }
    return context.redirect("/dashboard/schedule", 303);
  });
  app.post("/dashboard/schedule/slots/:slotId/remove", async (context) => {
    const auth = context.get("staffAuth");
    if (auth.role !== "therapist" || !auth.therapistId) return context.notFound();
    const slotId = parsePositiveId(context.req.param("slotId"));
    if (!slotId) return context.notFound();
    const result = await removeTherapistSlot(db, auth.therapistId, slotId, now());
    if (result === "not_found") return context.notFound();
    if (result === "occupied") {
      context.status(409);
      return context.render(<ErrorPage status={409} title="Appointment time occupied" message="A booked appointment time cannot be removed. Cancel the appointment first." staff={staffHeader(auth)} />);
    }
    return context.redirect("/dashboard/schedule", 303);
  });
  app.get("/dashboard/appointments", async (context) => {
    const auth = context.get("staffAuth");
    if (auth.role !== "therapist" || !auth.therapistId) {
      context.status(403);
      return context.render(<ErrorPage status={403} title="Therapist access required" message="This appointment list belongs to a linked therapist account." staff={staffHeader(auth)} />);
    }
    return context.render(<TherapistAppointmentsPage appointments={await listTherapistAppointments(db, auth.therapistId)} staff={staffHeader(auth)} />);
  });
  app.post("/dashboard/appointments/:appointmentId/confirm", async (context) => {
    const auth = context.get("staffAuth");
    const id = parsePositiveId(context.req.param("appointmentId"));
    if (!id) return context.notFound();
    const result = await confirmAppointment(db, id, auth.role === "therapist" ? auth.therapistId : undefined, now());
    if (result === "not_found") return context.notFound();
    if (result === "invalid_transition") {
      context.status(409);
      return context.render(<ErrorPage status={409} title="Appointment conflict" message="A cancelled appointment cannot be confirmed." staff={staffHeader(context.get("staffAuth"))} />);
    }
    return context.redirect(auth.role === "therapist" ? "/dashboard/appointments" : "/dashboard", 303);
  });
  app.post("/dashboard/appointments/:appointmentId/cancel", async (context) => {
    const auth = context.get("staffAuth");
    const id = parsePositiveId(context.req.param("appointmentId"));
    if (!id) return context.notFound();
    const result = await cancelAppointment(db, id, auth.role === "therapist" ? auth.therapistId : undefined, now());
    if (result === "not_found") return context.notFound();
    if (result === "invalid_transition") {
      context.status(409);
      return context.render(<ErrorPage status={409} title="Appointment conflict" message="This appointment cannot be cancelled from its current state." staff={staffHeader(context.get("staffAuth"))} />);
    }
    return context.redirect(auth.role === "therapist" ? "/dashboard/appointments" : "/dashboard", 303);
  });
  app.get("/dashboard/reviews", async (context) => {
    const auth = context.get("staffAuth");
    if (auth.role !== "staff") {
      context.status(403);
      return context.render(<ErrorPage status={403} title="Staff access required" message="Review moderation is available to clinic staff only." staff={staffHeader(auth)} />);
    }
    return context.render(<ReviewModerationPage items={await listReviewModerationItems(db)} staff={staffHeader(auth)} />);
  });
  app.post("/dashboard/reviews/:feedbackId/approve", async (context) => {
    const auth = context.get("staffAuth");
    if (auth.role !== "staff") {
      context.status(403);
      return context.render(<ErrorPage status={403} title="Staff access required" message="Review moderation is available to clinic staff only." staff={staffHeader(auth)} />);
    }
    const id = parsePositiveId(context.req.param("feedbackId"));
    if (!id || !await approveReview(db, id)) return context.notFound();
    return context.redirect("/dashboard/reviews", 303);
  });
  app.post("/dashboard/reviews/:feedbackId/unpublish", async (context) => {
    const auth = context.get("staffAuth");
    if (auth.role !== "staff") {
      context.status(403);
      return context.render(<ErrorPage status={403} title="Staff access required" message="Review moderation is available to clinic staff only." staff={staffHeader(auth)} />);
    }
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
    return agent ? context.render(<AppointmentFormPage agent={agent} slots={await listAvailableSlots(db, now())} />) : context.notFound();
  });

  app.post("/agents/:agentId/appointments", async (context) => {
    const id = parsePositiveId(context.req.param("agentId"));
    const agent = id ? await findAgent(db, id) : undefined;
    if (!id || !agent) return context.notFound();
    const form = await context.req.raw.formData();
    const emailValue = singleFormValue(form, "email") ?? "";
    const consentValues = form.getAll("notificationConsent");
    const values: AppointmentValues = {
      slotId: singleFormValue(form, "slotId") ?? "",
      email: /[\u0000-\u001f\u007f]/.test(emailValue) ? "" : emailValue,
      notificationConsent: consentValues.length === 1 && consentValues[0] === "yes",
    };
    const errors = validateAppointment(values);
    if (Object.keys(errors).length) {
      context.status(422);
      return context.render(<AppointmentFormPage agent={agent} slots={await listAvailableSlots(db, now())} values={values} errors={errors} />);
    }
    const slotId = parsePositiveId(values.slotId)!;
    const result = await createAppointmentFromSlot(db, { agentId: id, slotId, now: now(), notificationEmail: normalizeNotificationEmail(values.email) });
    if (result.status === "conflict") {
      errors.slotId = "That appointment time is no longer available. Choose another time.";
      context.status(422);
      return context.render(<AppointmentFormPage agent={agent} slots={await listAvailableSlots(db, now())} values={{ ...values, slotId: "" }} errors={errors} />);
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
