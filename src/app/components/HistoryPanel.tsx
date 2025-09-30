// src/app/components/HistoryPanel.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Chip,
  Tooltip,
  Skeleton,
  Badge,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Message as MessageIcon,
  SmartToy as AimeIcon,
  Person as UserIcon,
  Edit as EditIcon,
  Publish as PublishIcon,
  Schedule as DraftIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { ConversationMessage } from '@/app/types/conversation';
import { WorkflowVersion } from '@/app/types/workflow-history';
import { ConversationHistoryManager } from '@/app/utils/conversation-history-manager';
import { DraftManager } from '@/app/utils/draft-manager';

interface HistoryPanelProps {
  workflowId: string;
  isOpen: boolean;
  onToggle: () => void;
  onVersionSelect?: (version: WorkflowVersion) => void;
  onMessageClick?: (message: ConversationMessage) => void;
  className?: string;
}

export default function HistoryPanel({
  workflowId,
  isOpen,
  onToggle,
  onVersionSelect,
  onMessageClick,
  className = ''
}: HistoryPanelProps) {
  // State management
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [versionHistory, setVersionHistory] = useState<WorkflowVersion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const [stats, setStats] = useState<{
    totalMessages: number;
    totalVersions: number;
    lastActivity: Date | null;
  }>({ totalMessages: 0, totalVersions: 0, lastActivity: null });

  // Managers
  const [conversationManager] = useState(() => new ConversationHistoryManager());
  const [draftManager] = useState(() => new DraftManager());

  // Theme and responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Load data
  const loadData = useCallback(async () => {
    if (!workflowId) return;

    setLoading(true);
    try {
      // Load conversation history
      const historyResponse = await conversationManager.loadConversationHistory(workflowId, {
        page: 1,
        limit: 50
      });
      setConversationHistory(historyResponse.messages);

      // Load version history
      const versions = await draftManager.getVersionHistory(workflowId);
      setVersionHistory(versions);

      // Load stats
      const conversationStats = await conversationManager.getConversationStats(workflowId);
      setStats({
        totalMessages: conversationStats.totalMessages,
        totalVersions: versions.length,
        lastActivity: conversationStats.lastActivity
      });

    } catch (error) {
      console.error('Error loading history data:', error);
    } finally {
      setLoading(false);
    }
  }, [workflowId, conversationManager, draftManager]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Search functionality
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      // Reset to full history
      await loadData();
      return;
    }

    setLoading(true);
    try {
      const searchResults = await conversationManager.searchConversationHistory(workflowId, query);
      // Get current conversation history and filter based on search results
      const historyResponse = await conversationManager.loadConversationHistory(workflowId, {
        page: 1,
        limit: 50
      });
      const filteredMessages = historyResponse.messages.filter(msg =>
        searchResults.some(result => result.messageId === msg.id)
      );
      setConversationHistory(filteredMessages);
    } catch (error) {
      console.error('Error searching history:', error);
    } finally {
      setLoading(false);
    }
  }, [workflowId, conversationManager, loadData]);

  const handleVersionClick = useCallback((version: WorkflowVersion) => {
    setSelectedVersionId(version.versionId);
    onVersionSelect?.(version);
  }, [onVersionSelect]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderConversationHistory = () => (
    <List dense>
      {loading ? (
        Array.from({ length: 5 }).map((_, index) => (
          <ListItem key={index}>
            <ListItemIcon>
              <Skeleton variant="circular" width={24} height={24} />
            </ListItemIcon>
            <ListItemText
              primary={<Skeleton width="80%" />}
              secondary={<Skeleton width="60%" />}
            />
          </ListItem>
        ))
      ) : (
        conversationHistory.map((message) => (
          <ListItem
            key={message.id}
            component="div"
            onClick={() => onMessageClick?.(message)}
            sx={{
              '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' },
              borderLeft: message.sender === 'aime' ? '3px solid' : 'none',
              borderColor: message.sender === 'aime' ? 'primary.main' : 'transparent'
            }}
          >
            <ListItemIcon>
              {message.sender === 'aime' ? (
                <AimeIcon color="primary" fontSize="small" />
              ) : (
                <UserIcon color="action" fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" noWrap>
                  {message.content}
                </Typography>
              }
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatTimestamp(message.timestamp)}
                  </Typography>
                  {message.type === 'workflow_generated' && (
                    <Chip
                      label="Workflow Updated"
                      size="small"
                      color="secondary"
                      sx={{ height: 16, fontSize: '0.6rem' }}
                    />
                  )}
                </Box>
              }
            />
          </ListItem>
        ))
      )}
    </List>
  );

  const renderVersionHistory = () => (
    <List dense>
      {loading ? (
        Array.from({ length: 3 }).map((_, index) => (
          <ListItem key={index}>
            <ListItemIcon>
              <Skeleton variant="circular" width={24} height={24} />
            </ListItemIcon>
            <ListItemText
              primary={<Skeleton width="80%" />}
              secondary={<Skeleton width="60%" />}
            />
          </ListItem>
        ))
      ) : (
        versionHistory.map((version) => (
          <ListItem
            key={version.versionId}
            component="div"
            onClick={() => handleVersionClick(version)}
            sx={{
              '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' },
              bgcolor: selectedVersionId === version.versionId ? 'primary.lighter' : 'transparent'
            }}
          >
            <ListItemIcon>
              {version.status === 'published' ? (
                <PublishIcon color="success" fontSize="small" />
              ) : (
                <DraftIcon color="warning" fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" noWrap>
                    {version.changeDescription}
                  </Typography>
                  <Chip
                    label={version.status}
                    size="small"
                    color={version.status === 'published' ? 'success' : 'warning'}
                    sx={{ height: 16, fontSize: '0.6rem' }}
                  />
                </Box>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {formatTimestamp(version.timestamp)}
                </Typography>
              }
            />
          </ListItem>
        ))
      )}
    </List>
  );

  if (!isOpen) {
    return (
      <Box className={className}>
        <Tooltip title="View History">
          <IconButton
            onClick={onToggle}
            sx={{
              position: 'fixed',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              zIndex: 1000
            }}
          >
            <Badge badgeContent={stats.totalMessages} color="error" max={99}>
              <HistoryIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Paper
      className={className}
      sx={{
        width: isMobile ? '100%' : 400,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: isMobile ? 'fixed' : 'relative',
        top: isMobile ? 0 : 'auto',
        right: isMobile ? 0 : 'auto',
        zIndex: isMobile ? 1300 : 'auto',
        bgcolor: 'background.paper'
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="primary" />
            History
          </Typography>
          <IconButton onClick={onToggle} size="small">
            <ClearIcon />
          </IconButton>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value.trim()) {
              handleSearch(e.target.value);
            } else {
              loadData();
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Chip
            label={`${stats.totalMessages} messages`}
            size="small"
            icon={<MessageIcon />}
          />
          <Chip
            label={`${stats.totalVersions} versions`}
            size="small"
            icon={<EditIcon />}
          />
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Conversation History */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              Conversation History ({conversationHistory.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {renderConversationHistory()}
          </AccordionDetails>
        </Accordion>

        {/* Version History */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              Version History ({versionHistory.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {renderVersionHistory()}
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Footer with last activity */}
      {stats.lastActivity && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Last activity: {formatTimestamp(stats.lastActivity)}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}