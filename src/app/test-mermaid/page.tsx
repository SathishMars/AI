'use client';

import React, { useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { generateMermaidDiagram } from '@/app/utils/mermaid-service';
import MermaidChart from '@/app/components/MermaidChart';

const TestMermaidPage = () => {
  const [mermaidDiagram, setMermaidDiagram] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Test workflow with complex conditions and multiple step types
  const testWorkflow = {
    schemaVersion: "1.0.0",
    metadata: {
      id: "test-event-workflow",
      name: "Enhanced Event Request Workflow",
      description: "Complex event approval workflow for testing enhanced Mermaid diagrams",
      version: "1.0.0",
      status: "draft" as const,
      tags: ["event-management", "approval", "automation"]
    },
    steps: {
      start: {
        name: "Event Request Submitted",
        type: "trigger" as const,
        action: "onMRFSubmit",
        params: { mrfID: "evt-2024-001", eventName: "Annual Company Conference" },
        nextSteps: ["validateRequest"]
      },
      validateRequest: {
        name: "Validate Request Details",
        type: "condition" as const, 
        condition: {
          all: [
            { fact: "form.numberOfAttendees", operator: "greaterThan", value: 50 },
            { fact: "form.budget", operator: "lessThanInclusive", value: 10000 },
            { fact: "user.department", operator: "in", value: ["HR", "Marketing", "Executive"] }
          ]
        },
        onSuccess: "checkApprovalRequired",
        onFailure: "rejectRequest"
      },
      checkApprovalRequired: {
        name: "Check if Manager Approval Required",
        type: "condition" as const,
        condition: {
          any: [
            { fact: "form.numberOfAttendees", operator: "greaterThan", value: 100 },
            { fact: "form.budget", operator: "greaterThan", value: 5000 },
            { fact: "form.hasExternalVendors", operator: "equal", value: true }
          ]
        },
        onSuccess: "requestApproval",
        onFailure: "autoApprove"
      },
      requestApproval: {
        name: "Send for Manager Approval",
        type: "action" as const,
        action: "functions.sendApprovalRequest",
        params: { 
          approverEmail: "manager@company.com",
          escalationHours: 48,
          template: "event_approval_request"
        },
        onSuccess: "createEvent",
        onFailure: "notifyFailure"
      },
      autoApprove: {
        name: "Auto-Approve Small Event",
        type: "action" as const, 
        action: "functions.autoApproveEvent",
        params: { reason: "Meets auto-approval criteria" },
        nextSteps: ["createEvent"]
      },
      createEvent: {
        name: "Create Event in System",
        type: "action" as const,
        action: "functions.createEventRecord", 
        params: { 
          eventType: "corporate_event",
          notifyStakeholders: true,
          generateCalendarInvite: true
        },
        nextSteps: ["success"]
      },
      rejectRequest: {
        name: "Reject Invalid Request",
        type: "action" as const,
        action: "functions.sendRejectionNotice",
        params: { 
          reason: "Request does not meet validation criteria",
          template: "event_rejection"
        },
        nextSteps: ["failure"]
      },
      notifyFailure: {
        name: "Notify of Processing Failure", 
        type: "action" as const,
        action: "functions.sendErrorNotification",
        params: { 
          errorType: "approval_failure",
          escalate: true
        },
        nextSteps: ["failure"]
      },
      success: {
        name: "Event Successfully Created",
        type: "end" as const,
        result: "success"
      },
      failure: {
        name: "Event Request Failed",
        type: "end" as const, 
        result: "failure"
      }
    }
  };

  const generateDiagram = async () => {
    setIsLoading(true);
    try {
      const diagram = await generateMermaidDiagram(testWorkflow);
      setMermaidDiagram(diagram);
    } catch (error) {
      console.error('Error generating diagram:', error);
      setMermaidDiagram('Error generating diagram. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Story 11: Enhanced LLM Mermaid Diagram Test
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Testing the enhanced LLM-powered Mermaid diagram generation with detailed workflow information,
        accessibility-compliant colors, and professional clean design without emoji clutter.
      </Typography>

      <Button 
        variant="contained" 
        onClick={generateDiagram}
        disabled={isLoading}
        sx={{ mb: 3 }}
      >
        {isLoading ? 'Generating Enhanced Diagram...' : 'Generate Enhanced Mermaid Diagram'}
      </Button>

      {mermaidDiagram && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Generated Enhanced Mermaid Diagram:
          </Typography>
          <Box sx={{ maxHeight: '80vh', overflow: 'auto' }}>
            <MermaidChart 
              chart={mermaidDiagram}
              id="test-workflow-diagram"
              onError={(error) => {
                console.error('Test Mermaid chart error:', error);
              }}
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default TestMermaidPage;