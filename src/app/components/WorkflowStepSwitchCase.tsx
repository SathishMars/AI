import { useEffect, useState } from "react";
import { WorkflowStep } from "../types/workflowTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Minus } from "lucide-react";

interface WorkflowStepSwitchCaseProps {
    step: WorkflowStep | null | undefined;
    stepIdMap: Record<string, string>; // map of stepId to WorkflowStep label for display
    /** Optional callback when user saves edits. Receives updated WorkflowStep */
    onSave?: (updated: WorkflowStep) => void;
    /** Optional callback when user cancels editing */
    onCancel?: () => void;
}


interface triggerFormData {
    id: string;
    label: string;
    evaluate: string;
    conditions?: Array<{ value: string; next: string }>;
}


export default function WorkflowStepSwitchCase({
    step,
    stepIdMap,
    onSave,
    onCancel
}: WorkflowStepSwitchCaseProps) {
    const [formData, setFormData] = useState<triggerFormData | null>(
        step
            ? {
                id: step.id,
                label: step.label,
                evaluate: step.functionParams?.evaluate as string || '',
            }
            : null
    );
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!step) {
            setFormData(null);
            return;
        }
        setFormData(
            {
                id: step.id,
                label: step.label,
                evaluate: step.functionParams?.evaluate as string || '',
                conditions: step.conditions ? JSON.parse(JSON.stringify(step.conditions)) : []
            }
        );
    }, [step]);

    if (!formData) return null;

    const handleSave = () => {
        // validate params JSON
        try {
            const updated: WorkflowStep = {
                ...step!,
                label: (formData.label as string) || "",
                functionParams: { mrfTemplateName: formData.evaluate || '' }
            }
            setError(null);
            if (onSave) onSave(updated);
            else console.log("Save trigger (no onSave handler):", updated);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setError("Params must be valid JSON: " + msg);
        }
    };

    const handleCancel = () => {
        // reset to original
        setFormData({
            id: step?.id || "",
            label: step?.label || "",
            evaluate: step?.functionParams?.evaluate as string || ""
        });
        if (onCancel) onCancel();
    };


    return (
        <div className="flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                    id="label"
                    value={formData.label as string}
                    onChange={(e) => setFormData((prev) => (prev ? { ...prev, label: e.target.value } : null))}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="evaluate">The variable to evaluate</Label>
                <Input
                    id="evaluate"
                    value={formData.evaluate as string}
                    onChange={(e) => setFormData((prev) => (prev ? { ...prev, evaluate: e.target.value } : null))}
                />
                <p className="text-xs text-muted-foreground">Set the variable in the request you want to evaluate</p>
            </div>

            {(formData.conditions && formData.conditions.length > 0) ? (
                formData.conditions.map((cond, idx) => (
                    <div key={idx} className="flex gap-2 w-full items-start">
                        <div className="w-[150px] space-y-2">
                            <Label htmlFor={`value-${idx}`}>Value</Label>
                            <Input
                                id={`value-${idx}`}
                                value={cond.value}
                                onChange={(e) => {
                                    const newConditions = [...(formData.conditions || [])];
                                    newConditions[idx].value = e.target.value;
                                    setFormData((prev) => (prev ? { ...prev, conditions: newConditions } : null));
                                }}
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label htmlFor={`next-${idx}`}>Next Step</Label>
                            <Select
                                value={cond.next}
                                onValueChange={(value) => {
                                    const newConditions = [...(formData.conditions || [])];
                                    newConditions[idx].next = value;
                                    setFormData((prev) => (prev ? { ...prev, conditions: newConditions } : null));
                                }}
                            >
                                <SelectTrigger id={`next-${idx}`}>
                                    <SelectValue placeholder="Select next step" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(stepIdMap).map(([id, label]) => (
                                        <SelectItem key={id} value={id}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            variant="destructive"
                            size="icon-sm"
                            className="mt-8"
                            onClick={() => {
                                const newConditions = [...(formData.conditions || [])];
                                newConditions.splice(idx, 1);
                                setFormData((prev) => (prev ? { ...prev, conditions: newConditions } : null));
                            }}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground">
                    No conditions defined. Add conditions to define possible values and next steps.
                </p>
            )}
            
            <Button
                variant="outline"
                size="sm"
                onClick={() => {
                    const newConditions = [...(formData.conditions || []), { value: '', next: '' }];
                    setFormData((prev) => (prev ? { ...prev, conditions: newConditions } : null));
                }}
            >
                Add Condition
            </Button>

            {error && (
                <p className="text-sm text-destructive">
                    {error}
                </p>
            )}

            <div className="flex gap-2">
                <Button onClick={handleSave} size="sm">
                    Save
                </Button>
                <Button variant="outline" onClick={handleCancel} size="sm">
                    Cancel
                </Button>
            </div>
        </div>
    );
}