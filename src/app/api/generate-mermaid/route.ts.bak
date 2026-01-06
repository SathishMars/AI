// src/app/api/generate-mermaid/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { WorkflowJSON } from '@/app/types/workflow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workflow: WorkflowJSON | undefined = body?.workflow;

    if (!workflow || !workflow.steps) {
      return NextResponse.json({ error: 'Invalid workflow data' }, { status: 400 });
    }

    const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.3, apiKey: process.env.OPENAI_API_KEY });
    const prompt = createMermaidPrompt(workflow);

    const messages = [
      new SystemMessage('You are an expert Mermaid diagram generator. Output only the Mermaid code.'),
      new HumanMessage(prompt),
    ];

    const response = await model.invoke(messages);
    const mermaidRaw = typeof response.content === 'string' ? response.content : '';
    const mermaid = mermaidRaw.trim();

    if (!mermaid) {
      return NextResponse.json({ error: 'Failed to generate diagram' }, { status: 500 });
    }

    const cleaned = mermaid.replace(/^```mermaid\s*\n/, '').replace(/^```\s*\n/, '').replace(/\n```$/, '');

    // Sanitize class names that may be produced by the LLM.
    // Some LLM outputs use short names like "end" which can conflict with
    // Mermaid's parser or reserved tokens. Normalize any `classDef NAME ...`
    // lines to ensure NAME ends with 'Class', and update corresponding
    // `class NODE NAME` usages to reference the normalized class name.
    function sanitizeMermaidClasses(diagram: string): string {
      const classMap = new Map<string, string>();

      // Find all classDef declarations and normalize names
      diagram = diagram.replace(/(^|\n)\s*classDef\s+([A-Za-z0-9_-]+)\b/g, (match, prefix, name) => {
        const safeName = name.endsWith('Class') ? name : `${name}Class`;
        classMap.set(name, safeName);
        return `${prefix}classDef ${safeName}`;
      });

      // Replace usages like: class nodeName oldName  -> class nodeName newName
      if (classMap.size > 0) {
        for (const [oldName, newName] of classMap.entries()) {
          const usageRegex = new RegExp(`(^|\\n)\\s*class\\s+([A-Za-z0-9_\\-]+)\\s+${oldName}\\b`, 'g');
          diagram = diagram.replace(usageRegex, (m, p, node) => `${p}class ${node} ${newName}`);
          // Also replace the shorthand class-application syntax :::oldName -> :::newName
          const tripleColonRegex = new RegExp(`:::\s*${oldName}\\b`, 'g');
          diagram = diagram.replace(tripleColonRegex, `:::${newName}`);
        }
      }

      return diagram;
    }

    const sanitized = sanitizeMermaidClasses(cleaned);

    // If the caller requested debugging output via ?debug=true, include raw/cleaned
    // strings so clients can inspect the LLM output. Otherwise, return only the
    // sanitized diagram to avoid leaking raw LLM text in production.
    const debugParam = request.nextUrl?.searchParams?.get?.('debug');
    const debug = !!debugParam && debugParam.toLowerCase() === 'true';

    if (debug) {
      return NextResponse.json({
        mermaidRaw: mermaidRaw, // original content returned by the LLM (may include fences)
        mermaidCleaned: cleaned, // cleaned of code fences and trimmed
        mermaidDiagram: sanitized, // sanitized for safe Mermaid parsing in the browser
      });
    }

    return NextResponse.json({ mermaidDiagram: sanitized });
  } catch (err) {
    console.error('generate-mermaid error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function createMermaidPrompt(workflow: WorkflowJSON): string {
  const stepsJson = JSON.stringify(workflow.steps, null, 2);
  const name = workflow.metadata?.name ?? 'Untitled Workflow';
  const description = workflow.metadata?.description ?? 'Business process workflow';

  const lines: string[] = [];
  lines.push('Create a Mermaid flowchart (flowchart TD) for the workflow below.');
  lines.push(`Name: ${name}`);
  lines.push(`Description: ${description}`);
  lines.push('Steps:');
  lines.push(stepsJson);
  lines.push('Requirements: Start with flowchart TD. Use classDef for styling. Return ONLY the Mermaid code block.');

  return lines.join('\n');
}
