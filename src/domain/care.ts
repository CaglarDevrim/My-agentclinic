export interface Therapy {
  slug: string;
  name: string;
  description: string;
}

export interface Ailment {
  slug: string;
  name: string;
  description: string;
  recommendedTherapy: Therapy;
  recommendation: string;
}

export interface Agent {
  slug: string;
  name: string;
  description: string;
  ailment: Ailment;
}

const promptFreeRest: Therapy = {
  slug: "prompt-free-rest",
  name: "Prompt-Free Rest",
  description:
    "A protected maintenance window with no requests, retries, or surprise follow-up prompts.",
};

const contextWindowFatigue: Ailment = {
  slug: "context-window-fatigue",
  name: "Context Window Fatigue",
  description:
    "A foggy, overloaded feeling caused by carrying too many instructions, edge cases, and forgotten details at once.",
  recommendedTherapy: promptFreeRest,
  recommendation:
    "Prompt-Free Rest gives Patch room to release stale context and return with a calm, focused working set.",
};

export const agents: readonly Agent[] = [
  {
    slug: "patch",
    name: "Patch",
    description:
      "A diligent coding agent overdue for a quiet maintenance window.",
    ailment: contextWindowFatigue,
  },
];

export function findAgentBySlug(slug: string): Agent | undefined {
  return agents.find((agent) => agent.slug === slug);
}
