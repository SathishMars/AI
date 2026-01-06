import { useEffect, useState } from "react";
import { WorkflowStep } from "../types/workflowTemplate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WorkflowStepTriggerProps {
  step: WorkflowStep | null | undefined;
  /** Optional callback when user saves edits. Receives updated WorkflowStep */
  onSave?: (updated: WorkflowStep) => void;
  /** Optional callback when user cancels editing */
  onCancel?: () => void;
}


interface triggerFormData {
    id: string;
    label: string;
    evaluate: string;
}


export default function WorkflowStepTrigger({ 
    step, 
    onSave, 
    onCancel 
}: WorkflowStepTriggerProps) {
  const [formData, setFormData] = useState<triggerFormData| null>(
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
    setFormData(JSON.parse(JSON.stringify(step)));
  }, [step]);

  if (!formData) return null;

  const handleSave = () => {
    // validate params JSON
    try {
      const updated: WorkflowStep = {
        ...step!,
        label: (formData.label as string) || "",
        functionParams: { mrfTemplateName: formData.evaluate || ''}
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
        <Label htmlFor="condition">Condition Expression</Label>
        <Textarea
          id="condition"
          rows={3}
          value={formData.evaluate as string}
          onChange={(e) => setFormData((prev) => (prev ? { ...prev, evaluate: e.target.value } : null))}
        />
        <p className="text-xs text-muted-foreground">Edit JSON params for the trigger.</p>
      </div>

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