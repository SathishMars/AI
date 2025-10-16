import { WorkflowStep } from "../types/workflowTemplate";


export function getStepsLabelsMap(steps: Array<WorkflowStep | string>): Record<string, string> {
    const map: Record<string, string> = {};
    steps.forEach(step => {
        if (typeof step === "string") return;

        map[step.id] = step.label;
        if (step.next && step.next.length > 0) {
            const childMap = getStepsLabelsMap(step.next);
            Object.assign(map, childMap);
        }
        if (step.onConditionPass && typeof step.onConditionPass === "object") {
            const childMap = getStepsLabelsMap([step.onConditionPass]);
            Object.assign(map, childMap);
        }
        if (step.onConditionFail && typeof step.onConditionFail === "object") {
            const childMap = getStepsLabelsMap([step.onConditionFail]);
            Object.assign(map, childMap);
        }
        if (step.onError && typeof step.onError === "object") {
            const childMap = getStepsLabelsMap([step.onError]);
            Object.assign(map, childMap);
        }
        if (step.onTimeout && typeof step.onTimeout === "object") {
            const childMap = getStepsLabelsMap([step.onTimeout]);
            Object.assign(map, childMap);
        }
    });
    return map;
}

export function getEmbeddedChildren(steps: Array<WorkflowStep | string>): WorkflowStep[] {
    let embedded: WorkflowStep[] = [];
    steps.forEach(step => {
        if (typeof step === "string") return;
        if (step.next && step.next.length > 0) {
            // we need to check add only the steps that are objects, not strings
            embedded = embedded.concat(step.next.filter((s): s is WorkflowStep => typeof s === "object"));
            const childEmbedded = getEmbeddedChildren(step.next);
            embedded = embedded.concat(childEmbedded);
        }
        if (step.onConditionPass && typeof step.onConditionPass === "object") {
            embedded.push(step.onConditionPass as WorkflowStep);
            const childEmbedded = getEmbeddedChildren([step.onConditionPass]);
            embedded = embedded.concat(childEmbedded);
        }
        if (step.onConditionFail && typeof step.onConditionFail === "object") {
            embedded.push(step.onConditionFail as WorkflowStep);
            const childEmbedded = getEmbeddedChildren([step.onConditionFail]);
            embedded = embedded.concat(childEmbedded);
        }
        if (step.onError && typeof step.onError === "object") {
            embedded.push(step.onError as WorkflowStep);
            const childEmbedded = getEmbeddedChildren([step.onError]);
            embedded = embedded.concat(childEmbedded);
        }
        if (step.onTimeout && typeof step.onTimeout === "object") {
            embedded.push(step.onTimeout as WorkflowStep);
            const childEmbedded = getEmbeddedChildren([step.onTimeout]);
            embedded = embedded.concat(childEmbedded);
        }
    });
    return embedded;
}

export function getReferredSteps(steps: Array<WorkflowStep | string>): string[] {
    // return steps filtered by the typeof string
    return steps.filter((step): step is string => typeof step === "string");
}

