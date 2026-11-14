import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import type { BudgetEvaluation, BudgetMetric, BudgetPeriod, BudgetRule } from '../shared/types.ts';
import { formatTokens, formatUsd } from '../shared/format.ts';
import type { UsageStore } from './db.ts';
import { errorMessage, localDateKey, localMidnightMs, withTimeout } from './util.ts';

export interface BudgetEvaluatorDeps {
  store: UsageStore;
  inbox: Pick<ZccPluginApi['sdk']['inbox'], 'push'>;
  projects: Pick<ZccPluginApi['sdk']['projects'], 'list'>;
  areAlertsEnabled: () => Promise<boolean>;
  log: Pick<ZccPluginApi['log'], 'warn'>;
  now?: () => number;
}

export function resolveBudgetWindow(
  period: BudgetPeriod,
  nowMs: number
): { sinceMs: number; resetsAtMs: number | null; periodKey: string } {
  const dt = new Date(nowMs);
  if (period === '5h') {
    const bucketMs = 5 * 3_600_000;
    const sinceMs = Math.floor(nowMs / bucketMs) * bucketMs;
    return { sinceMs, resetsAtMs: sinceMs + bucketMs, periodKey: `5h:${sinceMs}` };
  }
  if (period === 'daily') {
    const start = localMidnightMs(nowMs, 0);
    const resetsAtMs = localMidnightMs(nowMs, 1);
    return { sinceMs: start, resetsAtMs, periodKey: `d:${localDateKey(start)}` };
  }
  if (period === 'weekly') {
    const daysSinceMonday = (dt.getDay() + 6) % 7;
    const start = localMidnightMs(nowMs, -daysSinceMonday);
    const resetsAtMs = localMidnightMs(nowMs, -daysSinceMonday + 7);
    return { sinceMs: start, resetsAtMs, periodKey: `w:${localDateKey(start)}` };
  }
  const start = new Date(dt.getFullYear(), dt.getMonth(), 1, 0, 0, 0, 0).getTime();
  const nextMonth = new Date(dt.getFullYear(), dt.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
  return {
    sinceMs: start,
    resetsAtMs: nextMonth,
    periodKey: `m:${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
  };
}

function formatMetricValue(value: number, metric: BudgetMetric): string {
  return metric === 'tokens' ? `${formatTokens(value)} tokens` : formatUsd(value);
}

function evaluateRule(store: UsageStore, rule: BudgetRule, currentMs: number): BudgetEvaluation {
  const { sinceMs, resetsAtMs, periodKey } = resolveBudgetWindow(rule.period, currentMs);
  const currentValue = store.computeMetricInWindow({
    sinceMs,
    scopeType: rule.scopeType,
    scopeId: rule.scopeId,
    metric: rule.metric
  });
  const safeLimit = Math.max(0.0001, rule.limitValue);
  const percentUsed = Math.round((currentValue / safeLimit) * 1000) / 10;
  const remainingValue = Math.max(0, Number((rule.limitValue - currentValue).toFixed(4)));
  const status: BudgetEvaluation['status'] =
    currentValue >= rule.limitValue ? 'exceeded' : percentUsed >= rule.alertThresholdPct ? 'warning' : 'ok';

  return {
    rule,
    currentValue: Number(currentValue.toFixed(4)),
    limitValue: rule.limitValue,
    remainingValue,
    percentUsed,
    status,
    periodKey,
    resetsAtMs
  };
}

async function listAlertProjects(deps: BudgetEvaluatorDeps): Promise<Set<string> | null> {
  try {
    const projects = await withTimeout(deps.projects.list(), 3000, 'projects.list');
    return new Set(projects.map(p => p.id));
  } catch (err) {
    deps.log.warn(`ai-usage-monitor: failed listing projects for budget alerts: ${errorMessage(err)}`);
    return null;
  }
}

function resolveAlertProjectId(
  deps: BudgetEvaluatorDeps, rule: BudgetRule, sinceMs: number, projectIds: Set<string> | null
): string | null {
  if (rule.scopeType === 'project' && rule.scopeId) return rule.scopeId;
  const topProjectId = deps.store.findTopProjectInWindow({ sinceMs, scopeType: rule.scopeType,
    scopeId: rule.scopeId, metric: rule.metric });
  if (topProjectId && projectIds?.has(topProjectId)) return topProjectId;
  deps.log.warn(`ai-usage-monitor: skipping budget alert "${rule.name}" because no target project could be resolved.`);
  return null;
}

async function pushBudgetAlert(deps: BudgetEvaluatorDeps, item: BudgetEvaluation, projectId: string): Promise<void> {
  const level = item.status === 'exceeded' ? 'exceeded' : 'warning';
  const label = level === 'exceeded' ? 'Budget Exceeded' : 'Budget Warning';
  const comments = `[AI Usage Monitor] ${label}: "${item.rule.name}" reached ${item.percentUsed}% ` +
    `(${formatMetricValue(item.currentValue, item.rule.metric)} / ${formatMetricValue(item.limitValue, item.rule.metric)}).`;
  try {
    await deps.inbox.push({ projectId, comments });
    deps.store.markAlertSent(item.rule.id, item.periodKey, level);
  } catch (err) {
    deps.log.warn(`ai-usage-monitor: failed pushing inbox alert for ${item.rule.name}: ${errorMessage(err)}`);
  }
}

export function createBudgetEvaluator(deps: BudgetEvaluatorDeps) {
  const now = deps.now ?? Date.now;
  function evaluateAll(): BudgetEvaluation[] {
    const currentMs = now();
    return deps.store.listBudgets().map(rule => evaluateRule(deps.store, rule, currentMs));
  }

  async function checkAndNotify(): Promise<BudgetEvaluation[]> {
    const currentMs = now();
    const evaluations = deps.store.listBudgets().map(rule => evaluateRule(deps.store, rule, currentMs));
    if (!await deps.areAlertsEnabled()) return evaluations;
    const pending = evaluations.filter(item => item.rule.enabled && item.status !== 'ok' &&
      !deps.store.hasAlertBeenSent(item.rule.id, item.periodKey, item.status));
    const needsProjects = pending.some(item => item.rule.scopeType !== 'project');
    const projectIds = needsProjects ? await listAlertProjects(deps) : null;
    for (const item of pending) {
      const { sinceMs } = resolveBudgetWindow(item.rule.period, currentMs);
      const projectId = resolveAlertProjectId(deps, item.rule, sinceMs, projectIds);
      if (projectId) await pushBudgetAlert(deps, item, projectId);
    }
    return evaluations;
  }
  return { evaluateAll, checkAndNotify };
}

export type BudgetEvaluator = ReturnType<typeof createBudgetEvaluator>;
