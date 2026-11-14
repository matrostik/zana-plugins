import { useState } from 'react';
import type {
  BillingMode,
  BudgetEvaluation,
  BudgetMetric,
  BudgetPeriod,
  BudgetRuleInput,
  BudgetScopeType,
  DailySpendPoint,
  DashboardPayload,
  ModelConsumptionRow,
  ModelPricingRule,
  ProjectConsumptionRow
} from '../shared/types.ts';
import { formatCountdown, formatTokens, formatUsd, providerColor } from './format.ts';

interface ModelsSpendTabProps {
  data: DashboardPayload;
  onSaveBudget: (input: BudgetRuleInput) => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
  onSavePricing: (rule: Omit<ModelPricingRule, 'isOverride'>) => Promise<void>;
  onDeletePricing: (pattern: string) => Promise<void>;
}

type GroupMode = 'model' | 'project';
type ChartUnit = 'usd' | 'tok';

function billingPill(mode: BillingMode): { cls: string; text: string } {
  if (mode === 'subscription') return { cls: 'aum-pill aum-pill-emerald', text: 'Subscription' };
  if (mode === 'free') return { cls: 'aum-pill aum-pill-neutral', text: 'Free / Local' };
  return { cls: 'aum-pill aum-pill-indigo', text: 'Billed API' };
}

function DailyTrendCard({ dailyTrend }: { dailyTrend: DailySpendPoint[] }) {
  const [unit, setUnit] = useState<ChartUnit>('usd');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const maxDayVal = Math.max(0.0001, ...dailyTrend.map((d) => (unit === 'usd' ? d.totalUsd : d.totalTokens)));
  const activeHover = hoveredDay !== null ? dailyTrend[hoveredDay] : dailyTrend[dailyTrend.length - 1];

  return (
    <div className="aum-card">
      <div className="aum-row-between">
        <div>
          <strong style={{ fontSize: 13 }}>Daily Consumption &amp; Cost Trend</strong>
          <div className="aum-subtext">Stacked by provider across indexed thread turns</div>
        </div>
        <div className="aum-seg">
          <button type="button" className={unit === 'usd' ? 'active' : ''} onClick={() => setUnit('usd')}>USD ($)</button>
          <button type="button" className={unit === 'tok' ? 'active' : ''} onClick={() => setUnit('tok')}>Tokens</button>
        </div>
      </div>
      {dailyTrend.length === 0 ? (
        <div className="aum-window-box aum-muted">No turn consumption recorded in this time range yet.</div>
      ) : (
        <div className="aum-chart-box">
          {dailyTrend.map((day, idx) => {
            const entries = Object.entries(unit === 'usd' ? day.byProviderUsd : day.byProviderTokens).filter(([, v]) => v > 0);
            return (
              <div
                key={day.date} className="aum-day-col"
                title={`${day.date}: ${formatUsd(day.totalUsd)} (${formatTokens(day.totalTokens)} tok)`}
                onMouseEnter={() => setHoveredDay(idx)} onMouseLeave={() => setHoveredDay(null)}
              >
                {entries.map(([provId, val]) => (
                  <div key={provId} className="aum-day-seg" style={{ height: `${Math.max(3, (val / maxDayVal) * 100)}%`, background: providerColor(provId) }} />
                ))}
              </div>
            );
          })}
        </div>
      )}
      <div className="aum-row-between aum-subtext aum-mono">
        <span>{activeHover ? `${activeHover.date}: ${formatUsd(activeHover.totalUsd)} • ${formatTokens(activeHover.totalTokens)} tok` : 'Hover any bar to inspect daily breakdown'}</span>
        <span>{dailyTrend.length} active days</span>
      </div>
    </div>
  );
}

function validateBudgetForm(args: {
  name: string;
  scopeType: BudgetScopeType;
  scopeId: string;
  period: BudgetPeriod;
  metric: BudgetMetric;
  limit: string;
  alertPct: string;
}): { error: string } | { input: BudgetRuleInput } {
  const limitValue = Number.parseFloat(args.limit);
  const alertThresholdPct = Number.parseFloat(args.alertPct);
  const trimmedScopeId = args.scopeId.trim();
  if (!args.name.trim() || !Number.isFinite(limitValue) || limitValue <= 0) {
    return { error: 'Budget name and a positive limit are required.' };
  }
  if (args.scopeType !== 'global' && !trimmedScopeId) {
    return { error: `Enter a ${args.scopeType} ID for this scoped budget.` };
  }
  return {
    input: {
      name: args.name.trim(), scopeType: args.scopeType, scopeId: args.scopeType === 'global' ? '' : trimmedScopeId,
      period: args.period, metric: args.metric, limitValue,
      alertThresholdPct: Number.isFinite(alertThresholdPct) ? alertThresholdPct : 80, enabled: true
    }
  };
}

