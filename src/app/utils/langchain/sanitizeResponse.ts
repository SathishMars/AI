import { WorkflowMessage } from "@/app/types/aimeWorkflowMessages";
import type { WorkflowDefinition } from '@/app/types/workflowTemplate';

/** Try to parse JSON safely. */
function tryParseJson(s: string): unknown | null {
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
}

/** Extract candidate JSON blocks from text:
 *  1) ```json ... ``` fenced blocks
 *  2) ``` ... ``` generic fenced blocks
 *  3) Largest inline object containing "steps" or "workflowDefinition"
 */
function* extractJsonCandidates(text: string): Generator<string> {
    if (!text) return;

    // 1) ```json ... ```
    const fenceJson = /```json\s*([\s\S]*?)```/gi;
    let m: RegExpExecArray | null;
    while ((m = fenceJson.exec(text))) yield m[1].trim();

    // 2) ``` ... ```
    const fenceAny = /```+\s*([\s\S]*?)```+/gi;
    while ((m = fenceAny.exec(text))) yield m[1].trim();

    // 3) Inline object containing "steps" or "workflowDefinition"
    //    Find a { ... } region heuristically by balancing braces.
    const idx = text.indexOf('{');
    for (let start = idx; start !== -1; start = text.indexOf('{', start + 1)) {
        let depth = 0;
        for (let i = start; i < text.length; i++) {
            const ch = text[i];
            if (ch === '{') depth++;
            else if (ch === '}') {
                depth--;
                if (depth === 0) {
                    const candidate = text.slice(start, i + 1);
                    if (/"steps"\s*:/.test(candidate) || /"workflowDefinition"\s*:/.test(candidate)) {
                        yield candidate.trim();
                    }
                    break;
                }
            }
        }
    }
}

/** Normalize parsed payload into a workflowDefinition object if possible. */
function toWorkflowDefinition(obj: unknown): Record<string, unknown> | null {
    if (!obj || typeof obj !== 'object') return null;
    const rec = obj as Record<string, unknown>;

    if ('workflowDefinition' in rec && rec.workflowDefinition && typeof rec.workflowDefinition === 'object') {
        return rec.workflowDefinition as Record<string, unknown>;
    }

    if ('steps' in rec && Array.isArray(rec.steps)) {
        return { steps: rec.steps as unknown[] } as Record<string, unknown>;
    }

    return null;
}

/** Remove a specific substring from text, then tidy. */
function removeBlockAndTidy(text: string, block: string): string {
    if (!text) return text;
    // Remove exact block and any surrounding fences if present
    let out = text.replace(block, '');
    out = out.replace(/```json\s*```/gi, '').replace(/```[\s\S]*?```/g, '');
    // Collapse extra blank lines/spaces
    out = out.replace(/\n{3,}/g, '\n\n').trim();
    return out;
}

/** Enforce text rules: no braces/backticks, max 280 chars when workflow present. */
function sanitizeText(txt: string, hasWorkflow: boolean): string {
    let out = txt || '';
    if (hasWorkflow) {
        // Remove obvious code/JSON markers
        out = out.replace(/```+/g, '')
            .replace(/[{}]/g, '')
            .replace(/\s+\n/g, '\n')
            .trim();
        if (out.length > 280) out = out.slice(0, 280);
    }
    return out;
}

/** Main sanitizer: relocates embedded JSON workflow into content.workflowDefinition. */
export function sanitizeAimeMessage(msg: WorkflowMessage): WorkflowMessage {
    const text = msg?.content?.text ?? '';
    const alreadyHasWf = !!msg?.content?.workflowDefinition;

    if (!alreadyHasWf && typeof text === 'string' && text.length) {
        for (const cand of extractJsonCandidates(text)) {
            const parsed = tryParseJson(cand);
            const wfCandidate = toWorkflowDefinition(parsed);
            if (wfCandidate && Array.isArray(wfCandidate.steps)) {
                // Attach workflowDefinition (safe cast after runtime check)
                const wf = wfCandidate as unknown as WorkflowDefinition;
                msg.content = msg.content || {};
                msg.content.workflowDefinition = wf;

                // Remove the block from text + tidy
                const newText = removeBlockAndTidy(text, cand);
                msg.content.text = sanitizeText(newText, true);
                return msg;
            }
        }
    }

    // If workflow exists, just enforce text hygiene
    if (msg?.content?.workflowDefinition) {
        msg.content.text = sanitizeText(msg.content.text || '', true);
    }

    return msg;
}