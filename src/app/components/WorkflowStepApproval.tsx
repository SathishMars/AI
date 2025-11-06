import { useEffect, useState } from "react";
import { WorkflowStep } from "../types/workflowTemplate";
import { Button } from "@/components/ui/button";
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
    approver: string;
    watchers?: string[];
    reason: string;
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
          approver: step.functionParams?.approver as string || '',
          watchers: step.functionParams?.watchers as string[] || [],
          reason: step.functionParams?.reason as string || '',
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
        functionParams: { ...step?.functionParams, approver: formData.approver || '', watchers: formData.watchers || [], reason: formData.reason || '' }
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
        approver: step?.functionParams?.approver as string || "",
        watchers: step?.functionParams?.watchers as string[] || [],
        reason: step?.functionParams?.reason as string || ""
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
        <Label htmlFor="approver">Approver</Label>
        <Input
          id="approver"
          value={formData.approver as string}
          onChange={(e) => setFormData((prev) => (prev ? { ...prev, approver: e.target.value } : null))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="watchers">Watchers</Label>
        <Input
          id="watchers"
          value={formData.watchers?.join(", ") || ""}
          onChange={(e) => setFormData((prev) => (prev ? { ...prev, watchers: e.target.value.split(",").map(w => w.trim()) } : null))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Input
          id="reason"
          value={formData.reason as string}
          onChange={(e) => setFormData((prev) => (prev ? { ...prev, reason: e.target.value } : null))}
        />
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