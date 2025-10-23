import { useEffect, useState } from "react";
import { WorkflowStep } from "../types/workflowTemplate";
import { Box, Button, TextField, Typography } from "@mui/material";

interface WorkflowStepNotifyProps {
    step: WorkflowStep | null | undefined;
    /** Optional callback when user saves edits. Receives updated WorkflowStep */
    onSave?: (updated: WorkflowStep) => void;
    /** Optional callback when user cancels editing */
    onCancel?: () => void;
}


interface triggerFormData {
    id: string;
    label: string;
    to: string;
    subject: string;
    notificationTemplateId: string;
}


export default function WorkflowStepNotify({
    step,
    onSave,
    onCancel
}: WorkflowStepNotifyProps) {
    const [formData, setFormData] = useState<triggerFormData | null>(
        step
            ? {
                id: step.id,
                label: step.label,
                to: step.functionParams?.to as string || '',
                subject: step.functionParams?.subject as string || '',
                notificationTemplateId: step.functionParams?.notificationTemplateId as string || ''
            }
            : null
    );
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!step) {
            setFormData(null);
            return;
        }
        setFormData({
            id: step.id,
            label: step.label,
            to: step.functionParams?.to as string || '',
            subject: step.functionParams?.subject as string || '',
            notificationTemplateId: step.functionParams?.notificationTemplateId as string || ''
        });
    }, [step]);

    if (!formData) return null;

    const handleSave = () => {
        // validate params JSON
        try {
            const updated: WorkflowStep = {
                ...step!,
                label: (formData.label as string) || "",
                functionParams: { to: formData.to || '', subject: formData.subject || '', notificationTemplateName: formData.notificationTemplateName || '' }
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
            to: step?.functionParams?.to as string || "",
            subject: step?.functionParams?.subject as string || "",
            notificationTemplateId: step?.functionParams?.notificationTemplateId as string || ""
        });
        if (onCancel) onCancel();
    };


    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }} onClick={(e) => e.stopPropagation()}>
            <TextField
                label="Label"
                size="small"
                value={formData.label}
                onChange={(e) => setFormData((prev) => (prev ? { ...prev, label: e.target.value } : null))}
            />

            <TextField
                label="To"
                value={formData.to}
                onChange={(e) => setFormData((prev) => (prev ? { ...prev, to: e.target.value } : null))}
                helperText="Edit JSON params for the trigger."
            />

            <TextField
                label="Subject"
                value={formData.subject}
                onChange={(e) => setFormData((prev) => (prev ? { ...prev, subject: e.target.value } : null))}
                helperText="Edit JSON params for the trigger."
            />

            <TextField
                label="Notification Template Name"
                value={formData.notificationTemplateId}
                onChange={(e) => setFormData((prev) => (prev ? { ...prev, notificationTemplateId: e.target.value } : null))}
                helperText="Edit JSON params for the trigger."
            />

            {error && (
                <Typography color="error" variant="body2">
                    {error}
                </Typography>
            )}

            <Box sx={{ display: "flex", gap: 1 }}>
                <Button variant="contained" color="primary" onClick={handleSave} size="small">
                    Save
                </Button>
                <Button variant="outlined" onClick={handleCancel} size="small">
                    Cancel
                </Button>
            </Box>
        </Box>
    );
}