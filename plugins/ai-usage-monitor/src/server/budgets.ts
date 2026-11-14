import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import type { BudgetEvaluation, BudgetMetric, BudgetPeriod, BudgetRule } from '../shared/types.ts';
import type { UsageStore } from './db.ts';
import { errorMessage, localDateKey, localMidnightMs } from './util.ts';

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

  async function resolveAlertProjectId(rule: BudgetRule, sinceMs: number): Promise<string | null> {
    if (rule.scopeType === 'project' && rule.scopeId) return rule.scopeId;
    const topProjectId = deps.store.findTopProjectInWindow({
      sinceMs,
      scopeType: rule.scopeType,
      scopeId: rule.scopeId,
      metric: rule.metric
    });

    let listedProjects: Array<{ id: string }> | null = null;
    try {
      listedProjects = await deps.projects.list();
    } catch (err) {
      deps.log.warn(
        `ai-usage-monitor: failed listing projects for budget alert "${rule.name}": ${errorMessage(err)}`
      );
    }

    if (listedProjects && listedProjects.length > 0) {
      if (topProjectId && listedProjects.some((p) => p.id === topProjectId)) {
        return topProjectId;
      }
      return listedProjects[0]?.id ?? null;
    }

    if (topProjectId) return topProjectId;
    deps.log.warn(`ai-usage-monitor: skipping budget alert "${rule.name}" because no target project could be resolved.`);
    return null;
  }

  async function checkAndNotify(): Promise<BudgetEvaluation[]> {
    const currentMs = now();
    const evaluations = deps.store.listBudgets().map((rule) => evaluateRule(rule, currentMs));
    const alertsEnabled = await deps.areAlertsEnabled();
    if (!alertsEnabled) return evaluations;

    for (const item of evaluations) {
      if (!item.rule.enabled || item.status === 'ok') continue;
      const level = item.status === 'exceeded' ? 'exceeded' : 'warning';
      if (deps.store.hasAlertBeenSent(item.rule.id, item.periodKey, level)) continue;

      const { sinceMs } = resolveBudgetWindow(item.rule.period, currentMs);
      const projectId = await resolveAlertProjectId(item.rule, sinceMs);
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