function BudgetRuleForm({ onSave, onDone }: { onSave: (input: BudgetRuleInput) => Promise<void>; onDone: () => void }) {
  const [name, setName] = useState('Monthly Spend Cap');
  const [scopeType, setScopeType] = useState<BudgetScopeType>('global');
  const [scopeId, setScopeId] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [metric, setMetric] = useState<BudgetMetric>('billed_usd');
  const [limit, setLimit] = useState('200');
  const [alertPct, setAlertPct] = useState('80');
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = validateBudgetForm({ name, scopeType, scopeId, period, metric, limit, alertPct });
    if ('error' in res) { setValidationError(res.error); return; }
    setValidationError(null);
    await onSave(res.input);
    onDone();
  }

  return (
    <form className="aum-window-box" onSubmit={handleSubmit} style={{ gap: 8 }}>
      <input className="aum-input" placeholder="Budget name" value={name} onChange={(e) => setName(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <select className="aum-select" value={scopeType} onChange={(e) => { setScopeType(e.target.value as BudgetScopeType); setValidationError(null); }}>
          <option value="global">Scope: Global</option><option value="provider">Scope: Provider</option>
          <option value="model">Scope: Model</option><option value="project">Scope: Project</option>
        </select>
        {scopeType !== 'global' && (
          <input className="aum-input" required placeholder={`${scopeType} ID`} value={scopeId} onChange={(e) => { setScopeId(e.target.value); setValidationError(null); }} />
        )}
        <select className="aum-select" value={period} onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}>
          <option value="5h">Period: 5h Window</option><option value="daily">Period: Daily</option>
          <option value="weekly">Period: Weekly</option><option value="monthly">Period: Monthly</option>
        </select>
        <select className="aum-select" value={metric} onChange={(e) => setMetric(e.target.value as BudgetMetric)}>
          <option value="billed_usd">Metric: Billed USD</option><option value="total_usd">Metric: Total Value USD</option>
          <option value="tokens">Metric: Tokens</option>
        </select>
        <input className="aum-input" type="number" step="0.01" placeholder="Limit" value={limit} onChange={(e) => setLimit(e.target.value)} />
        <input className="aum-input" type="number" step="1" placeholder="Alert %" value={alertPct} onChange={(e) => setAlertPct(e.target.value)} />
      </div>
      {validationError && <div className="aum-banner aum-banner-error" role="alert">{validationError}</div>}
      <button type="submit" className="aum-btn aum-btn-primary aum-btn-sm">Save Budget Rule</button>
    </form>
  );
}

