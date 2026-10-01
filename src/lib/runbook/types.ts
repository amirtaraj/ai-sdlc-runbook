// Core domain types for the AI SDLC Runbook demo.
// Everything the UI renders is derived from these shapes, so adding a new
// agent, scenario, gap or artifact section is a pure data change.

export type StageId =
  | "upload"
  | "analysis"
  | "gaps"
  | "questions"
  | "agents"
  | "approval"
  | "package";

export type StageStatus = "locked" | "active" | "latched";

export interface StageDef {
  id: StageId;
  index: number;
  label: string;
  caption: string;
}

export interface RequirementSection {
  id: string; // e.g. "REQ-1.4"
  heading: string;
  body: string;
}

export interface Gap {
  id: string; // GAP-01
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  questionId: string;
}

export interface QuestionOption {
  id: string; // "A"
  label: string;
  rationale: string;
}

export interface Question {
  id: string; // Q-01
  decisionId: string; // D-01
  prompt: string;
  context: string;
  askedBy: string; // agent id or "analysis"
  options: QuestionOption[];
}

export interface Decision {
  id: string; // D-01
  questionId: string;
  title: string;
  chosenOptionId: string;
  chosenLabel: string;
  rationale: string;
  approved: boolean;
  traces: string[]; // ids of artifacts this decision flows into
}

export type AgentStatus = "pending" | "running" | "done";

export interface AgentLogLine {
  t: string; // relative timestamp
  text: string;
  kind: "info" | "result";
}

export interface AgentDef {
  id: string;
  name: string;
  discipline: string;
  /** Ids of agents that must finish first. Empty = starts immediately. */
  dependsOn: string[];
  /** Simulated work duration in ms. */
  durationMs: number;
  logs: AgentLogLine[];
  recommendation: string;
  /**
   * Which decision ids this agent consumes. Used for the traceability drawer.
   */
  consumes: string[];
}

export interface AgentRun {
  agentId: string;
  status: AgentStatus;
  progress: number; // 0..1
  visibleLogs: number;
}

export type ArtifactTabId =
  | "requirement"
  | "architecture"
  | "design"
  | "tasks"
  | "testcases"
  | "risks"
  | "decisions";

export interface ArtifactItem {
  id: string; // R-01 / T-11 / TC-041 ...
  title: string;
  body: string;
  /** Decision / gap / agent ids this item traces back to. */
  traces: string[];
  meta?: string;
}

export interface ArtifactTab {
  id: ArtifactTabId;
  label: string;
  summary: string;
  items: ArtifactItem[];
}

export interface Scenario {
  id: string;
  fileName: string;
  title: string;
  sizeLabel: string;
  blurb: string;
  requirement: RequirementSection[];
  analysisFindings: string[];
  gaps: Gap[];
  questions: Question[];
  agents: AgentDef[];
  /** Builds the final package from the approved decisions. */
  buildPackage: (decisions: Decision[]) => ArtifactTab[];
}
