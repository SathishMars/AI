// src/app/workflows/[id]/execute/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  CircularProgress,
  Typography,
  Container,
  Button,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Stack,
  Chip
} from '@mui/material';
import { PlayArrow as PlayIcon, Stop as StopIcon } from '@mui/icons-material';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  version: string;
}

interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: string;
  endTime?: string;
  result?: unknown;
  error?: string;
}

export default function ExecuteWorkflowPage({ params }: PageProps) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        
        setTemplateId(id);
        setIsLoading(true);
        
        // TODO: Implement API call to fetch workflow template
        // For now, show placeholder
        
        // Simulated API call
        setTimeout(() => {
          setTemplate({
            id,
            name: 'Sample Workflow',
            version: '1.0.0'
          });
          
          // Initialize execution steps
          setExecutionSteps([
            { id: 'step1', name: 'Initialize Workflow', status: 'pending' },
            { id: 'step2', name: 'Validate Input', status: 'pending' },
            { id: 'step3', name: 'Execute Action', status: 'pending' },
            { id: 'step4', name: 'Complete Workflow', status: 'pending' }
          ]);
          
          setIsLoading(false);
        }, 500);
        
      } catch (err) {
        console.error('Error loading workflow:', err);
        setError('Failed to load workflow template');
        setIsLoading(false);
      }
    };
    
    loadTemplate();
  }, [params]);

  const handleStartExecution = () => {
    setIsExecuting(true);
    setCurrentStepIndex(0);
    
    // TODO: Implement actual workflow execution logic
    // For now, simulate step-by-step execution
    simulateExecution();
  };

  const handleStopExecution = () => {
    setIsExecuting(false);
    // TODO: Implement workflow cancellation
  };

  const simulateExecution = () => {
    // Placeholder simulation for demonstration
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex >= executionSteps.length) {
        clearInterval(interval);
        setIsExecuting(false);
        return;
      }

      setExecutionSteps(prev => {
        const updated = [...prev];
        if (stepIndex > 0) {
          updated[stepIndex - 1].status = 'completed';
          updated[stepIndex - 1].endTime = new Date().toISOString();
        }
        updated[stepIndex].status = 'running';
        updated[stepIndex].startTime = new Date().toISOString();
        return updated;
      });

      setCurrentStepIndex(stepIndex);
      stepIndex++;
    }, 2000);
  };

  const getStepStatusColor = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'primary';
      case 'failed': return 'error';
      case 'skipped': return 'default';
      default: return 'default';
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400, gap: 2 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Loading workflow...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Show error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    );
  }

  // Show empty state if no workflow loaded
  if (!template) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Workflow Not Found
          </Typography>
          <Typography color="text.secondary" paragraph>
            The requested workflow template could not be found.
          </Typography>
          <Button component={Link} href="/workflows/configure/new" variant="contained">
            Create New Workflow
          </Button>
        </Box>
      </Container>
    );
  }

  // Main execution view
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
              Execute: {template.name}
            </Typography>
            <Chip 
              label={`v${template.version}`} 
              variant="outlined"
              size="small"
            />
          </Stack>
          
          <Stack direction="row" spacing={2}>
            {!isExecuting ? (
              <Button 
                variant="contained" 
                startIcon={<PlayIcon />}
                onClick={handleStartExecution}
              >
                Start Execution
              </Button>
            ) : (
              <Button 
                variant="outlined" 
                color="error"
                startIcon={<StopIcon />}
                onClick={handleStopExecution}
              >
                Stop Execution
              </Button>
            )}
            <Button 
              component={Link} 
              href={`/workflows/${templateId}`}
              variant="outlined"
            >
              View Workflow Details
            </Button>
          </Stack>
        </Box>

        {/* Execution Progress */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Execution Progress
          </Typography>
          
          {executionSteps.length === 0 ? (
            <Alert severity="info">
              No execution steps available. Click &quot;Start Execution&quot; to begin.
            </Alert>
          ) : (
            <Stepper activeStep={currentStepIndex} orientation="vertical">
              {executionSteps.map((step) => (
                <Step key={step.id} completed={step.status === 'completed'}>
                  <StepLabel
                    error={step.status === 'failed'}
                    optional={
                      step.status !== 'pending' && (
                        <Chip 
                          label={step.status} 
                          size="small" 
                          color={getStepStatusColor(step.status)}
                        />
                      )
                    }
                  >
                    {step.name}
                  </StepLabel>
                  <StepContent>
                    <Box sx={{ mb: 2 }}>
                      {step.status === 'running' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={20} />
                          <Typography variant="body2" color="text.secondary">
                            Executing...
                          </Typography>
                        </Box>
                      )}
                      {step.status === 'completed' && (
                        <Typography variant="body2" color="success.main">
                          Completed successfully
                        </Typography>
                      )}
                      {step.status === 'failed' && step.error && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {step.error}
                        </Alert>
                      )}
                      {step.startTime && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Started: {new Date(step.startTime).toLocaleString()}
                        </Typography>
                      )}
                      {step.endTime && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Completed: {new Date(step.endTime).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
