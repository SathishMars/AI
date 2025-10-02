// src/app/components/WorkflowTemplateBrowser.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  FileCopy as CopyIcon,
  Delete as DeleteIcon,
  Publish as PublishIcon
} from '@mui/icons-material';
import { workflowTemplateService } from '@/app/services/workflow-template-service';
import { 
  WorkflowTemplate, 
  TemplateListResponse,
  TemplateQueryFilters
} from '@/app/types/workflow-template';

interface WorkflowTemplateBrowserProps {
  account?: string;
  onSelectTemplate?: (template: WorkflowTemplate) => void;
  onCreateNew?: () => void;
  showActions?: boolean;
  maxHeight?: string | number;
}

export default function WorkflowTemplateBrowser({
  account = 'default-account',
  onSelectTemplate,
  onCreateNew,
  showActions = true,
  maxHeight = 600
}: WorkflowTemplateBrowserProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<WorkflowTemplate | null>(null);

  // Set account on service
  useEffect(() => {
    workflowTemplateService.setAccount(account);
  }, [account]);

  // Load templates
  const loadTemplates = async (filters: TemplateQueryFilters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response: TemplateListResponse = await workflowTemplateService.listTemplates(
        filters,
        1,
        100
      );
      
      setTemplates(response.templates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load templates';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadTemplates();
  }, [account]);

  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
    const filters: TemplateQueryFilters = {};
    
    switch (newValue) {
      case 0: // All
        break;
      case 1: // Drafts
        filters.status = 'draft';
        break;
      case 2: // Published
        filters.status = 'published';
        break;
    }
    
    loadTemplates(filters);
  };

  // Filter templates by search query
  const filteredTemplates = templates.filter(template => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(searchLower) ||
      template.workflowDefinition.metadata.description?.toLowerCase().includes(searchLower) ||
      template.workflowDefinition.metadata.tags?.some(tag => 
        tag.toLowerCase().includes(searchLower)
      )
    );
  });

  // Handle template actions
  const handleEdit = (template: WorkflowTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
  };

  const handleView = (template: WorkflowTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
  };

  const handleCopy = async (template: WorkflowTemplate) => {
    // TODO: Implement copy functionality
    console.log('Copy template:', template.name);
  };

  const handleDelete = (template: WorkflowTemplate) => {
    setTemplateToDelete(template);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      setIsLoading(true);
      await workflowTemplateService.deleteTemplate(
        templateToDelete.name,
        templateToDelete.version
      );
      
      // Reload templates
      await loadTemplates();
      
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (template: WorkflowTemplate) => {
    try {
      setIsLoading(true);
      await workflowTemplateService.publishTemplate(template.name, template.version);
      
      // Reload templates
      await loadTemplates();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish template';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Workflow Templates
        </Typography>
        {onCreateNew && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateNew}
            size="small"
          >
            New Template
          </Button>
        )}
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search templates..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Tabs */}
      <Tabs value={selectedTab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="All" />
        <Tab label="Drafts" />
        <Tab label="Published" />
      </Tabs>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Template List */}
      <Box sx={{ maxHeight, overflow: 'auto' }}>
        {!isLoading && filteredTemplates.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            {searchQuery ? 'No templates match your search.' : 'No templates found.'}
          </Typography>
        )}

        <List>
          {filteredTemplates.map((template) => (
            <ListItem key={`${template.name}-${template.version}`} divider>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" component="span">
                      {template.name}
                    </Typography>
                    <Chip
                      label={template.status}
                      size="small"
                      color={template.status === 'published' ? 'primary' : 'default'}
                    />
                    <Chip
                      label={`v${template.version}`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {template.workflowDefinition.metadata.description || 'No description'}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Updated: {formatDate(template.metadata?.updatedAt || new Date())}
                      </Typography>
                      {template.workflowDefinition.metadata.tags && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {template.workflowDefinition.metadata.tags.slice(0, 3).map((tag) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>
                }
              />
              {showActions && (
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => handleView(template)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    {template.status === 'draft' && (
                      <>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEdit(template)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Publish">
                          <IconButton size="small" onClick={() => handlePublish(template)}>
                            <PublishIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title="Copy">
                      <IconButton size="small" onClick={() => handleCopy(template)}>
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDelete(template)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &ldquo;{templateToDelete?.name}&rdquo; version {templateToDelete?.version}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}