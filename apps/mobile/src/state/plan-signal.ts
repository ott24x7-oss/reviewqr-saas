type Listener = (featureId: string) => void;

const listeners = new Set<Listener>();

/** http.ts calls this. It must not import React. */
export function onPlanRequired(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitPlanRequired(featureId: string) {
  for (const listener of listeners) listener(featureId);
}
