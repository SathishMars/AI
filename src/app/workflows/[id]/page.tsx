// src/app/workflows/[id]/page.tsx
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
  Chip,
  Stack
} from '@mui/material';
import { PlayArrow as PlayIcon, Edit as EditIcon } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'deprecated' | 'archived';
  version: string;
  workflowDefinition: {
    steps: unknown[];
  };
  mermaidDiagram?: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    author: string;
    tags?: string[];
  };
}

export default function ViewWorkflowPage({ params }: PageProps) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        
        setTemplateId(id);
        setIsLoading(true);
        
        // TODO: Implement API call to fetch published workflow
        // For now, show placeholder
        
        // Simulated API call
        setTimeout(() => {
          setTemplate({
            id,
            name: 'Sample Workflow',
            status: 'published',
            version: '1.0.0',
            workflowDefinition: {
              steps: []
            },
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              author: 'System',
              tags: ['sample']
            }
          });
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

  const handleExecute = () => {
    if (templateId) {
      router.push(`/workflows/${templateId}/execute`);
    }
  };

  const handleEdit = () => {
    if (templateId) {
      router.push(`/workflows/configure/${templateId}`);
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

  // Main view
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
              {template.name}
            </Typography>
            <Chip 
              label={template.status} 
              color={template.status === 'published' ? 'success' : 'default'}
              size="small"
            />
            <Chip 
              label={`v${template.version}`} 
              variant="outlined"
              size="small"
            />
          </Stack>
          
          <Stack direction="row" spacing={2}>
            <Button 
              variant="contained" 
              startIcon={<PlayIcon />}
              onClick={handleExecute}
            >
              Execute Workflow
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit Workflow
            </Button>
          </Stack>
        </Box>

        {/* Metadata */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Details
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>Author:</strong> {template.metadata.author}
            </Typography>
            <Typography variant="body2">
              <strong>Created:</strong> {new Date(template.metadata.createdAt).toLocaleString()}
            </Typography>
            <Typography variant="body2">
              <strong>Last Updated:</strong> {new Date(template.metadata.updatedAt).toLocaleString()}
            </Typography>
            {template.metadata.tags && template.metadata.tags.length > 0 && (
              <Box>
                <Typography variant="body2" component="span">
                  <strong>Tags:</strong>{' '}
                </Typography>
                {template.metadata.tags.map((tag, index) => (
                  <Chip key={index} label={tag} size="small" sx={{ mr: 0.5 }} />
                ))}
              </Box>
            )}
          </Stack>
        </Box>

        {/* Workflow Visualization */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Workflow Diagram
          </Typography>
          <Alert severity="info">
            Workflow visualization will be displayed here using Mermaid diagram.
          </Alert>
        </Box>
      </Paper>
    </Container>
  );
}
