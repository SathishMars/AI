import { generateMermaidFromWorkflow } from '@/app/utils/langchain/langchain-mermaid-generator';

describe('generateMermaidFromWorkflow', () => {
    it('uses curly braces for decision nodes', () => {
        const workflow = {
            steps: [
                { id: 'start', label: 'Start', type: 'start', next: ['decide'] },
                { id: 'decide', label: 'Is OK?', type: 'decision', onConditionPass: 'end', onConditionFail: 'end' },
                { id: 'end', label: 'End', type: 'end' },
            ],
        } as any;

        const diagram = generateMermaidFromWorkflow(workflow);
        // decision node should be emitted with {} around the label
        expect(diagram).toContain('n_decide{"Is OK?\\n(decision)"}');
        // class assignment and definition should be present for the decision type
        expect(diagram).toMatch(/class n_decide cls_decision;/);
        expect(diagram).toMatch(/classDef cls_decision .*fill:/);
    });
});
