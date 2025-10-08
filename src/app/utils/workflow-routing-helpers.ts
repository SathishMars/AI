// src/app/utils/workflow-routing-helpers.ts

import { getLLMContext } from '@/app/data/workflow-conversation-autocomplete';
import { WorkflowStep } from '@/app/types/workflow';

export type LLMFunctionDefinition = ReturnType<typeof getLLMContext>[number];

export type RoutingFieldKey =
  | 'onSuccessGoTo'
  | 'onFailureGoTo'
  | 'onSuccess'
  | 'onFailure'
  | 'onApproval'
  | 'onReject'
  | 'onYes'
  | 'onNo'
  | 'nextSteps';

interface RoutingFieldConfig {
  label: string;
  helperText: string;
  questionLabel: string;
  valueType: 'string' | 'array';
}

export const ROUTING_FIELD_CONFIG: Record<RoutingFieldKey, RoutingFieldConfig> = {
  onSuccessGoTo: {
    label: 'On Success',
    helperText: 'Step ID (e.g. #createEvent) for success outcome',
    questionLabel: 'success path',
    valueType: 'string'
  },
  onFailureGoTo: {
    label: 'On Failure',
    helperText: 'Step ID (e.g. #notifyFailure) for failure outcome',
    questionLabel: 'failure path',
    valueType: 'string'
  },
  onSuccess: {
    label: 'On Success',
    helperText: 'Step ID for success outcome',
    questionLabel: 'success path',
    valueType: 'string'
  },
  onFailure: {
    label: 'On Failure',
    helperText: 'Step ID for failure outcome',
    questionLabel: 'failure path',
    valueType: 'string'
  },
  onApproval: {
    label: 'On Approval',
    helperText: 'Step ID (e.g. #createEvent) for approval/yes outcome',
    questionLabel: 'approval outcome',
    valueType: 'string'
  },
  onReject: {
    label: 'On Reject',
    helperText: 'Step ID (e.g. #notifyRejection) for rejection/no outcome',
    questionLabel: 'rejection outcome',
    valueType: 'string'
  },
  onYes: {
    label: 'On Yes',
    helperText: 'Step ID (e.g. #yesPath) for yes response',
    questionLabel: 'Yes response',
    valueType: 'string'
  },
  onNo: {
    label: 'On No',
    helperText: 'Step ID (e.g. #noPath) for no response',
    questionLabel: 'No response',
    valueType: 'string'
  },
  nextSteps: {
    label: 'Next Steps',
    helperText: 'Comma-separated step IDs (e.g. #stepA, #stepB)',
    questionLabel: 'next steps',
    valueType: 'array'
  }
};

const ROUTING_FIELD_KEYS = Object.keys(ROUTING_FIELD_CONFIG) as RoutingFieldKey[];

const ROUTING_FIELD_ORDER: RoutingFieldKey[] = [
  'onSuccessGoTo',
  'onFailureGoTo',
  'onApproval',
  'onReject',
  'onYes',
  'onNo',
  'nextSteps'
];

const OUTPUT_KEY_MAPPINGS = new Map<string, RoutingFieldKey>([
  ['onsuccess', 'onSuccessGoTo'],
  ['onsuccessgoto', 'onSuccessGoTo'],
  ['on_success', 'onSuccessGoTo'],
  ['success', 'onSuccessGoTo'],
  ['onfailure', 'onFailureGoTo'],
  ['onfailuregoto', 'onFailureGoTo'],
  ['on_failure', 'onFailureGoTo'],
  ['failure', 'onFailureGoTo'],
  ['onapproval', 'onApproval'],
  ['approval', 'onApproval'],
  ['approved', 'onApproval'],
  ['onreject', 'onReject'],
  ['reject', 'onReject'],
  ['rejection', 'onReject'],
  ['deny', 'onReject'],
  ['onyes', 'onYes'],
  ['yes', 'onYes'],
  ['accept', 'onYes'],
  ['acceptance', 'onYes'],
  ['onno', 'onNo'],
  ['no', 'onNo'],
  ['decline', 'onNo'],
  ['declined', 'onNo'],
  ['nextsteps', 'nextSteps'],
  ['next_steps', 'nextSteps']
]);

const isRoutingFieldKey = (key: string): key is RoutingFieldKey =>
  ROUTING_FIELD_KEYS.includes(key as RoutingFieldKey);

