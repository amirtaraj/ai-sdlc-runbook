import type {
  AgentDef,
  ArtifactTab,
  Decision,
  Gap,
  Question,
  Scenario,
} from "./types";
import { getScenario, SCENARIOS } from "./scenarios";

/**
 * ---------------------------------------------------------------------------
 * RUNBOOK SERVICE
 * ---------------------------------------------------------------------------
 * Every piece of "intelligence" in the demo goes through this interface, so
 * the UI never talks to data directly. To connect a real backend or a real
 * agent service later, implement `RunbookService` against your API and swap
 * the export at the bottom of this file — no UI changes needed.
 *
 *   export const runbookService: RunbookService = new HttpRunbookService();
 */
export interface RunbookService {
  listScenarios(): Scenario[];
  getScenario(id: string): Scenario;
  /** Streams analysis findings one at a time. */
  analyze(scenarioId: string, onFinding: (line: string, i: number) => void): Promise<void>;
  detectGaps(scenarioId: string): Promise<Gap[]>;
  getQuestions(scenarioId: string): Promise<Question[]>;
  /** Runs one specialist agent, streaming log lines and progress. */
  runAgent(
    agent: AgentDef,
    decisions: Decision[],
    onTick: (progress: number, visibleLogs: number) => void,
    signal?: { cancelled: boolean },
  ): Promise<void>;
  generatePackage(scenarioId: string, decisions: Decision[]): Promise<ArtifactTab[]>;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Mock implementation: deterministic, timed, no network. */
export class MockRunbookService implements RunbookService {
  /** Global speed multiplier — lower it to make the demo run faster. */
  constructor(private speed = 1) {}

  listScenarios() {
    return SCENARIOS;
  }

  getScenario(id: string) {
    return getScenario(id);
  }

  async analyze(scenarioId: string, onFinding: (line: string, i: number) => void) {
    const scenario = this.getScenario(scenarioId);
    for (let i = 0; i < scenario.analysisFindings.length; i++) {
      await wait(260 * this.speed);
      onFinding(scenario.analysisFindings[i]!, i);
    }
  }

  async detectGaps(scenarioId: string) {
    await wait(500 * this.speed);
    return this.getScenario(scenarioId).gaps;
  }

  async getQuestions(scenarioId: string) {
    return this.getScenario(scenarioId).questions;
  }

  async runAgent(
    agent: AgentDef,
    _decisions: Decision[],
    onTick: (progress: number, visibleLogs: number) => void,
    signal?: { cancelled: boolean },
  ) {
    const total = agent.durationMs * this.speed;
    const steps = Math.max(agent.logs.length * 6, 18);
    for (let s = 1; s <= steps; s++) {
      if (signal?.cancelled) return;
      await wait(total / steps);
      const progress = s / steps;
      const visibleLogs = Math.min(
        agent.logs.length,
        Math.ceil(progress * agent.logs.length),
      );
      onTick(progress, visibleLogs);
    }
  }

  async generatePackage(scenarioId: string, decisions: Decision[]) {
    await wait(900 * this.speed);
    return this.getScenario(scenarioId).buildPackage(decisions);
  }
}

export const runbookService: RunbookService = new MockRunbookService(1);
