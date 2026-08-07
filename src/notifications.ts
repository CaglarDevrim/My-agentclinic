import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { claimNextDueNotification, completeNotification, failNotification, prepareNotificationRun, type ClinicDatabase } from "./db/index.js";
import type { NotificationDelivery, NotificationEventKind } from "./db/types.js";

export interface NotificationMessage {
  subject: string;
  text: string;
  html: string;
}

export interface NotificationTransport {
  deliver(notification: NotificationDelivery, message: NotificationMessage): Promise<void>;
}

export interface NotificationProcessingResult {
  processed: number;
  failed: number;
  processedIds: number[];
  failedIds: number[];
}

const eventCopy: Record<NotificationEventKind, { subject: string; heading: string; detail: string }> = {
  appointment_created: {
    subject: "AgentClinic appointment requested",
    heading: "Appointment requested",
    detail: "We received your appointment request.",
  },
  appointment_confirmed: {
    subject: "AgentClinic appointment confirmed",
    heading: "Appointment confirmed",
    detail: "Your therapist confirmed the appointment.",
  },
  appointment_cancelled: {
    subject: "AgentClinic appointment cancelled",
    heading: "Appointment cancelled",
    detail: "Your appointment has been cancelled.",
  },
  appointment_reminder_24h: {
    subject: "AgentClinic appointment reminder",
    heading: "Appointment reminder",
    detail: "Your appointment is scheduled for about 24 hours from now.",
  },
};

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function formatAppointment(value: string): string {
  const [date, time = ""] = value.split("T");
  return `${date} at ${time}`;
}

export function renderNotification(notification: NotificationDelivery): NotificationMessage {
  const copy = eventCopy[notification.event_kind];
  const appointment = `${notification.agent_name} with ${notification.therapist_name} on ${formatAppointment(notification.appointment_scheduled_at)}`;
  const text = `${copy.heading}\n\n${copy.detail}\n\nAppointment: ${appointment}\nSite: ${notification.site_name}\nAddress: ${notification.site_address}\n\nContact the clinic if you need help.`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(copy.subject)}</title></head><body><main><h1>${escapeHtml(copy.heading)}</h1><p>${escapeHtml(copy.detail)}</p><dl><dt>Agent</dt><dd>${escapeHtml(notification.agent_name)}</dd><dt>Therapist</dt><dd>${escapeHtml(notification.therapist_name)}</dd><dt>When</dt><dd>${escapeHtml(formatAppointment(notification.appointment_scheduled_at))}</dd><dt>Site</dt><dd>${escapeHtml(notification.site_name)}</dd><dt>Address</dt><dd>${escapeHtml(notification.site_address)}</dd></dl><p>Contact the clinic if you need help.</p></main></body></html>`;
  return { subject: copy.subject, text, html };
}

export class LocalPreviewTransport implements NotificationTransport {
  readonly directory: string;

  constructor(directory = ".agentclinic-notifications") {
    this.directory = resolve(directory);
  }

  async deliver(notification: NotificationDelivery, message: NotificationMessage): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const basename = `${notification.id}-${notification.event_kind}`;
    await Promise.all([
      writeFile(resolve(this.directory, `${basename}.html`), message.html, { encoding: "utf8", mode: 0o600 }),
      writeFile(resolve(this.directory, `${basename}.txt`), message.text, { encoding: "utf8", mode: 0o600 }),
    ]);
  }
}

export async function processDueNotifications(db: ClinicDatabase, transport: NotificationTransport, now: Date): Promise<NotificationProcessingResult> {
  await prepareNotificationRun(db, now);
  const result: NotificationProcessingResult = { processed: 0, failed: 0, processedIds: [], failedIds: [] };
  const failedThisRun = new Set<number>();

  while (true) {
    const notification = await claimNextDueNotification(db, now);
    if (!notification) break;
    if (failedThisRun.has(notification.id)) break;
    try {
      await transport.deliver(notification, renderNotification(notification));
      await completeNotification(db, notification.id, now);
      result.processed += 1;
      result.processedIds.push(notification.id);
    } catch {
      await failNotification(db, notification.id);
      result.failed += 1;
      result.failedIds.push(notification.id);
      failedThisRun.add(notification.id);
    }
  }

  return result;
}
