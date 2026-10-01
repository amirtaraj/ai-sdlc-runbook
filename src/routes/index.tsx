import { createFileRoute } from "@tanstack/react-router";
import { RunbookProvider, useRunbook } from "@/lib/runbook/store";
import { STAGES } from "@/lib/runbook/stages";
import { runbookService } from "@/lib/runbook/service";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI SDLC Runbook — Requirement to Delivery Package" },
      { name: "description", content: "Upload a requirement, resolve gaps, run specialist AI agents and generate a traceable SDLC package." },
      { property: "og:title", content: "AI SDLC Runbook" },
      { property: "og:description", content: "From requirement to traceable SDLC package with AI agents and human decisions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RunbookProvider>
      <Runbook />
    </RunbookProvider>
  ),
});

function Runbook() {
  const rb = useRunbook();
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-border p-4 space-y-1">
        <h1 className="mb-4 font-bold">AI SDLC Runbook</h1>
        {STAGES.map((s) => {
          const st = rb.stageStatus(s.id);
          return (
            <button
              key={s.id}
              disabled={st === "locked"}
              onClick={() => rb.goTo(s.id)}
              className={`block w-full rounded px-2 py-2 text-left text-sm ${st === "active" ? "bg-primary text-primary-foreground" : st === "latched" ? "bg-muted" : "opacity-40"}`}
            >
              {s.index}. {s.label}
              <div className="text-xs opacity-70">{s.caption}</div>
            </button>
          );
        })}
        {rb.scenario && (
          <Button variant="outline" size="sm" className="mt-4 w-full" onClick={rb.reset}>Reset</Button>
        )}
      </aside>
      <main className="flex-1 p-6 space-y-4">
        <Stage />
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-card p-4">{children}</div>;
}

function Stage() {
  const rb = useRunbook();
  const sc = rb.scenario;
  switch (rb.stage) {
    case "upload":
      return (
        <>
          <h2 className="text-xl font-semibold">Step 1 · Upload Requirement</h2>
          {runbookService.listScenarios().map((s) => (
            <Card key={s.id}>
              <div className="font-medium">{s.fileName} <span className="text-xs text-muted-foreground">{s.sizeLabel}</span></div>
              <p className="my-2 text-sm text-muted-foreground">{s.blurb}</p>
              <Button onClick={() => rb.selectScenario(s.id)}>Use this document</Button>
            </Card>
          ))}
        </>
      );
    case "analysis":
      return (
        <>
          <h2 className="text-xl font-semibold">Step 2 · AI analyzes</h2>
          <Card>
            <ul className="space-y-1 text-sm">
              {rb.findings.map((f, i) => <li key={i}>✓ {f}</li>)}
              {!rb.analysisDone && <li className="text-muted-foreground">Analyzing…</li>}
            </ul>
          </Card>
        </>
      );
    case "gaps":
      return (
        <>
          <h2 className="text-xl font-semibold">Step 3 · AI identifies gaps</h2>
          <p>"I need {sc?.questions.length} decisions from you."</p>
          {sc?.gaps.map((g) => (
            <Card key={g.id}>
              <div className="font-medium">{g.id} · {g.title} <span className="text-xs uppercase">({g.severity})</span></div>
              <p className="text-sm text-muted-foreground">{g.detail}</p>
            </Card>
          ))}
          <Button onClick={() => rb.goTo("questions")} disabled={false}>Answer questions</Button>
        </>
      );
    case "questions":
      return (
        <>
          <h2 className="text-xl font-semibold">Step 4 · Interactive questions</h2>
          {sc?.questions.map((q) => (
            <Card key={q.id}>
              <div className="font-medium">{q.id} · {q.prompt}</div>
              <p className="mb-2 text-sm text-muted-foreground">{q.context}</p>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o) => (
                  <Button key={o.id} size="sm" variant={rb.answers[q.id] === o.id ? "default" : "outline"} onClick={() => rb.answer(q.id, o.id)}>
                    {o.label}
                  </Button>
                ))}
              </div>
            </Card>
          ))}
          <Button onClick={rb.submitAnswers}>Submit decisions</Button>
        </>
      );
    case "agents":
      return (
        <>
          <h2 className="text-xl font-semibold">Step 5 · Specialist agents activate</h2>
          {sc?.agents.map((a) => {
            const run = rb.agentRuns[a.id];
            return (
              <Card key={a.id}>
                <div className="flex justify-between font-medium">
                  <span>{a.name}</span>
                  <span className="text-sm">{run?.status === "done" ? "✓" : run?.status ?? "pending"}</span>
                </div>
                <div className="my-2 h-1.5 rounded bg-muted">
                  <div className="h-full rounded bg-primary" style={{ width: `${(run?.progress ?? 0) * 100}%` }} />
                </div>
                <ul className="text-xs text-muted-foreground">
                  {a.logs.slice(0, run?.visibleLogs ?? 0).map((l, i) => <li key={i}>{l.t} {l.text}</li>)}
                </ul>
              </Card>
            );
          })}
        </>
      );
    case "approval":
      return (
        <>
          <h2 className="text-xl font-semibold">Step 6 · Human approval</h2>
          {rb.decisions.map((d) => (
            <Card key={d.id}>
              <div className="font-medium">{d.id} · {d.title}</div>
              <p className="text-sm">→ {d.chosenLabel}</p>
            </Card>
          ))}
          <div className="flex gap-2">
            <Button onClick={rb.approve}>Approve</Button>
            <Button variant="outline" onClick={rb.reopenDecisions}>Change decisions</Button>
          </div>
        </>
      );
    case "package":
      return (
        <>
          <h2 className="text-xl font-semibold">Step 7 · SDLC Package Generated</h2>
          {!rb.artifacts ? <p>Generating…</p> : (
            <>
              <div className="flex flex-wrap gap-2">
                {rb.artifacts.map((t) => (
                  <Button key={t.id} size="sm" variant={rb.activeTab === t.id ? "default" : "outline"} onClick={() => rb.setActiveTab(t.id)}>{t.label}</Button>
                ))}
              </div>
              {rb.artifacts.filter((t) => t.id === rb.activeTab).map((t) => (
                <div key={t.id} className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t.summary}</p>
                  {t.items.map((it) => (
                    <Card key={it.id}>
                      <div className="font-medium">{it.id} · {it.title}</div>
                      <p className="text-sm">{it.body}</p>
                      <p className="text-xs text-muted-foreground">Traces: {it.traces.join(", ")}</p>
                    </Card>
                  ))}
                </div>
              ))}
            </>
          )}
        </>
      );
  }
}
