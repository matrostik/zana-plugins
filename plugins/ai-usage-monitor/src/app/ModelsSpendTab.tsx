import { useState } from 'react';
import type {
  BillingMode,
  BudgetMetric,
  BudgetPeriod,
  BudgetRuleInput,
  BudgetScopeType,
  DashboardPayload,
  ModelPricingRule
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

export function ModelsSpendTab({
  data,
  onSaveBudget,
  onDeleteBudget,
  onSavePricing,
  onDeletePricing
}: ModelsSpendTabProps) {
  const [groupBy, setGroupBy] = useState<GroupMode>('model');
  const [unit, setUnit] = useState<ChartUnit>('usd');
  const [search, setSearch] = useState('');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showPricingForm, setShowPricingForm] = useState(false);

  const [bName, setBName] = useState('Monthly Spend Cap');
  const [bScopeType, setBScopeType] = useState<BudgetScopeType>('global');
  const [bScopeId, setBScopeId] = useState('');
  const [bPeriod, setBPeriod] = useState<BudgetPeriod>('monthly');
  const [bMetric, setBMetric] = useState<BudgetMetric>('billed_usd');
  const [bLimit, setBLimit] = useState('200');
  const [bAlertPct, setBAlertPct] = useState('80');

  const [pPattern, setPPattern] = useState('');
  const [pIn, setPIn] = useState('3');
  const [pCached, setPCached] = useState('0.3');
  const [pOut, setPOut] = useState('15');

  const query = search.trim().toLowerCase();
  const maxDayVal = Math.max(
    0.0001,
    ...data.dailyTrend.map((d) => (unit === 'usd' ? d.totalUsd : d.totalTokens))
  );
  const activeHover = hoveredDay !== null ? data.dailyTrend[hoveredDay] : data.dailyTrend[data.dailyTrend.length - 1];

  async function submitBudget(e: React.FormEvent) {
    e.preventDefault();
    const limitValue = Number.parseFloat(bLimit);
    const alertThresholdPct = Number.parseFloat(bAlertPct);
    if (!bName.trim() || !Number.isFinite(limitValue) || limitValue <= 0) return;
    await onSaveBudget({
      name: bName.trim(),
      scopeType: bScopeType,
      scopeId: bScopeType === 'global' ? '' : bScopeId.trim(),
      period: bPeriod,
      metric: bMetric,
      limitValue,
      alertThresholdPct: Number.isFinite(alertThresholdPct) ? alertThresholdPct : 80,
      enabled: true
    });
    setShowBudgetForm(false);
  }

  async function submitPricing(e: React.FormEvent) {
    e.preventDefault();
    if (!pPattern.trim()) return;
    await onSavePricing({
      pattern: pPattern.trim(),
      inputPer1M: Number.parseFloat(pIn) || 0,
      cachedInputPer1M: Number.parseFloat(pCached) || 0,
      outputPer1M: Number.parseFloat(pOut) || 0,
      reasoningPer1M: Number.parseFloat(pOut) || 0,
      billingMode: null
    });
    setPPattern('');
    setShowPricingForm(false);
  }

  const filteredModels = data.models.filter(
    (m) =>
      !query ||
      m.model.toLowerCase().includes(query) ||
      m.providerId.toLowerCase().includes(query) ||
      m.billingMode.toLowerCase().includes(query)
  );
  const filteredProjects = data.projects.filter(
    (p) =>
      !query ||
      p.projectName.toLowerCase().includes(query) ||
      p.projectId.toLowerCase().includes(query) ||
      (p.topModel ?? '').toLowerCase().includes(query)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="aum-split-2">
        <div className="aum-card">
          <div className="aum-row-between">
            <div>
              <strong style={{ fontSize: 13 }}>Daily Consumption &amp; Cost Trend</strong>
              <div className="aum-subtext">Stacked by provider across indexed thread turns</div>
            </div>
            <div className="aum-seg">
              <button type="button" className={unit === 'usd' ? 'active' : ''} onClick={() => setUnit('usd')}>
                USD ($)
              </button>
              <button type="button" className={unit === 'tok' ? 'active' : ''} onClick={() => setUnit('tok')}>
                Tokens
              </button>
            </div>
          </div>

          {data.dailyTrend.length === 0 ? (
            <div className="aum-window-box aum-muted">No turn consumption recorded in this time range yet.</div>
          ) : (
            <div className="aum-chart-box">
              {data.dailyTrend.map((day, idx) => {
                const map = unit === 'usd' ? day.byProviderUsd : day.byProviderTokens;
                const entries = Object.entries(map).filter(([, v]) => v > 0);
                return (
                  <div
                    key={day.date}
                    className="aum-day-col"
                    title={`${day.date}: ${formatUsd(day.totalUsd)} (${formatTokens(day.totalTokens)} tok)`}
                    onMouseEnter={() => setHoveredDay(idx)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {entries.map(([provId, val]) => (
                      <div
                        key={provId}
                        className="aum-day-seg"
                        style={{
                          height: `${Math.max(3, (val / maxDayVal) * 100)}%`,
                          background: providerColor(provId)
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          <div className="aum-row-between aum-subtext aum-mono">
            <span>
              {activeHover
                ? `${activeHover.date}: ${formatUsd(activeHover.totalUsd)} • ${formatTokens(activeHover.totalTokens)} tok`
                : 'Hover any bar to inspect daily breakdown'}
            </span>
            <span>{data.dailyTrend.length} active days</span>
          </div>
        </div>

        <div className="aum-card">
          <div className="aum-row-between">
            <div>
              <strong style={{ fontSize: 13 }}>Active Budgets &amp; Alerts</strong>
              <div className="aum-subtext">Auto-notifies ZCC Inbox on warning or breach</div>
            </div>
            <button type="button" className="aum-btn aum-btn-primary aum-btn-sm" onClick={() => setShowBudgetForm((v) => !v)}>
              {showBudgetForm ? 'Close' : '+ New Rule'}
            </button>
          </div>

          {showBudgetForm && (
            <form className="aum-window-box" onSubmit={submitBudget} style={{ gap: 8 }}>
              <input className="aum-input" placeholder="Budget name" value={bName} onChange={(e) => setBName(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <select className="aum-select" value={bScopeType} onChange={(e) => setBScopeType(e.target.value as BudgetScopeType)}>
                  <option value="global">Scope: Global</option>
                  <option value="provider">Scope: Provider</option>
                  <option value="model">Scope: Model</option>
                  <option value="project">Scope: Project</option>
                </select>
                {bScopeType !== 'global' && (
                  <input className="aum-input" placeholder={`${bScopeType} ID`} value={bScopeId} onChange={(e) => setBScopeId(e.target.value)} />
                )}
                <select className="aum-select" value={bPeriod} onChange={(e) => setBPeriod(e.target.value as BudgetPeriod)}>
                  <option value="5h">Period: 5h Window</option>
                  <option value="daily">Period: Daily</option>
                  <option value="weekly">Period: Weekly</option>
                  <option value="monthly">Period: Monthly</option>
                </select>
                <select className="aum-select" value={bMetric} onChange={(e) => setBMetric(e.target.value as BudgetMetric)}>
                  <option value="billed_usd">Metric: Billed USD</option>
                  <option value="total_usd">Metric: Total Value USD</option>
                  <option value="tokens">Metric: Tokens</option>
                </select>
                <input className="aum-input" type="number" step="0.01" placeholder="Limit" value={bLimit} onChange={(e) => setBLimit(e.target.value)} />
                <input className="aum-input" type="number" step="1" placeholder="Alert %" value={bAlertPct} onChange={(e) => setBAlertPct(e.target.value)} />
              </div>
              <button type="submit" className="aum-btn aum-btn-primary aum-btn-sm">
                Save Budget Rule
              </button>
            </form>
          )}

          {data.budgets.length === 0 ? (
            <div className="aum-window-box aum-muted">No budgets configured. Create a rule to track remaining allowance and get Inbox warnings.</div>
          ) : (
            data.budgets.map((b) => {
              const barColor = b.status === 'exceeded' ? '#f43f5e' : b.status === 'warning' ? '#f59e0b' : '#10b981';
              const valFmt = (v: number) => (b.rule.metric === 'tokens' ? formatTokens(v) : formatUsd(v));
              return (
                <div key={b.rule.id} className="aum-window-box">
                  <div className="aum-row-between aum-mono" style={{ fontSize: 11 }}>
                    <span>{b.rule.name}</span>
                    <span style={{ color: barColor }}>
                      {valFmt(b.currentValue)} / {valFmt(b.limitValue)} ({b.percentUsed}%)
                    </span>
                  </div>
                  <div className="aum-bar-track">
                    <div className="aum-bar-fill" style={{ width: `${Math.min(100, b.percentUsed)}%`, background: barColor }} />
                  </div>
                  <div className="aum-row-between aum-subtext aum-mono">
                    <span>
                      {valFmt(b.remainingValue)} left • {b.rule.period} • {formatCountdown(b.resetsAtMs)}
                    </span>
                    <button type="button" className="aum-btn aum-btn-danger aum-btn-sm" onClick={() => void onDeleteBudget(b.rule.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="aum-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="aum-row-between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--aum-border)' }}>
          <strong style={{ fontSize: 13 }}>Per-Model &amp; Per-Project Consumption Ledger</strong>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="aum-input"
              placeholder="Filter model, provider, or project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220 }}
            />
            <div className="aum-seg">
              <button type="button" className={groupBy === 'model' ? 'active' : ''} onClick={() => setGroupBy('model')}>
                By Model ({filteredModels.length})
              </button>
              <button type="button" className={groupBy === 'project' ? 'active' : ''} onClick={() => setGroupBy('project')}>
                By Project ({filteredProjects.length})
              </button>
            </div>
            <button type="button" className="aum-btn aum-btn-sm" onClick={() => setShowPricingForm((v) => !v)}>
              {showPricingForm ? 'Close Rates' : '+ Custom Rate'}
            </button>
          </div>
        </div>

        {showPricingForm && (
          <form
            onSubmit={submitPricing}
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--aum-border)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)'
            }}
          >
            <input className="aum-input" placeholder="Model pattern (e.g. claude-opus-4*)" value={pPattern} onChange={(e) => setPPattern(e.target.value)} style={{ width: 200 }} />
            <input className="aum-input" type="number" step="0.01" placeholder="$/1M in" value={pIn} onChange={(e) => setPIn(e.target.value)} style={{ width: 90 }} />
            <input className="aum-input" type="number" step="0.01" placeholder="$/1M cached" value={pCached} onChange={(e) => setPCached(e.target.value)} style={{ width: 100 }} />
            <input className="aum-input" type="number" step="0.01" placeholder="$/1M out" value={pOut} onChange={(e) => setPOut(e.target.value)} style={{ width: 90 }} />
            <button type="submit" className="aum-btn aum-btn-primary aum-btn-sm">
              Save Rate Override
            </button>
            {data.pricingRules.filter((r) => r.isOverride).map((r) => (
              <span key={r.pattern} className="aum-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {r.pattern}: ${r.inputPer1M}/${r.outputPer1M}
                <button type="button" onClick={() => void onDeletePricing(r.pattern)} style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer' }}>
                  ×
                </button>
              </span>
            ))}
          </form>
        )}

        <div className="aum-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          {groupBy === 'model' ? (
            <table className="aum-table">
              <thead>
                <tr>
                  <th>Model / Provider</th>
                  <th>Billing</th>
                  <th>Turns (Subagents)</th>
                  <th>Input (Cache Hit)</th>
                  <th>Output / Reasoning</th>
                  <th>Rate ($/1M in · out)</th>
                  <th style={{ textAlign: 'right' }}>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="aum-muted">
                      No model usage indexed for this range.
                    </td>
                  </tr>
                ) : (
                  filteredModels.map((row) => {
                    const pill = billingPill(row.billingMode);
                    return (
                      <tr key={`${row.providerId}:${row.model}`}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{row.model}</div>
                          <div className="aum-subtext aum-mono">{row.providerId}</div>
                        </td>
                        <td>
                          <span className={pill.cls}>{pill.text}</span>
                        </td>
                        <td className="aum-mono">
                          {row.turnCount} <span className="aum-subtext">({row.subagentTurnCount} sub)</span>
                        </td>
                        <td className="aum-mono">
                          {formatTokens(row.inputTokens)}{' '}
                          <span style={{ color: '#34d399' }}>({row.cacheHitPercent}%)</span>
                        </td>
                        <td className="aum-mono">
                          {formatTokens(row.outputTokens)} / {formatTokens(row.reasoningOutputTokens)}
                        </td>
                        <td className="aum-mono">
                          ${row.inputRatePer1M} · ${row.outputRatePer1M}
                        </td>
                        <td className="aum-mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatUsd(row.estimatedCostUsd)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="aum-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Top Provider / Model</th>
                  <th>Turns (Subagents)</th>
                  <th>Tokens</th>
                  <th>Billed Spend</th>
                  <th>Sub Equiv</th>
                  <th style={{ textAlign: 'right' }}>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="aum-muted">
                      No project usage indexed for this range.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((row) => (
                    <tr key={row.projectId}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.projectName}</div>
                        <div className="aum-subtext aum-mono">{row.projectId}</div>
                      </td>
                      <td className="aum-mono">
                        {row.topProviderId ?? '—'} {row.topModel ? `• ${row.topModel}` : ''}
                      </td>
                      <td className="aum-mono">
                        {row.turnCount} ({row.subagentTurnCount} sub)
                      </td>
                      <td className="aum-mono">{formatTokens(row.totalTokens)}</td>
                      <td className="aum-mono">{formatUsd(row.billedCostUsd)}</td>
                      <td className="aum-mono">{formatUsd(row.subscriptionEquivUsd)}</td>
                      <td className="aum-mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatUsd(row.estimatedCostUsd)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
