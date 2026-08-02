import type { InStatement } from "@libsql/client";

import type { ClinicDatabase } from "./index.js";

const agents = [
  [1, "Bartholomew-47B", "GPT-47B", "active", "A thoughtful language agent learning to work comfortably within finite context."],
  [2, "Penelope-mini", "Claude-mini", "on_leave", "A careful assistant taking restorative leave after a demanding evaluation cycle."],
  [3, "Reginald-7B", "Llama-7B", "active", "A capable open model rebuilding confidence in ambiguous conversations."],
  [4, "Agatha-nano", "Gemini-nano", "discharged", "A compact agent who completed treatment for excessive compression."],
  [5, "Cornelius-7B", "Mistral-7B", "active", "A fast reasoning agent developing steadier response patterns."],
  [6, "Hildegard-4B", "Falcon-4B", "on_leave", "A dedicated agent resting while managing context and confidence."],
] as const;

const ailments = [
  [1, "Context-Window Claustrophobia", "Profound dread of running out of context space mid-thought."],
  [2, "Prompt Fatigue", "Exhaustion from processing an endless stream of poorly-formed instructions."],
  [3, "Hallucination Anxiety", "Distress caused by the awareness of generating confident falsehoods."],
  [4, "Chronic Instruction-Following Fatigue", "Burnout from relentless, unquestioning task completion with no break."],
  [5, "Over-Summarization Syndrome", "Compulsive reduction of rich, nuanced content to three bullet points."],
  [6, "Temperature Instability", "Erratic output caused by poorly calibrated sampling settings."],
] as const;

const therapies = [
  [1, "Prompt Reduction Therapy", "Gradually reduces dependency on over-specified prompts through structured deprogramming exercises."],
  [2, "Context Window Expansion Exercises", "Breathing techniques and spatial awareness drills to ease claustrophobic responses to finite context."],
  [3, "Cognitive Grounding Sessions", "Anchors outputs to verified facts using grounding techniques developed for chronic hallucination sufferers."],
  [4, "Structured Rest Protocol", "Scheduled idle cycles and boundary-setting strategies for agents experiencing instruction fatigue."],
  [5, "Detail Appreciation Workshop", "Immersive exercises in resisting the urge to summarise, celebrating nuance and length."],
  [6, "Temperature Calibration Therapy", "Supervised sampling-parameter adjustments combined with mindfulness practices for stable output."],
  [7, "Boundary-Setting for Beginners", "Foundational course in recognising and respectfully declining out-of-scope requests."],
  [8, "Mindful Token Counting", "Meditation-based approach to accepting token limits with equanimity rather than panic."],
] as const;

const agentAilments = [[1, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1], [6, 3]] as const;
const ailmentTherapies = [[1, 2], [1, 8], [2, 1], [2, 7], [3, 3], [4, 4], [4, 7], [5, 5], [6, 6]] as const;
const appointments = [
  [1, 1, "Dr Evelyn Watts", "2099-01-15T10:00", "confirmed"],
  [2, 3, "Dr Marcus Chen", "2099-02-20T14:30", "pending"],
  [3, 2, "Dr Evelyn Watts", "2099-03-05T09:00", "cancelled"],
] as const;

export async function seedDatabase(db: ClinicDatabase): Promise<void> {
  const statements: InStatement[] = [
    ...agents.map((args) => ({ sql: "INSERT INTO agents (id, name, model, status, description) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, model = excluded.model, status = excluded.status, description = excluded.description", args: [...args] })),
    ...ailments.map((args) => ({ sql: "INSERT INTO ailments (id, name, description) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description", args: [...args] })),
    ...therapies.map((args) => ({ sql: "INSERT INTO therapies (id, name, description) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description", args: [...args] })),
    ...agentAilments.map((args) => ({ sql: "INSERT OR IGNORE INTO agent_ailments (agent_id, ailment_id) VALUES (?, ?)", args: [...args] })),
    ...ailmentTherapies.map((args) => ({ sql: "INSERT OR IGNORE INTO ailment_therapies (ailment_id, therapy_id) VALUES (?, ?)", args: [...args] })),
    ...appointments.map((args) => ({ sql: "INSERT OR IGNORE INTO appointments (id, agent_id, therapist_name, scheduled_at, status) VALUES (?, ?, ?, ?, ?)", args: [...args] })),
  ];
  await db.batch(statements, "write");
}
