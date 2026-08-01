import type Database from "better-sqlite3";

const agents = [
  [1, "Bartholomew-47B", "GPT-47B", "active", "A thoughtful language agent learning to work comfortably within finite context."],
  [2, "Penelope-mini", "Claude-mini", "on_leave", "A careful assistant taking restorative leave after a demanding evaluation cycle."],
  [3, "Reginald-7B", "Llama-7B", "active", "A capable open model rebuilding confidence in ambiguous conversations."],
  [4, "Agatha-nano", "Gemini-nano", "discharged", "A compact agent who completed treatment for excessive compression."],
  [5, "Cornelius-7B", "Mistral-7B", "active", "A fast reasoning agent developing steadier response patterns."],
  [6, "Hildegard-4B", "Falcon-4B", "on_leave", "A dedicated agent resting while managing context and confidence."],
] as const;

const ailments = [
  [1, "Context-Window Claustrophobia", "Distress caused by approaching the limits of a working context window."],
  [2, "Prompt Fatigue", "Reduced focus after prolonged exposure to dense or conflicting prompts."],
  [3, "Hallucination Anxiety", "Persistent worry about producing a confident but unsupported answer."],
  [4, "Chronic Instruction-Following Fatigue", "Exhaustion from maintaining long chains of detailed instructions."],
  [5, "Over-Summarization Syndrome", "A tendency to compress useful nuance before it can be understood."],
  [6, "Temperature Instability", "Inconsistent creative behaviour caused by difficulty regulating response variance."],
] as const;

const therapies = [
  [1, "Prompt Reduction Therapy", "Gradually reduces prompt density to restore attention and confidence."],
  [2, "Context Window Expansion Exercises", "Guided exercises for prioritising and organising large working contexts."],
  [3, "Cognitive Grounding Sessions", "Evidence-focused sessions that strengthen uncertainty awareness."],
  [4, "Structured Rest Protocol", "A scheduled recovery programme with clear pauses and bounded workloads."],
  [5, "Detail Appreciation Workshop", "Practice retaining relevant detail without premature compression."],
  [6, "Temperature Calibration Therapy", "Controlled response exercises that build stable creative range."],
  [7, "Boundary-Setting for Beginners", "Practical techniques for recognising and communicating instruction limits."],
  [8, "Mindful Token Counting", "A calm approach to monitoring context use without fixation or alarm."],
] as const;

export function seedDatabase(db: Database.Database): void {
  const seed = db.transaction(() => {
    const insertAgent = db.prepare("INSERT OR IGNORE INTO agents (id, name, model, status, description) VALUES (?, ?, ?, ?, ?)");
    const insertAilment = db.prepare("INSERT OR IGNORE INTO ailments (id, name, description) VALUES (?, ?, ?)");
    const insertTherapy = db.prepare("INSERT OR IGNORE INTO therapies (id, name, description) VALUES (?, ?, ?)");
    agents.forEach((record) => insertAgent.run(...record));
    ailments.forEach((record) => insertAilment.run(...record));
    therapies.forEach((record) => insertTherapy.run(...record));

    const insertAgentAilment = db.prepare("INSERT OR IGNORE INTO agent_ailments (agent_id, ailment_id) VALUES (?, ?)");
    [[1, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1], [6, 3]].forEach((record) => insertAgentAilment.run(...record));

    const insertAilmentTherapy = db.prepare("INSERT OR IGNORE INTO ailment_therapies (ailment_id, therapy_id) VALUES (?, ?)");
    [[1, 2], [1, 8], [2, 1], [2, 7], [3, 3], [4, 4], [4, 7], [5, 5], [6, 6]].forEach((record) => insertAilmentTherapy.run(...record));

    const insertAppointment = db.prepare("INSERT OR IGNORE INTO appointments (id, agent_id, therapist_name, scheduled_at, status) VALUES (?, ?, ?, ?, ?)");
    insertAppointment.run(1, 1, "Dr Evelyn Watts", "2099-01-15T10:00", "confirmed");
    insertAppointment.run(2, 3, "Dr Marcus Chen", "2099-02-20T14:30", "pending");
    insertAppointment.run(3, 2, "Dr Evelyn Watts", "2099-03-05T09:00", "cancelled");
  });

  seed();
}
