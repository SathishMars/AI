// src/app/components/PromptEngineeringDemo.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Science as ScienceIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

import { PromptEngineeringEngine } from '@/app/utils/prompt-engineering/prompt-engine';
import { PromptLibraryManager } from '@/app/utils/prompt-engineering/prompt-library';
import { PromptOptimizer } from '@/app/utils/prompt-engineering/prompt-optimizer';
import { createWorkflowContext } from '@/app/types/llm';
import type { 
  PromptTemplate, 
  ContextualPrompt,
  ABTest,
  PromptLibrary,
  PromptOptimization
} from '@/app/types/prompt-engineering';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

type AnalyticsData = {
  usage: PromptTemplate['metadata']['usage'];
  performance: PromptTemplate['metadata']['performance'];
  optimization: PromptOptimization | undefined;
  feedback: PromptTemplate['metadata']['effectiveness'];
};

export default function PromptEngineeringDemo() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Services
  const [promptEngine] = useState(() => new PromptEngineeringEngine());
  const [libraryManager] = useState(() => new PromptLibraryManager());
  const [optimizer] = useState(() => new PromptOptimizer());

  // State for different features
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [userInput, setUserInput] = useState('Create a workflow for event approval with 150 attendees');
  const [contextualResponse, setContextualResponse] = useState<ContextualPrompt | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [libraries, setLibraries] = useState<PromptLibrary[]>([]);
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [optimizationResults, setOptimizationResults] = useState<PromptOptimization[]>([]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [templatesData, librariesData] = await Promise.all([
        promptEngine.listTemplates(),
        libraryManager.listLibraries()
      ]);
      
      setTemplates(templatesData);
      setLibraries(librariesData);
      
      if (templatesData.length > 0) {
        setSelectedTemplate(templatesData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  }, [promptEngine, libraryManager]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleGenerateContextualPrompt = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      setError(null);

      const mockContext = createWorkflowContext(
        [{
          id: 'demo-msg',
          sender: 'user' as const,
          content: userInput,
          timestamp: new Date(),
          status: 'complete' as const,
          type: 'text' as const
        }],
        {
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
          role: 'manager',
          department: 'Events',
          permissions: ['workflow:create'],
          timezone: 'UTC'
        },
        {
          id: 'demo-mrf',
          title: 'Demo Event',
          attendees: 150,
          type: 'conference',
          requester: 'events-team',
          priority: 'high'
        }
      );

      const response = await promptEngine.generateContextualPrompt(
        selectedTemplate,
        mockContext,
        { additionalContext: userInput }
      );

      setContextualResponse(response);

      // Load analytics for the template
      const analyticsData = await promptEngine.getPromptAnalytics(selectedTemplate);
      setAnalytics(analyticsData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate contextual prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleRunABTest = async () => {
    if (!selectedTemplate || templates.length < 2) return;

    try {
      setLoading(true);
      setError(null);

      const template1 = templates.find(t => t.id === selectedTemplate);
      const template2 = templates.find(t => t.id !== selectedTemplate);

      if (!template1 || !template2) return;

      const abTest = await optimizer.createABTest({
        name: 'Demo A/B Test',
        description: 'Comparing two prompt templates',
        variants: [
          {
            name: 'Control',
            template: template1,
            trafficPercentage: 50
          },
          {
            name: 'Test',
            template: template2,
            trafficPercentage: 50
          }
        ],
        durationDays: 7,
        successMetric: 'accuracy',
        minimumSampleSize: 50
      });

      setAbTests(prev => [...prev, abTest]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create A/B test');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizePrompt = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      setError(null);

      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) return;

      const optimization = await optimizer.optimizePromptGenetic(template, {
        targetAccuracy: 0.9,
        targetSpeed: 2000,
        maxIterations: 3, // Small number for demo
        populationSize: 5
      });

      setOptimizationResults(prev => [...prev, optimization]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to optimize prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading && templates.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PsychologyIcon color="primary" />
        Prompt Engineering System Demo
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Select Template</InputLabel>
              <Select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                label="Select Template"
              >
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              sx={{ flexGrow: 1 }}
              label="User Input"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              multiline
              rows={2}
            />
            
            <Button
              variant="contained"
              onClick={handleGenerateContextualPrompt}
              disabled={loading || !selectedTemplate}
              startIcon={loading ? <CircularProgress size={20} /> : <PsychologyIcon />}
            >
              Generate
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="prompt engineering tabs">
          <Tab label="Contextual Generation" />
          <Tab label="Template Library" />
          <Tab label="A/B Testing" />
          <Tab label="Optimization" />
          <Tab label="Analytics" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        {contextualResponse && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generated Contextual Prompt
              </Typography>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">Final Prompt</Typography>
                    <Chip 
                      label={`Confidence: ${Math.round(contextualResponse.confidence * 100)}%`}
                      color={contextualResponse.confidence > 0.8 ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {contextualResponse.finalPrompt}
                    </Typography>
                  </Paper>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">Dynamic Variables</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {contextualResponse.dynamicVariables.map((variable) => (
                      <Chip 
                        key={variable.name} 
                        label={`${variable.name} (${variable.source})`} 
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">AI Reasoning</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {contextualResponse.reasoning.map((reason, index) => (
                      <Typography key={index} variant="body2">
                        • {reason}
                      </Typography>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Stack spacing={2}>
          {libraries.map((library) => (
            <Card key={library.id}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {library.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {library.description}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {library.categories.map((category) => (
                    <Chip key={String(category)} label={String(category)} size="small" />
                  ))}
                </Box>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  {library.templates.length} templates • {library.organization}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            onClick={handleRunABTest}
            disabled={loading || templates.length < 2}
            startIcon={<ScienceIcon />}
          >
            Create Demo A/B Test
          </Button>
        </Box>

        <Stack spacing={2}>
          {abTests.map((test) => (
            <Card key={test.id}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {test.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {test.description}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Variants:
                  </Typography>
                  {test.variants.map((variant) => (
                    <Box key={variant.id} sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        <strong>{variant.name}</strong> - {variant.trafficPercentage}% traffic
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={variant.trafficPercentage} 
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ))}
                </Box>

                <Chip 
                  label={test.status}
                  color={test.status === 'running' ? 'success' : 'default'}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          ))}
        </Stack>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            onClick={handleOptimizePrompt}
            disabled={loading || !selectedTemplate}
            startIcon={<TrendingUpIcon />}
          >
            Optimize Selected Template
          </Button>
        </Box>

        <Stack spacing={2}>
          {optimizationResults.map((result, index) => (
            <Card key={index}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Optimization Result #{index + 1}
                </Typography>
                
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Original Template:
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {result.originalTemplate.name}
                    </Typography>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Optimized Template:
                    </Typography>
                    <Typography variant="body2">
                      {result.optimizedTemplate.name}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Improvements:
                    </Typography>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Accuracy:</Typography>
                        <Chip 
                          label={`+${Math.round(result.improvementMetrics.accuracyImprovement * 100)}%`}
                          color="success"
                          size="small"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Speed:</Typography>
                        <Chip 
                          label={`+${Math.round(result.improvementMetrics.speedImprovement * 100)}%`}
                          color="success"
                          size="small"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Confidence:</Typography>
                        <Chip 
                          label={`${Math.round(result.confidence * 100)}%`}
                          color={result.confidence > 0.8 ? 'success' : 'warning'}
                          size="small"
                        />
                      </Box>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        {analytics && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SpeedIcon />
                Template Analytics
              </Typography>
              
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center', flex: 1 }}>
                  <Typography variant="h4" color="primary">
                    {analytics.usage.totalInvocations}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Invocations
                  </Typography>
                </Paper>
                
                <Paper sx={{ p: 2, textAlign: 'center', flex: 1 }}>
                  <Typography variant="h4" color="success.main">
                    {Math.round((analytics.usage.successfulInvocations / Math.max(analytics.usage.totalInvocations, 1)) * 100)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Success Rate
                  </Typography>
                </Paper>
                
                <Paper sx={{ p: 2, textAlign: 'center', flex: 1 }}>
                  <Typography variant="h4" color="info.main">
                    {Math.round(analytics.performance.averageResponseTime)}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Response Time
                  </Typography>
                </Paper>
              </Stack>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Performance Metrics
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Metric</TableCell>
                        <TableCell align="right">Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Accuracy Score</TableCell>
                        <TableCell align="right">{Math.round(analytics.feedback.accuracyScore * 100)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Quality Score</TableCell>
                        <TableCell align="right">{Math.round(analytics.feedback.qualityScore * 100)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>User Satisfaction</TableCell>
                        <TableCell align="right">{Math.round(analytics.feedback.userSatisfactionScore * 100)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Cost per Request</TableCell>
                        <TableCell align="right">${analytics.performance.costPerRequest.toFixed(4)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </CardContent>
          </Card>
        )}
      </TabPanel>
    </Box>
  );
}