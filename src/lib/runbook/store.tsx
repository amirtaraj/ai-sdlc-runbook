import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { runbookService } from "./service";
import { stageIndex } from "./stages";
import type {
  AgentRun,
  ArtifactTab,
  ArtifactTabId,
  Decision,
  Scenario,
  StageId,
  StageStatus,
} from "./types";

interface RunbookState {
  scenario: Scenario | null;
  stage: StageId;
  reached: StageId[];
  findings: string[];
  analysisDone: boolean;
  answers: Record<string, string>; // questionId -> optionId
  decisions: Decision[];
  agentRuns: Record<string, AgentRun>;
  approved: boolean;
  artifacts: ArtifactTab[] | null;
  activeTab: ArtifactTabId;
  elapsed: number;
  focusedTrace: string | null;
}

interface RunbookApi extends RunbookState {
  stageStatus: (id: StageId) => StageStatus;
  goTo: (id: StageId) => void;
  selectScenario: (id: string) => void;
  answer: (questionId: string, optionId: string) => void;
  submitAnswers: () => void;
  approve: () => void;
  reopenDecisions: () => void;
  reset: () => void;
  focusTrace: (id: string | null) => void;
  setActiveTab: (id: ArtifactTabId) => void;
  agentsComplete: boolean;
  openGapCount: number;
}

const Ctx = createContext<RunbookApi | null>(null);

const initial: RunbookState = {
  scenario: null,
  stage: "upload",
  reached: ["upload"],
  findings: [],
  analysisDone: false,
  answers: {},
  decisions: [],
  agentRuns: {},
  approved: false,
  artifacts: null,
  activeTab: "requirement",
  elapsed: 0,
  focusedTrace: null,
};

