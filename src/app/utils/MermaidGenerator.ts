import { WorkflowDefinition, WorkflowStep } from '@/app/types/workflowTemplate';

/**
 * Generate a Mermaid flowchart from a WorkflowDefinition.
 * - Produces a 'flowchart TD' diagram.
 * - Flattens nested steps and uses provided step ids as node identifiers.
 * - Edges are created for `next`, `onConditionPass`, `onConditionFail`, `onError`, and `onTimeout`.
 */
export function generateMermaidFromWorkflow(workflow: WorkflowDefinition): string {
    // console.info('[mermaid] generateMermaidFromWorkflow called');
    if (!workflow || !Array.isArray(workflow.steps) || workflow.steps.length === 0) {
        console.warn('[mermaid] no workflow or empty steps array');
        return '%% Empty workflow - no mermaid diagram available';
    }

    console.log('[mermaid] workflow summary', { stepsCount: workflow.steps.length });

    // Helper: sanitize node ids for Mermaid (prefix to avoid numeric-start issues)
    const sanitize = (id: string) => `n_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`;

    const nodes = new Map<string, { id: string; label: string; type?: string }>();
    const edges: Array<{ from: string; to: string; label?: string }> = [];

    // Flatten any nested WorkflowStep and collect nodes/edges
    const processStep = (step: WorkflowStep) => {
        try {
            // console.log('[mermaid] processing step', { id: step?.id, label: step?.label, type: step?.type });
            if (!step || !step.id) return;
            const nodeId = sanitize(step.id);
            if (!nodes.has(step.id)) {
                // console.log('[mermaid] registering node', { id: step.id, nodeId });
                nodes.set(step.id, { id: nodeId, label: step.label || step.id, type: step.type });
            }

            const addEdgeTo = (target: string | WorkflowStep | undefined, label?: string) => {
                if (!target) return;
                if (typeof target === 'string') {
                    const tgt = sanitize(target);
                    // console.log('[mermaid] adding edge to string target', { from: nodeId, to: tgt, label });
                    edges.push({ from: nodeId, to: tgt, label });
                } else {
                    // nested step object
                    if (target.id) {
                        // console.log('[mermaid] nested step object found', { parent: step.id, nestedId: target.id });
                        // ensure target node is registered
                        if (!nodes.has(target.id)) {
                            nodes.set(target.id, { id: sanitize(target.id), label: target.label || target.id, type: target.type });
                        }
                        // console.log('[mermaid] adding edge to nested target', { from: nodeId, to: sanitize(target.id), label });
                        edges.push({ from: nodeId, to: sanitize(target.id), label });
                        // process nested step recursively
                        processStep(target);
                    }
                }
            };

            // next can be array of ids or nested steps
            if (Array.isArray(step.next)) {
                for (const n of step.next) addEdgeTo(n);
            }

            // condition branches
            if (step.onConditionPass) addEdgeTo(step.onConditionPass, 'Criteria Met');
            if (step.onConditionFail) addEdgeTo(step.onConditionFail, 'Otherwise');

            // Support for decision-style conditions where a 'conditions' array
            // contains value->next mappings (e.g. multiCheckCondition)
            // Each condition will become a labeled edge from this node to the target
            type Condition = { value?: unknown; next?: string | WorkflowStep };
            const maybeConds = (step as unknown as { conditions?: Condition[] }).conditions;
            if (Array.isArray(maybeConds)) {
                for (const c of maybeConds) {
                    if (!c) continue;
                    const label = c.value !== undefined ? String(c.value) : undefined;
                    addEdgeTo(c.next as string | WorkflowStep | undefined, label);
                }
            }

            // defaultNext: a fallback branch from decision nodes
            const maybeDefault = (step as unknown as { defaultNext?: string | WorkflowStep }).defaultNext;
            if (maybeDefault) {
                addEdgeTo(maybeDefault, 'default');
            }

            if (step.onError) addEdgeTo(step.onError, 'error');
            if (step.onTimeout) addEdgeTo(step.onTimeout, 'timeout');
        } catch (err: unknown) {
            console.error('[mermaid] error processing step', { error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err), step });
        }
    };

    // Walk top-level steps
    for (const s of workflow.steps) {
        processStep(s);
    }

    // console.info('[mermaid] finished processing steps', { nodes: nodes.size, edges: edges.length });

    // Build mermaid lines
    const lines: string[] = [];
    lines.push(`---
config:
  flowchart:
    htmlLabels: false
title: "Generated mermaid diagram"
---
`);
    lines.push('flowchart TD');

    // Emit nodes with labels that include the type for clarity
    // Also collect types used so we can emit class definitions
    const typesUsed = new Set<string>();
    const nodeClassMap = new Map<string, string>();

    // Default type-to-style map (editable) - defines background (fill), border (stroke), and text (color)
    const typeStyles: Record<string, { fill?: string; stroke?: string; color?: string }> = {
        decision: { fill: '#fff7ed', stroke: '#f97316', color: '#7c2d12' },
        trigger: { fill: '#ecfeff', stroke: '#06b6d4', color: '#0f172a' },
        terminate: { fill: '#fff1f2', stroke: '#fb7185', color: '#7f1d1d' },
        branch: { fill: '#f0f9ff', stroke: '#60a5fa', color: '#0f172a' },
        merge: { fill: '#fefce8', stroke: '#facc15', color: '#403f3f' },
        workflow: { fill: '#f0fdf4', stroke: '#34d399', color: '#064e3b' },
    };

    nodes.forEach((n) => {
        // Build the full label (including type) and then escape it so newlines become '\n'
        const fullLabel = `\`**${n.label || ''}**${n.type ? `(${n.type})\`` : ''}`;
        const safeLabel = escapeLabel(fullLabel);

        // Assign a class name for this node's type if present
        let className: string | undefined;
        if (n.type) {
            const normalized = String(n.type).replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
            className = `cls_${normalized}`;
            typesUsed.add(normalized);
            nodeClassMap.set(n.id, className);
        }

        // Use shapes depending on the type (keep existing shapes but canonicalize some syntax)
        switch (n.type) {
            case 'decision':
                lines.push(`  ${n.id}{"${safeLabel}"}`);
                break;
            case 'trigger':
                lines.push(`  ${n.id}(["${safeLabel}"])`);
                break;
            case 'terminate':
                lines.push(`  ${n.id}(["${safeLabel}"])`);
                break;
            case 'branch':
                // trapezoid/slanted
                lines.push(`  ${n.id}[/"${safeLabel}"/]`);
                break;
            case 'merge':
                // inverse trapezoid
                lines.push(`  ${n.id}[\"${safeLabel}\"]`);
                break;
            case 'workflow':
                lines.push(`  ${n.id}[["${safeLabel}"]]`);
                break;
            default:
                lines.push(`  ${n.id}["${safeLabel}"]`);
                break;
        }

        // If a class was determined, assign it to the node
        if (className) {
            lines.push(`  class ${n.id} ${className};`);
        }
    });

    // Emit class definitions for types that were used
    if (typesUsed.size > 0) {
        lines.push('');
        typesUsed.forEach((t) => {
            const cls = `cls_${t}`;
            const style = typeStyles[t] || {};
            const parts: string[] = [];
            if (style.fill) parts.push(`fill:${style.fill}`);
            if (style.stroke) parts.push(`stroke:${style.stroke}`);
            if (style.color) parts.push(`color:${style.color}`);
            // Provide a sensible default if nothing specified
            const def = parts.length > 0 ? parts.join(',') : 'fill:#ffffff,stroke:#333,color:#000';
            lines.push(`  classDef ${cls} ${def};`);
        });
    }

    // Emit edges; include labels when present
    for (const e of edges) {
        const labelStr = e.label ? `|${escapeLabel(e.label)}|` : '';
        lines.push(`  ${e.from} -->${labelStr} ${e.to}`);
    }

    const diagram = lines.join('\n');
    // console.log('[mermaid] generated diagram length', diagram.length);
    console.log('[mermaid] diagram preview', diagram);
    return diagram;
}

function escapeLabel(s: string | undefined): string {
    if (!s) return '';
    // Replace double quotes and newlines; mermaid uses \n for newlines inside labels
    return String(s).replace(/"/g, "'").replace(/\n/g, '\\n');
}
