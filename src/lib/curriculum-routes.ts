import type { Line } from "./curriculum";

// Explicit slugs keep public URLs stable when a line's display name changes.
export const LINE_SLUGS: Record<string, string> = {
  p0: "orientation",
  p1: "foundations",
  p1e: "experimental-practice",
  p2: "value-based-deep-rl",
  p3: "policy-gradients-actor-critic",
  p7: "evaluation-experiment-design",
  p6a: "exploration",
  p4: "model-based-rl-planning",
  p6b: "offline-rl",
  p6c: "imitation-inverse-rl",
  p6d: "hierarchical-goal-conditioned-rl",
  p6e: "multi-agent-rl-games",
  p6f: "meta-rl-generalisation",
  p6g: "representation-learning",
  p6h: "robotics-sim-to-real",
  p5: "rlhf-llm-reasoning",
  pd: "distributed-rl",
  p8: "theory",
  p9: "independent-research",
};

export const curriculumPath = (line: Line) => `/curriculum/${LINE_SLUGS[line.id] ?? line.id}`;