export function RunbookProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RunbookState>(initial);
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const patch = useCallback(
    (p: Partial<RunbookState> | ((s: RunbookState) => Partial<RunbookState>)) =>
      setState((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) })),
    [],
  );

  const reach = useCallback(
    (id: StageId) =>
      setState((s) => ({
        ...s,
        stage: id,
        reached: s.reached.includes(id) ? s.reached : [...s.reached, id],
      })),
    [],
  );

  /* run clock -------------------------------------------------------------- */
  useEffect(() => {
    if (!state.scenario) return;
    const t = setInterval(() => patch((s) => ({ elapsed: s.elapsed + 1 })), 1000);
    return () => clearInterval(t);
  }, [state.scenario, patch]);

  /* stage 2: analysis ------------------------------------------------------ */
  useEffect(() => {
    if (state.stage !== "analysis" || !state.scenario || state.analysisDone) return;
    let cancelled = false;
    const id = state.scenario.id;
    (async () => {
      await runbookService.analyze(id, (line) => {
        if (cancelled) return;
        patch((s) => ({ findings: [...s.findings, line] }));
      });
      if (cancelled) return;
      await runbookService.detectGaps(id);
      if (cancelled) return;
      patch({ analysisDone: true });
      reach("gaps");
    })();
    return () => {
      cancelled = true;
    };
  }, [state.stage, state.scenario, state.analysisDone, patch, reach]);

  /* stage 5: agent swarm with dependency scheduling ------------------------ */
  useEffect(() => {
    if (state.stage !== "agents" || !state.scenario) return;
    const agents = state.scenario.agents;
    const alreadyStarted = Object.keys(state.agentRuns).length > 0;
    if (alreadyStarted) return;

    const signal = { cancelled: false };
    cancelRef.current = signal;

    setState((s) => ({
      ...s,
      agentRuns: Object.fromEntries(
        agents.map((a) => [a.id, { agentId: a.id, status: "pending", progress: 0, visibleLogs: 0 } as AgentRun]),
      ),
    }));

    const done = new Set<string>();
    const decisions = state.decisions;

    const runOne = async (agentId: string): Promise<void> => {
      const agent = agents.find((a) => a.id === agentId)!;
      await Promise.all(agent.dependsOn.map((d) => pending[d]!));
      if (signal.cancelled) return;
      setState((s) => ({
        ...s,
        agentRuns: { ...s.agentRuns, [agentId]: { agentId, status: "running", progress: 0, visibleLogs: 0 } },
      }));
      await runbookService.runAgent(
        agent,
        decisions,
        (progress, visibleLogs) =>
          setState((s) => ({
            ...s,
            agentRuns: { ...s.agentRuns, [agentId]: { agentId, status: "running", progress, visibleLogs } },
          })),
        signal,
      );
      if (signal.cancelled) return;
      done.add(agentId);
      setState((s) => ({
        ...s,
        agentRuns: {
          ...s.agentRuns,
          [agentId]: { agentId, status: "done", progress: 1, visibleLogs: agent.logs.length },
        },
      }));
    };

    const pending: Record<string, Promise<void>> = {};
    for (const a of agents) pending[a.id] = runOne(a.id);

    Promise.all(Object.values(pending)).then(() => {
      if (!signal.cancelled) reach("approval");
    });

    return () => {
      signal.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stage, state.scenario]);

  /* stage 7: package generation -------------------------------------------- */
  useEffect(() => {
    if (state.stage !== "package" || !state.scenario || state.artifacts) return;
    let cancelled = false;
    runbookService
      .generatePackage(state.scenario.id, state.decisions)
      .then((tabs) => !cancelled && patch({ artifacts: tabs }));
    return () => {
      cancelled = true;
    };
  }, [state.stage, state.scenario, state.artifacts, state.decisions, patch]);

  /* actions ---------------------------------------------------------------- */
  const selectScenario = useCallback(
    (id: string) => {
      const scenario = runbookService.getScenario(id);
      setState({ ...initial, scenario, stage: "analysis", reached: ["upload", "analysis"] });
    },
    [],
  );

  const answer = useCallback(
    (questionId: string, optionId: string) =>
      patch((s) => ({ answers: { ...s.answers, [questionId]: optionId } })),
    [patch],
  );

  const submitAnswers = useCallback(() => {
    setState((s) => {
      if (!s.scenario) return s;
      const decisions: Decision[] = s.scenario.questions.map((q) => {
        const optionId = s.answers[q.id] ?? q.options[0]!.id;
        const option = q.options.find((o) => o.id === optionId)!;
        return {
          id: q.decisionId,
          questionId: q.id,
          title: q.prompt,
          chosenOptionId: option.id,
          chosenLabel: option.label,
          rationale: option.rationale,
          approved: false,
          traces: [q.id, q.askedBy],
        };
      });
      return {
        ...s,
        decisions,
        agentRuns: {},
        stage: "agents",
        reached: s.reached.includes("agents") ? s.reached : [...s.reached, "agents"],
      };
    });
  }, []);

  const approve = useCallback(() => {
    setState((s) => ({
      ...s,
      approved: true,
      decisions: s.decisions.map((d) => ({ ...d, approved: true })),
      artifacts: null,
      stage: "package",
      reached: s.reached.includes("package") ? s.reached : [...s.reached, "package"],
    }));
  }, []);

  const reopenDecisions = useCallback(() => {
    cancelRef.current.cancelled = true;
    setState((s) => ({
      ...s,
      approved: false,
      artifacts: null,
      agentRuns: {},
      stage: "questions",
      reached: s.reached.filter((r) => stageIndex(r) <= stageIndex("questions")),
    }));
  }, []);

  const reset = useCallback(() => {
    cancelRef.current.cancelled = true;
    setState(initial);
  }, []);

  const goTo = useCallback(
    (id: StageId) =>
      setState((s) => (s.reached.includes(id) ? { ...s, stage: id } : stageIndex(id) === stageIndex(s.stage) + 1 && s.stage === "gaps" ? { ...s, stage: id, reached: [...s.reached, id] } : s)),
    [],
  );

  const stageStatus = useCallback(
    (id: StageId): StageStatus => {
      if (state.stage === id) return "active";
      if (!state.reached.includes(id)) return "locked";
      return stageIndex(id) < stageIndex(state.stage) ? "latched" : "latched";
    },
    [state.stage, state.reached],
  );

  const agentsComplete = useMemo(() => {
    const runs = Object.values(state.agentRuns);
    return runs.length > 0 && runs.every((r) => r.status === "done");
  }, [state.agentRuns]);

  const openGapCount = useMemo(() => {
    if (!state.scenario) return 0;
    return state.scenario.gaps.filter((g) => !state.answers[g.questionId]).length;
  }, [state.scenario, state.answers]);

  const api: RunbookApi = {
    ...state,
    stageStatus,
    goTo,
    selectScenario,
    answer,
    submitAnswers,
    approve,
    reopenDecisions,
    reset,
    focusTrace: (id) => patch({ focusedTrace: id }),
    setActiveTab: (id) => patch({ activeTab: id }),
    agentsComplete,
    openGapCount,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useRunbook() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRunbook must be used inside RunbookProvider");
  return ctx;
}
