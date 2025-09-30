// src/app/components/Story4Progress.tsx
'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Build,
  Speed,
  Psychology,
  ExpandMore,
  Code
} from '@mui/icons-material';

interface ProgressItemProps {
  title: string;
  status: 'complete' | 'in-progress' | 'planned';
  description: string;
  details?: string[];
}

const ProgressItem: React.FC<ProgressItemProps> = ({ title, status, description, details }) => {
  const getIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle color="success" />;
      case 'in-progress':
        return <Build color="warning" />;
      case 'planned':
        return <Build color="disabled" />;
    }
  };

  const getColor = () => {
    switch (status) {
      case 'complete':
        return 'success';
      case 'in-progress':
        return 'warning';
      case 'planned':
        return 'default';
    }
  };

  return (
    <ListItem>
      <ListItemIcon>
        {getIcon()}
      </ListItemIcon>
      <ListItemText 
        primary={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle1">{title}</Typography>
            <Chip 
              label={status.replace('-', ' ')} 
              color={getColor() as 'success' | 'warning' | 'default'} 
              size="small" 
            />
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {description}
            </Typography>
            {details && (
              <Box sx={{ ml: 2 }}>
                {details.map((detail, index) => (
                  <Typography key={index} variant="caption" display="block" color="text.secondary">
                    • {detail}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        }
      />
    </ListItem>
  );
};

export default function Story4Progress() {
  const progressItems: ProgressItemProps[] = [
    {
      title: "LLM Type System Foundation",
      status: "complete",
      description: "Comprehensive TypeScript interfaces for multi-LLM backend integration",
      details: [
        "LLMProvider interface with 5 task types (workflow_build, workflow_edit, mermaid_generate, mrf_chat, validation_explain)",
        "WorkflowContext with user data, MRF info, and conversation history",
        "TaskModelConfig for OpenAI/Anthropic model selection",
        "Health monitoring and accuracy testing framework types",
        "Stream chunk interfaces for real-time AI responses",
        "Cache management and rate limiting interfaces",
        "Default configurations for both providers"
      ]
    },
    {
      title: "OpenAI Provider Implementation",
      status: "complete",
      description: "Full OpenAI GPT integration with streaming support and error handling",
      details: [
        "Streaming workflow generation with GPT-4 Turbo",
        "Context-aware prompt enrichment with user/MRF data",
        "Rate limiting (60 requests/minute)",
        "Health monitoring with API status checks",
        "Response validation for workflow JSON and Mermaid diagrams",
        "Automatic token estimation and context truncation",
        "Comprehensive error handling and logging"
      ]
    },
    {
      title: "Anthropic Provider Implementation", 
      status: "complete",
      description: "Full Claude integration with streaming and intelligent fallback",
      details: [
        "Claude-3 Opus/Sonnet/Haiku model integration",
        "Streaming response generation matching OpenAI interface",
        "Lower rate limits (50 requests/minute) for Anthropic API",
        "Consistent validation and health monitoring",
        "Identical feature parity with OpenAI provider",
        "Error handling with provider-specific messaging"
      ]
    },
    {
      title: "Multi-LLM Manager Architecture",
      status: "in-progress",
      description: "Intelligent provider selection with automatic fallback and accuracy tracking",
      details: [
        "Dynamic provider selection based on health and accuracy",
        "Automatic fallback between OpenAI and Anthropic",
        "Task-specific model optimization",
        "Accuracy testing framework for provider comparison",
        "Health monitoring across all providers",
        "Provider metrics and performance tracking",
        "⚠️ Configuration type mismatches need resolution",
        "⚠️ Async generator return types need fixes"
      ]
    },
    {
      title: "Integration Testing Suite",
      status: "in-progress", 
      description: "Comprehensive testing for LLM provider functionality",
      details: [
        "OpenAI provider test suite with mocked API calls",
        "Response validation testing (workflow JSON, Mermaid, text)",
        "Rate limiting and health check testing",
        "Context enrichment and truncation testing",
        "⚠️ Test configuration type fixes needed",
        "⚠️ Mock implementations need completion"
      ]
    },
    {
      title: "Configuration Management",
      status: "planned",
      description: "Environment-based API key and model configuration",
      details: [
        "Environment variable configuration for API keys",
        "Model selection based on task complexity",
        "Rate limiting configuration per provider",
        "Fallback provider priority settings",
        "Development vs production configurations"
      ]
    },
    {
      title: "Integration with Story 3",
      status: "planned",
      description: "Connect AI conversation interface with LLM backend",
      details: [
        "Replace mock conversation responses with real LLM streams",
        "Integrate multi-LLM manager with conversation system",
        "Add provider selection UI in conversation interface",
        "Stream AI responses in real-time to conversation pane",
        "Error handling and fallback provider messaging"
      ]
    }
  ];

  const completedItems = progressItems.filter(item => item.status === 'complete').length;
  const totalItems = progressItems.length;
  const progressPercentage = (completedItems / totalItems) * 100;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Story 4: Multi-LLM Backend Integration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          <strong>Progress:</strong> {completedItems}/{totalItems} components complete ({progressPercentage.toFixed(1)}%)
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={progressPercentage} 
          sx={{ mt: 1 }}
        />
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        <Box sx={{ flex: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Implementation Progress
              </Typography>
              <List>
                {progressItems.map((item, index) => (
                  <ProgressItem key={index} {...item} />
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Psychology sx={{ mr: 1, verticalAlign: 'middle' }} />
                AI Providers
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Chip 
                  label="OpenAI GPT-4 Turbo" 
                  color="success" 
                  size="small" 
                  sx={{ mr: 1, mb: 1 }}
                />
                <Chip 
                  label="Claude-3 Opus" 
                  color="success" 
                  size="small" 
                  sx={{ mr: 1, mb: 1 }}
                />
                <Chip 
                  label="Claude-3 Sonnet" 
                  color="success" 
                  size="small" 
                  sx={{ mr: 1, mb: 1 }}
                />
                <Chip 
                  label="Claude-3 Haiku" 
                  color="success" 
                  size="small" 
                  sx={{ mr: 1, mb: 1 }}
                />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Speed sx={{ mr: 1, verticalAlign: 'middle' }} />
                Features
              </Typography>
              <List dense>
                <ListItem disablePadding>
                  <ListItemText primary="Streaming responses" />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText primary="Automatic fallback" />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText primary="Rate limiting" />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText primary="Health monitoring" />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText primary="Accuracy testing" />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText primary="Context enrichment" />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Known Issues:</strong>
            </Typography>
            <Typography variant="caption" display="block">
              • Configuration type mismatches in multi-LLM manager
            </Typography>
            <Typography variant="caption" display="block">
              • Test suite mock implementations need completion
            </Typography>
            <Typography variant="caption" display="block">
              • Environment configuration management pending
            </Typography>
          </Alert>
        </Box>
      </Box>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Code sx={{ mr: 1, verticalAlign: 'middle' }} />
            Technical Implementation Details
          </Typography>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">Files Created</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" component="pre" style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
{`src/app/types/llm.ts                     - Core LLM type definitions
src/app/utils/llm/openai-provider.ts      - OpenAI GPT implementation  
src/app/utils/llm/anthropic-provider.ts   - Anthropic Claude implementation
src/app/utils/llm/multi-llm-manager.ts    - Multi-provider coordinator
src/test/app/utils/llm/openai-provider.test.ts - Test suite`}
                </Typography>
              </Paper>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">Key Interfaces</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" component="pre" style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
{`LLMProvider interface:
- generateWorkflow() - Create workflows from natural language
- editWorkflow() - Modify existing workflows  
- generateMermaid() - Create flowchart diagrams
- handleMRFChat() - Conversational meeting planning
- explainValidationErrors() - Error explanations

WorkflowContext:
- User permissions and department info
- MRF (Meeting Request Form) data
- Conversation history for context
- Available functions library

LLMStreamChunk:
- Real-time response streaming
- Metadata for tokens, timing, provider
- Task tracking and completion status`}
                </Typography>
              </Paper>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">Next Steps</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="1. Fix Configuration Types"
                    secondary="Resolve TaskModelConfig complexity and streaming properties"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="2. Complete Multi-LLM Manager"
                    secondary="Fix async generator return types and error handling"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="3. Environment Configuration"
                    secondary="Add API key management and model selection configs"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="4. Integration Testing"
                    secondary="Complete test suite with proper mocking and edge cases"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="5. Story 3 Integration"
                    secondary="Connect conversation interface with real LLM backends"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>
    </Box>
  );
}