// src/app/api/workflow-autocomplete/route.ts

import { NextResponse } from 'next/server';
import { workflowStepFunctions } from '@/app/data/workflow-step-definitions';
import { workflowVariableDefinitions } from '@/app/data/workflow-variable-definitions';
import { WorkflowAutocompleteItem } from '@/app/types/workflowAutocomplete';

export async function GET() {
  try {
    // Use the schemas exported from workflow-step-definitions.ts for autocomplete
    const functionItems: WorkflowAutocompleteItem[] = workflowStepFunctions.map((fn) => {
      // Type assertion for fn to allow property access
      const typedFn = fn as {
        schema?: {
          title?: string;
          allOf?: Array<{ properties: { type: { const: string }, stepFunction: { const: string }, } }>;
        };
        llmInstructions? : string ;
      };

      return {
        id: typedFn.schema?.title || 'unknown-function',
        label: typedFn.schema?.allOf?.[1]?.properties?.stepFunction?.const||'',
        name: typedFn.schema?.allOf?.[1]?.properties?.stepFunction?.const ||'',
        description: typedFn.schema?.title || '',
        type: typedFn.schema?.allOf?.[1]?.properties?.type?.const || '',
      };
    });

    const variableItems: WorkflowAutocompleteItem[] = workflowVariableDefinitions.map((v) => ({
      id: `var:${v.name}`,
      label: v.label,
      name: v.name,
      description: 'Workflow variable',
      type: 'variable'
    }));

    const items = [...functionItems, ...variableItems];
    return NextResponse.json(items, { status: 200 });
  } catch (err) {
    console.error('workflow-autocomplete GET error', err);
    return NextResponse.json({ error: 'Failed to build autocomplete list' }, { status: 500 });
  }
}



