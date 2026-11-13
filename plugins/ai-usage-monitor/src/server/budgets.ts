import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import type { BudgetEvaluation, BudgetMetric, BudgetPeriod, BudgetRule } from '../shared/types.ts';
import type { UsageStore } from './db.ts';
import { errorMessage } from './util.ts';

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
    const start = Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0);
    return { sinceMs: start, resetsAtMs: start + 86_400_000, periodKey: `d:${new Date(start).toISOString().slice(0, 10)}` };
  }
  if (period === 'weekly') {
    const day = dt.getUTCDay();
    const diffToMon = (day + 6) % 7;
    const start = Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() - diffToMon, 0, 0, 0, 0);
    return { sinceMs: start, resetsAtMs: start + 7 * 86_400_000, periodKey: `w:${new Date(start).toISOString().slice(0, 10)}` };
  }
  const start = Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 1, 0, 0, 0, 0);
  const nextMonth = Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 1, 0, 0, 0, 0);
  return { sinceMs: start, resetsAtMs: nextMonth, periodKey: `m:${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}` };
}

function formatMetricValue(value: number, metric: BudgetMetric): string {
  if (metric === 'tokens') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M tokens`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k tokens`;
    return `${Math.round(value)} tokens`;
  }
  return `$${value.toFixed(2)}`;
}

export function createBudgetEvaluator(deps: BudgetEvaluatorDeps) {
  const now = deps.now ?? Date.now;

  function evaluateRule(rule: BudgetRule, currentMs: number): BudgetEvaluation {
    const { sinceMs, resetsAtMs, periodKey } = resolveBudgetWindow(rule.period, currentMs);
    const currentValue = deps.store.computeMetricInWindow({
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

  function evaluateAll(): BudgetEvaluation[] {
    const currentMs = now();
    return deps.store.listBudgets().map((rule) => evaluateRule(rule, currentMs));
  }

  async function resolveAlertProjectId(rule: BudgetRule): Promise<string | null> {
    if (rule.scopeType === 'project' && rule.scopeId) return rule.scopeId;
    try {
      const list = await deps.projects.list();
      return list[0]?.id ?? null;
    } catch {
      return null;
    }
  }

  async function checkAndNotify(): Promise<BudgetEvaluation[]> {
    const evaluations = evaluateAll();
    const alertsEnabled = await deps.areAlertsEnabled();
    if (!alertsEnabled) return evaluations;

    for (const item of evaluations) {
      if (!item.rule.enabled || item.status === 'ok') continue;
      const level = item.status === 'exceeded' ? 'exceeded' : 'warning';
      if (deps.store.hasAlertBeenSent(item.rule.id, item.periodKey, level)) continue;

      const projectId = await resolveAlertProjectId(item.rule);
      if (!projectId) continue;

      const label = level === 'exceeded' ? 'Budget Exceeded' : 'Budget Warning';
      const comment =
        `[AI Usage Monitor] ${label}: "${item.rule.name}" reached ${item.percentUsed}% ` +
        `(${formatMetricValue(item.currentValue, item.rule.metric)} / ${formatMetricValue(item.limitValue, item.rule.metric)}).`;

      try {
        await deps.inbox.push({ projectId, comments: comment });
        deps.store.markAlertSent(item.rule.id, item.periodKey, level);
      } catch (err) {
        deps.log.warn(`ai-usage-monitor: failed pushing inbox alert for ${item.rule.name}: ${errorMessage(err)}`);
      }
    }

    return evaluations;
  }

  return { evaluateAll, checkAndNotify };
}

export type BudgetEvaluator = ReturnType<typeof createBudgetEvaluator>;
