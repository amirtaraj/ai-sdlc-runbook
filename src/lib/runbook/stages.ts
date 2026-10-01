import type { StageDef, StageId } from "./types";

export const STAGES: StageDef[] = [
  { id: "upload", index: 1, label: "Upload Requirement", caption: "Pick a requirement document" },
  { id: "analysis", index: 2, label: "AI Analysis", caption: "Parsing scope and intent" },
  { id: "gaps", index: 3, label: "Gap Detection", caption: "What the document never says" },
  { id: "questions", index: 4, label: "Human Decisions", caption: "Interactive questions" },
  { id: "agents", index: 5, label: "Agent Swarm", caption: "Specialists investigate" },
  { id: "approval", index: 6, label: "Human Approval", caption: "Sign off the decision log" },
  { id: "package", index: 7, label: "SDLC Package", caption: "Traceable deliverables" },
];

export const STAGE_ORDER: StageId[] = STAGES.map((s) => s.id);

export function stageIndex(id: StageId) {
  return STAGE_ORDER.indexOf(id);
}
