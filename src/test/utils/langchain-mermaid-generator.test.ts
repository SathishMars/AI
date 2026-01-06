import { generateMermaidFromWorkflow } from '@/app/utils/MermaidGenerator';

describe('generateMermaidFromWorkflow', () => {
    it('uses curly braces for decision nodes', () => {
        type TestStep = {
            id: string;
            label: string;
            type: string;
            next?: string[];
            onConditionPass?: string;
            onConditionFail?: string;
        };

        const workflow: { steps: TestStep[] } = {
            steps: [
                { id: 'start', label: 'Start', type: 'start', next: ['decide'] },
                { id: 'decide', label: 'Is OK?', type: 'decision', onConditionPass: 'end', onConditionFail: 'end' },
                { id: 'end', label: 'End', type: 'end' },
            ],
        };

        const diagram = generateMermaidFromWorkflow(workflow);
    // decision node should be emitted with {} around the label (generator now includes markdown/backtick formatting)
    expect(diagram).toContain('n_decide{"`**Is OK?**(decision)`"}');
        // class assignment and definition should be present for the decision type
        expect(diagram).toMatch(/class n_decide cls_decision;/);
        expect(diagram).toMatch(/classDef cls_decision .*fill:/);
    });
});
