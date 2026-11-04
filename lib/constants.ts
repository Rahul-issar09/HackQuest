export const SCHEMA_VERSION = 1;
export const SEED_VERSION = 1;

export const DOMAINS = [
  "Linux",
  "Cryptography",
  "Web Security",
  "Networking",
  "Digital Forensics",
  "Reverse Engineering",
  "SOC",
  "Python Scripts",
  "AI Security",
] as const;

export const DIFFICULTIES = ["beginner", "intermediate", "expert"] as const;
export const RELEVANCE = ["official_round1", "supplementary", "later_round", "unverified"] as const;
export const RELEVANCE_LABEL: Record<(typeof RELEVANCE)[number], string> = {
  official_round1: "Official Round 1 topic",
  supplementary: "Supplementary practice",
  later_round: "Mentioned for later rounds",
  unverified: "Unverified relevance",
};

export const TASK_TYPES = ["theory", "resource", "lab", "CTF", "revision", "report"] as const;
export const TASK_STATUS = ["todo", "in_progress", "completed", "skipped"] as const;
export const RESOURCE_TYPES = ["course", "lab", "documentation", "article", "video", "tool"] as const;
export const COST_STATUS = ["free", "paid", "mixed", "unknown"] as const;
export const RESOURCE_STATUS = ["not_started", "in_progress", "completed"] as const;
export const ATTEMPT_STATUS = ["attempted", "solved", "failed", "skipped"] as const;
export const MOCK_STATUS = ["planned", "active", "completed", "abandoned"] as const;
export const MOCK_RESULT_STATUS = ["not_started", "attempted", "solved", "skipped"] as const;

export const DEFAULT_NOTE_FOLDERS = [
  "Linux",
  "Web Security",
  "Cryptography",
  "Networking",
  "Digital Forensics",
  "Reverse Engineering",
  "SOC",
  "Python Scripts",
  "CTF Writeups",
  "Cheat Sheets",
  "General Notes",
];

export const DEFAULT_READINESS_WEIGHTS = {
  learning: 15,
  ctf: 35,
  coverage: 15,
  mock: 25,
  reporting: 10,
};

export const DISCLAIMER =
  "Independent personal preparation tool. Not affiliated with or endorsed by Tata Consultancy Services.";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
];
