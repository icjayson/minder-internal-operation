import type { FdeDeployment, FdeDeploymentTask } from "./types";

type DeploymentInput = Pick<
  FdeDeployment,
  "id" | "factory_id" | "name" | "status" | "started_at"
>;

type TaskInput = Pick<
  FdeDeploymentTask,
  "deployment_id" | "phase" | "status"
>;

export interface FdePhaseProgress {
  phase: FdeDeploymentTask["phase"];
  done: number;
  total: number;
}

export interface FdeProgressSummary {
  deploymentId: string;
  deploymentName: string;
  status: FdeDeployment["status"];
  done: number;
  total: number;
  percent: number;
  phases: FdePhaseProgress[];
}

const PHASES: ReadonlyArray<FdeDeploymentTask["phase"]> = [
  "pre",
  "during",
  "after",
];

export function buildFdeProgressByFactory(
  deployments: ReadonlyArray<DeploymentInput>,
  tasks: ReadonlyArray<TaskInput>,
): Map<string, FdeProgressSummary> {
  const latestByFactory = new Map<string, DeploymentInput>();
  for (const deployment of deployments) {
    if (!deployment.factory_id) continue;
    const current = latestByFactory.get(deployment.factory_id);
    if (!current || deployment.started_at > current.started_at) {
      latestByFactory.set(deployment.factory_id, deployment);
    }
  }

  const progress = new Map<string, FdeProgressSummary>();
  for (const [factoryId, deployment] of latestByFactory) {
    const deploymentTasks = tasks.filter(
      (task) => task.deployment_id === deployment.id,
    );
    const done = deploymentTasks.filter((task) => task.status === "done").length;
    const phases = PHASES.map((phase) => {
      const phaseTasks = deploymentTasks.filter((task) => task.phase === phase);
      return {
        phase,
        done: phaseTasks.filter((task) => task.status === "done").length,
        total: phaseTasks.length,
      };
    });

    progress.set(factoryId, {
      deploymentId: deployment.id,
      deploymentName: deployment.name,
      status: deployment.status,
      done,
      total: deploymentTasks.length,
      percent: deploymentTasks.length
        ? Math.round((done / deploymentTasks.length) * 100)
        : 0,
      phases,
    });
  }

  return progress;
}
