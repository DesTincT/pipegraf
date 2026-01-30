import type { Middleware } from '../core/compose.js';
import type { Context } from '../core/context.js';
import type { Scene } from './scene.js';

type SceneState = {
  current: string | null;
};

type SceneApi = {
  current: string | null;
  enter: (name: string) => Promise<void>;
  leave: () => Promise<void>;
};

function getOrCreateSceneState(session: Record<string, unknown>): SceneState {
  const existing = session['__scene'];
  if (typeof existing === 'object' && existing !== null && 'current' in existing) {
    const current = (existing as Record<string, unknown>)['current'];
    if (typeof current === 'string' || current === null) {
      return existing as SceneState;
    }
  }

  const created: SceneState = { current: null };
  session['__scene'] = created as unknown as Record<string, unknown>;
  return created;
}

function ensureSceneApi(ctx: Context): SceneApi {
  if (!ctx.session) {
    throw new Error('Session middleware is required for scenes');
  }

  const state = getOrCreateSceneState(ctx.session);

  const api: SceneApi = {
    current: state.current,
    enter: async (name) => {
      state.current = name;
      api.current = name;
    },
    leave: async () => {
      state.current = null;
      api.current = null;
    },
  };

  ctx.scene = api;
  return api;
}

export type Stage = {
  register: (scene: Scene) => void;
  middleware: () => Middleware<Context>;
  enter: (sceneName: string) => Middleware<Context>;
  leave: () => Middleware<Context>;
};

export function createStage(): Stage {
  const scenes = new Map<string, Scene>();

  return {
    register: (scene) => {
      scenes.set(scene.name, scene);
    },
    enter:
      (sceneName) =>
      async (ctx, next) => {
        await ensureSceneApi(ctx).enter(sceneName);
        return await next();
      },
    leave:
      () =>
      async (ctx, next) => {
        await ensureSceneApi(ctx).leave();
        return await next();
      },
    middleware:
      () =>
      async (ctx, next) => {
        const api = ensureSceneApi(ctx);
        const scene = api.current ? scenes.get(api.current) : undefined;
        if (scene) {
          return await scene.middleware(ctx, next);
        }
        return await next();
      },
  };
}

