import type { Middleware } from '../core/compose.js';
import type { Context } from '../core/context.js';
import { getNumber, isRecord } from '../utils/index.js';
import { createScene, type Scene } from './scene.js';

interface WizardState {
  step: number;
}

interface WizardApi {
  step: number;
  next: () => Promise<void>;
  back: () => Promise<void>;
  selectStep: (n: number) => Promise<void>;
}

function clampStep(step: number, max: number): number {
  if (Number.isNaN(step)) return 0;
  if (step < 0) return 0;
  if (step > max) return max;
  return step;
}

function getOrCreateWizardState(session: Record<string, unknown>, name: string): WizardState {
  const root = session['__wizard'];
  if (!isRecord(root)) {
    const createdRoot: Record<string, unknown> = {};
    session['__wizard'] = createdRoot;
    return getOrCreateWizardState(session, name);
  }

  const entry = root[name];
  if (isRecord(entry)) {
    const step = getNumber(entry['step']);
    if (step !== undefined) {
      return entry as unknown as WizardState;
    }
  }

  const created: WizardState = { step: 0 };
  root[name] = created as unknown as Record<string, unknown>;
  return created;
}

function ensureWizardApi(ctx: Context, wizardName: string, stepCount: number): WizardApi {
  if (!ctx.session) {
    throw new Error('Session middleware is required for wizards');
  }

  if (!ctx.scene) {
    throw new Error('Stage middleware is required for wizards');
  }

  const maxStep = Math.max(0, stepCount - 1);
  const state = getOrCreateWizardState(ctx.session, wizardName);
  state.step = clampStep(state.step, maxStep);

  const api: WizardApi = {
    step: state.step,
    next: async () => {
      state.step = clampStep(state.step + 1, maxStep);
      api.step = state.step;
    },
    back: async () => {
      state.step = clampStep(state.step - 1, maxStep);
      api.step = state.step;
    },
    selectStep: async (n) => {
      state.step = clampStep(n, maxStep);
      api.step = state.step;
    },
  };

  ctx.wizard = api;
  return api;
}

export function createWizard(name: string, steps: readonly Middleware<Context>[]): Scene {
  return createScene(name, async (ctx, next) => {
    const api = ensureWizardApi(ctx, name, steps.length);
    const handler = steps[api.step];
    if (!handler) return await next();
    return await handler(ctx, next);
  });
}

