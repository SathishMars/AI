// src/test/app/components/HistoryPanel.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HistoryPanel from '@/app/components/HistoryPanel';

// Mock managers
jest.mock('@/app/utils/conversation-history-manager');
jest.mock('@/app/utils/draft-manager');

const mockConversationManager = {
  loadConversationHistory: jest.fn().mockResolvedValue({
    messages: [],
    hasMore: false,
    totalCount: 0
  }),
  searchConversationHistory: jest.fn().mockResolvedValue([]),
  getConversationStats: jest.fn().mockResolvedValue({
    totalMessages: 0,
    totalVersions: 0,
    lastActivity: null
  })
};

const mockDraftManager = {
  getVersionHistory: jest.fn().mockResolvedValue([]),
  getAllDrafts: jest.fn().mockResolvedValue([])
};

// Mock the classes
jest.mock('@/app/utils/conversation-history-manager', () => ({
  ConversationHistoryManager: jest.fn().mockImplementation(() => mockConversationManager)
}));

jest.mock('@/app/utils/draft-manager', () => ({
  DraftManager: jest.fn().mockImplementation(() => mockDraftManager)
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('HistoryPanel', () => {
  const defaultProps = {
    workflowId: 'workflow-1',
    isOpen: true,
    onToggle: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders history panel when open', async () => {
      renderWithTheme(<HistoryPanel {...defaultProps} />);
      
      expect(await screen.findByText('History & Versions')).toBeInTheDocument();
    });

    it('renders collapsed state when closed', async () => {
      renderWithTheme(
        <HistoryPanel {...defaultProps} isOpen={false} />
      );
      
      // Should render collapsed version
      expect(await screen.findByLabelText('Open History Panel')).toBeInTheDocument();
    });
  });
});