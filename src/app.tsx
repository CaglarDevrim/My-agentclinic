import { serveStatic } from "@hono/node-server/serve-static";
import type Database from "better-sqlite3";
import { Hono } from "hono";
import { jsxRenderer } from "hono/jsx-renderer";

import { createAppointment, findAgent, findAppointment, getDashboard, listAgents, listAilments, listTherapies, openDatabase } from "./db/index.js";
import { findAgentBySlug } from "./domain/care.js";
import { AgentPage } from "./pages/AgentPage.js";
import { AgentDetailPage, AgentsPage, AilmentsPage, AppointmentConfirmationPage, AppointmentFormPage, DashboardPage, ErrorPage, TherapiesPage, type AppointmentErrors, type AppointmentValues } from "./pages/ClinicPages.js";
import { HomePage } from "./pages/HomePage.js";

export type RequestLogger = (message: string) => void;

function parsePositiveId(value: string): number | undefined {
  if (!/^[1-9]\d*$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
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

export function createApp(db: Database.Database, options: { logger?: RequestLogger; now?: () => Date } = {}) {
  const app = new Hono();
  const logger = options.logger ?? console.log;
  const now = options.now ?? (() => new Date());

  app.use("*", async (context, next) => {
    const started = performance.now();
    await next();
    logger(`${context.req.method} ${context.req.path} ${context.res.status} ${Math.round(performance.now() - started)}ms`);
  });
  app.use(jsxRenderer());
  app.use("/static/*", serveStatic({ root: "./" }));

  app.get("/health", (context) => context.json({ status: "ok" }));
  app.get("/", (context) => context.render(<HomePage />));
  app.get("/agents", (context) => context.render(<AgentsPage agents={listAgents(db)} />));
  app.get("/ailments", (context) => context.render(<AilmentsPage ailments={listAilments(db)} />));
  app.get("/therapies", (context) => context.render(<TherapiesPage therapies={listTherapies(db)} />));
  app.get("/dashboard", (context) => context.render(<DashboardPage data={getDashboard(db)} />));

  app.get("/agents/:agentId", (context) => {
    const value = context.req.param("agentId");
    if (value === "patch") {
      const patch = findAgentBySlug(value);
      return patch ? context.render(<AgentPage agent={patch} />) : context.notFound();
    }
    const id = parsePositiveId(value);
    const agent = id ? findAgent(db, id) : undefined;
    return agent ? context.render(<AgentDetailPage agent={agent} />) : context.notFound();
  });

  app.get("/agents/:agentId/appointments/new", (context) => {
    const id = parsePositiveId(context.req.param("agentId"));
    const agent = id ? findAgent(db, id) : undefined;
    return agent ? context.render(<AppointmentFormPage agent={agent} />) : context.notFound();
  });

  app.post("/agents/:agentId/appointments", async (context) => {
    const id = parsePositiveId(context.req.param("agentId"));
    const agent = id ? findAgent(db, id) : undefined;
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
    const appointmentId = createAppointment(db, { agentId: id, therapistName: values.therapistName, scheduledAt: `${values.date}T${values.time}` });
    return context.redirect(`/agents/${id}/appointments/${appointmentId}`, 303);
  });

  app.get("/agents/:agentId/appointments/:appointmentId", (context) => {
    const agentId = parsePositiveId(context.req.param("agentId"));
    const appointmentId = parsePositiveId(context.req.param("appointmentId"));
    const appointment = agentId && appointmentId ? findAppointment(db, agentId, appointmentId) : undefined;
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

const defaultDatabase = openDatabase();
const app = createApp(defaultDatabase);
export default app;
