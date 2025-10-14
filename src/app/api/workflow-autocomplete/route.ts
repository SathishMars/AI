// src/app/api/workflow-autocomplete/route.ts

import { NextResponse } from 'next/server';
import { workflowFunctionDefinitions } from '@/app/data/workflow-tool-defintions';
import { workflowVariableDefinitions } from '@/app/data/workflow-variable-definitions';
import { WorkflowAutocompleteItem } from '@/app/types/workflowAutocomplete';

export async function GET() {
  try {
    const functionItems: WorkflowAutocompleteItem[] = workflowFunctionDefinitions.map((fn) => ({
      id: fn.id,
      label: fn.label,
      name: fn.name || fn.id,
      description: fn.description || (fn.llmInstructions?.usageInstruction ?? ''),
      type: fn.type || 'function'
    }));

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



