import { useEffect, useState } from "react";
import { WorkflowStep } from "../types/workflowTemplate";
import { Box, Button, IconButton, MenuItem, Select, TextField, Typography } from "@mui/material";
import RemoveIcon from '@mui/icons-material/Remove';

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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }} onClick={(e) => e.stopPropagation()}>
            <TextField
                label="Label"
                size="small"
                value={formData.label as string}
                onChange={(e) => setFormData((prev) => (prev ? { ...prev, label: e.target.value } : null))}
            />

            <TextField
                label="The variable to evaluate"
                size="small"
                value={formData.evaluate as string}
                onChange={(e) => setFormData((prev) => (prev ? { ...prev, evaluate: e.target.value } : null))}
                helperText="Set the variable in the request you want to evaluate"
            />
            {(formData.conditions && formData.conditions.length > 0) ? (
                formData.conditions.map((cond, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 1, width: '100%', alignItems: 'stretch' }}>
                        <TextField
                            label="Value"
                            size="small"
                            value={cond.value}
                            sx={{ width: '150px' }}
                            onChange={(e) => {
                                const newConditions = [...(formData.conditions || [])];
                                newConditions[idx].value = e.target.value;
                                setFormData((prev) => (prev ? { ...prev, conditions: newConditions } : null));
                            }}
                        />
                        <Select
                            label="Next Step"
                            size="small"
                            displayEmpty
                            value={cond.next}
                            sx={{ flexGrow: 1 }}
                            onChange={(e) => {
                                const newConditions = [...(formData.conditions || [])];
                                newConditions[idx].next = e.target.value;
                                setFormData((prev) => (prev ? { ...prev, conditions: newConditions } : null));
                            }}
                        >
                            {Object.entries(stepIdMap).map(([id, label]) => (
                                <MenuItem key={id} value={id}>
                                    {label}
                                </MenuItem>
                            ))}
                        </Select>
                        <IconButton
                            color="error"
                            size="small"
                            sx={{ width: '40px' }}
                            onClick={() => {
                                const newConditions = [...(formData.conditions || [])];
                                newConditions.splice(idx, 1);
                                setFormData((prev) => (prev ? { ...prev, conditions: newConditions } : null));
                            }}
                        >
                            <RemoveIcon />
                        </IconButton>
                    </Box>
                ))
            ) : (
                <Typography variant="body2" color="textSecondary">
                    No conditions defined. Add conditions to define possible values and next steps.
                </Typography>
            )}
            <Button
                variant="outlined"
                size="small"
                onClick={() => {
                    const newConditions = [...(formData.conditions || []), { value: '', next: '' }];
                    setFormData((prev) => (prev ? { ...prev, conditions: newConditions } : null));
                }}
            >
                Add Condition
            </Button>
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