function BudgetsCard({ budgets, onSaveBudget, onDeleteBudget }: {
  budgets: BudgetEvaluation[];
  onSaveBudget: (input: BudgetRuleInput) => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="aum-card">
      <div className="aum-row-between">
        <div>
          <strong style={{ fontSize: 13 }}>Active Budgets &amp; Alerts</strong>
          <div className="aum-subtext">Auto-notifies ZCC Inbox on warning or breach</div>
        </div>
        <button type="button" className="aum-btn aum-btn-primary aum-btn-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : '+ New Rule'}
        </button>
      </div>
      {showForm && <BudgetRuleForm onSave={onSaveBudget} onDone={() => setShowForm(false)} />}
      {budgets.length === 0 ? (
        <div className="aum-window-box aum-muted">No budgets configured. Create a rule to track remaining allowance and get Inbox warnings.</div>
      ) : (
        budgets.map((b) => {
          const barColor = b.status === 'exceeded' ? '#f43f5e' : b.status === 'warning' ? '#f59e0b' : '#10b981';
          const valFmt = (v: number) => (b.rule.metric === 'tokens' ? formatTokens(v) : formatUsd(v));
          return (
            <div key={b.rule.id} className="aum-window-box">
              <div className="aum-row-between aum-mono" style={{ fontSize: 11 }}>
                <span>{b.rule.name}</span>
                <span style={{ color: barColor }}>{valFmt(b.currentValue)} / {valFmt(b.limitValue)} ({b.percentUsed}%)</span>
              </div>
              <div className="aum-bar-track"><div className="aum-bar-fill" style={{ width: `${Math.min(100, b.percentUsed)}%`, background: barColor }} /></div>
              <div className="aum-row-between aum-subtext aum-mono">
                <span>{valFmt(b.remainingValue)} left • {b.rule.period} • {formatCountdown(b.resetsAtMs)}</span>
                <button type="button" className="aum-btn aum-btn-danger aum-btn-sm" onClick={() => void onDeleteBudget(b.rule.id)}>Delete</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function PricingOverrideForm({ pricingRules, onSave, onDelete, onDone }: {
  pricingRules: ModelPricingRule[];
  onSave: (rule: Omit<ModelPricingRule, 'isOverride'>) => Promise<void>;
  onDelete: (pattern: string) => Promise<void>;
  onDone: () => void;
}) {
  const [pattern, setPattern] = useState('');
  const [inRate, setInRate] = useState('3');
  const [cachedRate, setCachedRate] = useState('0.3');
  const [outRate, setOutRate] = useState('15');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pattern.trim()) return;
    await onSave({
      pattern: pattern.trim(),
      inputPer1M: Number.parseFloat(inRate) || 0,
      cachedInputPer1M: Number.parseFloat(cachedRate) || 0,
      outputPer1M: Number.parseFloat(outRate) || 0,
      reasoningPer1M: Number.parseFloat(outRate) || 0,
      billingMode: null
    });
    setPattern('');
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '10px 14px', borderBottom: '1px solid var(--aum-border)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
      <input className="aum-input" placeholder="Model pattern (e.g. claude-opus-4*)" value={pattern} onChange={(e) => setPattern(e.target.value)} style={{ width: 200 }} />
      <input className="aum-input" type="number" step="0.01" placeholder="$/1M in" value={inRate} onChange={(e) => setInRate(e.target.value)} style={{ width: 90 }} />
      <input className="aum-input" type="number" step="0.01" placeholder="$/1M cached" value={cachedRate} onChange={(e) => setCachedRate(e.target.value)} style={{ width: 100 }} />
      <input className="aum-input" type="number" step="0.01" placeholder="$/1M out" value={outRate} onChange={(e) => setOutRate(e.target.value)} style={{ width: 90 }} />
      <button type="submit" className="aum-btn aum-btn-primary aum-btn-sm">Save Rate Override</button>
      {pricingRules.filter((r) => r.isOverride).map((r) => (
        <span key={r.pattern} className="aum-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {r.pattern}: ${r.inputPer1M}/${r.outputPer1M}
          <button type="button" onClick={() => void onDelete(r.pattern)} style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer' }}>×</button>
        </span>
      ))}
    </form>
  );
}

function ModelsLedgerTable({ rows }: { rows: ModelConsumptionRow[] }) {
  return (
    <table className="aum-table">
      <thead>
        <tr>
          <th>Model / Provider</th><th>Billing</th><th>Turns (Subagents)</th><th>Input (Cache Hit)</th>
          <th>Output / Reasoning</th><th>Rate ($/1M in · out)</th><th style={{ textAlign: 'right' }}>Total Cost</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={7} className="aum-muted">No model usage indexed for this range.</td></tr>
        ) : (
          rows.map((row) => {
            const pill = billingPill(row.billingMode);
            return (
              <tr key={`${row.providerId}:${row.model}`}>
                <td><div style={{ fontWeight: 600 }}>{row.model}</div><div className="aum-subtext aum-mono">{row.providerId}</div></td>
                <td><span className={pill.cls}>{pill.text}</span></td>
                <td className="aum-mono">{row.turnCount} <span className="aum-subtext">({row.subagentTurnCount} sub)</span></td>
                <td className="aum-mono">{formatTokens(row.inputTokens)} <span style={{ color: '#34d399' }}>({row.cacheHitPercent}%)</span></td>
                <td className="aum-mono">{formatTokens(row.outputTokens)} / {formatTokens(row.reasoningOutputTokens)}</td>
                <td className="aum-mono">${row.inputRatePer1M} · ${row.outputRatePer1M}</td>
                <td className="aum-mono" style={{ textAlign: 'right', fontWeight: 600 }}>{formatUsd(row.estimatedCostUsd)}</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function ProjectsLedgerTable({ rows }: { rows: ProjectConsumptionRow[] }) {
  return (
    <table className="aum-table">
      <thead>
        <tr>
          <th>Project</th><th>Top Provider / Model</th><th>Turns (Subagents)</th><th>Tokens</th>
          <th>Billed Spend</th><th>Sub Equiv</th><th style={{ textAlign: 'right' }}>Total Value</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={7} className="aum-muted">No project usage indexed for this range.</td></tr>
        ) : (
          rows.map((row) => (
            <tr key={row.projectId}>
              <td><div style={{ fontWeight: 600 }}>{row.projectName}</div><div className="aum-subtext aum-mono">{row.projectId}</div></td>
              <td className="aum-mono">{row.topProviderId ?? '—'} {row.topModel ? `• ${row.topModel}` : ''}</td>
              <td className="aum-mono">{row.turnCount} ({row.subagentTurnCount} sub)</td>
              <td className="aum-mono">{formatTokens(row.totalTokens)}</td>
              <td className="aum-mono">{formatUsd(row.billedCostUsd)}</td>
              <td className="aum-mono">{formatUsd(row.subscriptionEquivUsd)}</td>
              <td className="aum-mono" style={{ textAlign: 'right', fontWeight: 600 }}>{formatUsd(row.estimatedCostUsd)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function ConsumptionLedgerCard({ data, onSavePricing, onDeletePricing }: {
  data: DashboardPayload;
  onSavePricing: (rule: Omit<ModelPricingRule, 'isOverride'>) => Promise<void>;
  onDeletePricing: (pattern: string) => Promise<void>;
}) {
  const [groupBy, setGroupBy] = useState<GroupMode>('model');
  const [search, setSearch] = useState('');
  const [showPricingForm, setShowPricingForm] = useState(false);
  const query = search.trim().toLowerCase();
  const filteredModels = data.models.filter((m) =>
    !query || m.model.toLowerCase().includes(query) || m.providerId.toLowerCase().includes(query) || m.billingMode.toLowerCase().includes(query));
  const filteredProjects = data.projects.filter((p) =>
    !query || p.projectName.toLowerCase().includes(query) || p.projectId.toLowerCase().includes(query) || (p.topModel ?? '').toLowerCase().includes(query));

  return (
    <div className="aum-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="aum-row-between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--aum-border)' }}>
        <strong style={{ fontSize: 13 }}>Per-Model &amp; Per-Project Consumption Ledger</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="aum-input" placeholder="Filter model, provider, or project..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
          <div className="aum-seg">
            <button type="button" className={groupBy === 'model' ? 'active' : ''} onClick={() => setGroupBy('model')}>By Model ({filteredModels.length})</button>
            <button type="button" className={groupBy === 'project' ? 'active' : ''} onClick={() => setGroupBy('project')}>By Project ({filteredProjects.length})</button>
          </div>
          <button type="button" className="aum-btn aum-btn-sm" onClick={() => setShowPricingForm((v) => !v)}>
            {showPricingForm ? 'Close Rates' : '+ Custom Rate'}
          </button>
        </div>
      </div>
      {showPricingForm && <PricingOverrideForm pricingRules={data.pricingRules} onSave={onSavePricing} onDelete={onDeletePricing} onDone={() => setShowPricingForm(false)} />}
      <div className="aum-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
        {groupBy === 'model' ? <ModelsLedgerTable rows={filteredModels} /> : <ProjectsLedgerTable rows={filteredProjects} />}
      </div>
    </div>
  );
}

export function ModelsSpendTab({ data, onSaveBudget, onDeleteBudget, onSavePricing, onDeletePricing }: ModelsSpendTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="aum-split-2">
        <DailyTrendCard dailyTrend={data.dailyTrend} />
        <BudgetsCard budgets={data.budgets} onSaveBudget={onSaveBudget} onDeleteBudget={onDeleteBudget} />
      </div>
      <ConsumptionLedgerCard data={data} onSavePricing={onSavePricing} onDeletePricing={onDeletePricing} />
    </div>
  );
}