const mapOutputKeyToRoutingField = (key: string | undefined): RoutingFieldKey | undefined => {
  if (!key) {
    return undefined;
  }

  if (isRoutingFieldKey(key)) {
    return key;
  }

  const normalized = key.replace(/[#\s]/g, '').toLowerCase();
  return OUTPUT_KEY_MAPPINGS.get(normalized);
};

const sortRoutingKeys = (keys: Iterable<RoutingFieldKey>): RoutingFieldKey[] => {
  const keyArray = Array.from(new Set(keys));
  return keyArray.sort((a, b) => {
    const indexA = ROUTING_FIELD_ORDER.indexOf(a);
    const indexB = ROUTING_FIELD_ORDER.indexOf(b);

    if (indexA === -1 && indexB === -1) {
      return a.localeCompare(b);
    }

    if (indexA === -1) {
      return 1;
    }

    if (indexB === -1) {
      return -1;
    }

    return indexA - indexB;
  });
};

export const buildFunctionDefinitionLookup = (
  definitions: LLMFunctionDefinition[]
): Map<string, LLMFunctionDefinition> => {
  const lookup = new Map<string, LLMFunctionDefinition>();

  definitions.forEach((definition) => {
    const candidateKeys = new Set<string>();

    if (definition.name) {
      candidateKeys.add(definition.name);
      candidateKeys.add(definition.name.toLowerCase());
      candidateKeys.add(`fn${definition.name.charAt(0).toUpperCase()}${definition.name.slice(1)}`);
    }

    const example = definition.example as Record<string, unknown> | undefined;
    const exampleAction = typeof example?.action === 'string' ? example.action : undefined;
    const exampleId = typeof example?.id === 'string' ? example.id : undefined;

    if (exampleAction) {
      candidateKeys.add(exampleAction);
      candidateKeys.add(exampleAction.toLowerCase());
    }

    if (exampleId) {
      candidateKeys.add(exampleId);
      candidateKeys.add(exampleId.toLowerCase());
    }

    candidateKeys.forEach((key) => {
      if (key) {
        lookup.set(key, definition);
      }
    });
  });

  return lookup;
};

const normalizeActionName = (action: string): string => {
  return action.replace(/^fn[_-]?/i, '');
};

export const getDefinitionForStep = (
  step: WorkflowStep,
  lookup: Map<string, LLMFunctionDefinition>
): LLMFunctionDefinition | undefined => {
  if (!step.action) {
    return undefined;
  }

  const direct = lookup.get(step.action) || lookup.get(step.action.toLowerCase());
  if (direct) {
    return direct;
  }

  const normalized = normalizeActionName(step.action);
  return lookup.get(normalized) || lookup.get(normalized.toLowerCase());
};

const isValuePopulated = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return true;
};

const getStepRoutingValue = (step: WorkflowStep, key: RoutingFieldKey): unknown => {
  switch (key) {
    case 'onSuccessGoTo':
      return step.onSuccessGoTo;
    case 'onFailureGoTo':
      return step.onFailureGoTo;
    case 'onSuccess':
      return step.onSuccess;
    case 'onFailure':
      return step.onFailure;
    case 'onApproval':
      return step.onApproval;
    case 'onReject':
      return step.onReject;
    case 'onYes':
      return step.onYes;
    case 'onNo':
      return step.onNo;
    case 'nextSteps':
      return (step as WorkflowStep & { nextSteps?: string[] | string }).nextSteps;
    default:
      return undefined;
  }
};

const isRoutingMissing = (step: WorkflowStep, key: RoutingFieldKey): boolean => {
  const primary = getStepRoutingValue(step, key);

  if (isValuePopulated(primary)) {
    return false;
  }

  switch (key) {
    case 'onSuccess':
      return !isValuePopulated(getStepRoutingValue(step, 'onSuccessGoTo'));
    case 'onSuccessGoTo':
      return !isValuePopulated(getStepRoutingValue(step, 'onSuccess'));
    case 'onFailure':
      return !isValuePopulated(getStepRoutingValue(step, 'onFailureGoTo'));
    case 'onFailureGoTo':
      return !isValuePopulated(getStepRoutingValue(step, 'onFailure'));
    case 'onApproval':
      return !isValuePopulated(getStepRoutingValue(step, 'onYes'));
    case 'onYes':
      return !isValuePopulated(getStepRoutingValue(step, 'onApproval'));
    case 'onReject':
      return !isValuePopulated(getStepRoutingValue(step, 'onNo'));
    case 'onNo':
      return !isValuePopulated(getStepRoutingValue(step, 'onReject'));
    case 'nextSteps':
      return !isValuePopulated(getStepRoutingValue(step, 'nextSteps'));
    default:
      return true;
  }
};

export const collectMissingRoutingQuestions = (
  steps: WorkflowStep[] | undefined,
  lookup: Map<string, LLMFunctionDefinition>,
  accumulator: Set<string> = new Set(),
  seen: Set<string> = new Set()
): Set<string> => {
  if (!Array.isArray(steps) || steps.length === 0) {
    return accumulator;
  }

  steps.forEach((step) => {
    const definition = getDefinitionForStep(step, lookup);
    const definitionKeys = new Set<RoutingFieldKey>();

    if (definition?.supportedOutputs) {
      definition.supportedOutputs.forEach((outputKey) => {
        const mappedKey = mapOutputKeyToRoutingField(outputKey);
        if (mappedKey) {
          definitionKeys.add(mappedKey);
        }
      });
    }

    if (definition?.outputs) {
      Object.keys(definition.outputs).forEach((outputKey) => {
        const mappedKey = mapOutputKeyToRoutingField(outputKey);
        if (mappedKey) {
          definitionKeys.add(mappedKey);
        }
      });
    }

    definitionKeys.forEach((outputKey) => {

      const dedupeKey = `${step.id}:${outputKey}`;
      if (seen.has(dedupeKey)) {
        return;
      }

      if (isRoutingMissing(step, outputKey)) {
        seen.add(dedupeKey);
        const questionLabel = ROUTING_FIELD_CONFIG[outputKey].questionLabel;
        accumulator.add(
          `Where should the ${questionLabel} from "${step.name}" go? Please respond with the step ID (for example #${step.id}).`
        );
      }
    });

    if (step.children && step.children.length > 0) {
      collectMissingRoutingQuestions(step.children, lookup, accumulator, seen);
    }

    if (step.onSuccess && typeof step.onSuccess === 'object') {
      collectMissingRoutingQuestions([step.onSuccess], lookup, accumulator, seen);
    }

    if (step.onFailure && typeof step.onFailure === 'object') {
      collectMissingRoutingQuestions([step.onFailure], lookup, accumulator, seen);
    }
  });

  return accumulator;
};

export const getRoutingKeysForStep = (
  step: WorkflowStep,
  lookup: Map<string, LLMFunctionDefinition>
): RoutingFieldKey[] => {
  const keys = new Set<RoutingFieldKey>();
  const definition = getDefinitionForStep(step, lookup);
  const definitionKeys = new Set<RoutingFieldKey>();

  if (definition?.supportedOutputs) {
    definition.supportedOutputs.forEach((outputKey) => {
      const mapped = mapOutputKeyToRoutingField(outputKey);
      if (mapped) {
        definitionKeys.add(mapped);
      }
    });
  }

  if (definition?.outputs) {
    Object.keys(definition.outputs).forEach((outputKey) => {
      const mapped = mapOutputKeyToRoutingField(outputKey);
      if (mapped) {
        definitionKeys.add(mapped);
      }
    });
  }

  definitionKeys.forEach((key) => keys.add(key));

  const hasDefinitionKeys = definitionKeys.size > 0;

  ROUTING_FIELD_KEYS.forEach((key) => {
    if (!hasDefinitionKeys && isValuePopulated(getStepRoutingValue(step, key))) {
      keys.add(key);
    }
    if (hasDefinitionKeys && definitionKeys.has(key) && isValuePopulated(getStepRoutingValue(step, key))) {
      keys.add(key);
    }
  });

  if (!hasDefinitionKeys) {
    if (step.type === 'action') {
      keys.add('onSuccessGoTo');
      if (isValuePopulated(step.onFailureGoTo)) {
        keys.add('onFailureGoTo');
      }
      if (isValuePopulated(getStepRoutingValue(step, 'nextSteps'))) {
        keys.add('nextSteps');
      }
    }

    if (step.type === 'condition') {
      if (isValuePopulated(step.onSuccessGoTo) || isValuePopulated(step.onFailureGoTo)) {
        keys.add('onSuccessGoTo');
        keys.add('onFailureGoTo');
      }
    }
  }

  return sortRoutingKeys(keys);
};

export const getRoutingFieldValue = (
  step: WorkflowStep,
  key: RoutingFieldKey
): string | string[] | WorkflowStep | undefined => {
  return getStepRoutingValue(step, key) as string | string[] | WorkflowStep | undefined;
};
