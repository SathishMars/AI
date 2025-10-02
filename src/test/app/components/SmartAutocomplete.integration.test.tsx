// src/test/app/components/SmartAutocomplete.integration.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { SmartAutocomplete } from '@/app/components/SmartAutocomplete';
import { ConversationContext } from '@/app/types/conversation';

// Mock the unified autocomplete manager
jest.mock('@/app/utils/unified-autocomplete-manager', () => ({
  UnifiedAutocompleteManager: jest.fn().mockImplementation(() => ({
    getSuggestions: jest.fn().mockImplementation(async (text, cursorPosition) => {
      const textBeforeCursor = text.substring(0, cursorPosition);
      
      // Mock suggestions for different triggers
      if (textBeforeCursor.endsWith('@') || textBeforeCursor.includes('@')) {
        return [
          {
            id: 'function-1',
            display: 'sendEmail',
            value: 'sendEmail',
            description: 'Send an email notification',
            icon: '📧'
          },
          {
            id: 'function-2',
            display: 'requestApproval',
            value: 'requestApproval',
            description: 'Request approval from manager',
            icon: '✅'
          }
        ];
      }
      
      if (textBeforeCursor.endsWith('mrf.') || textBeforeCursor.includes('mrf.')) {
        return [
          {
            id: 'mrf-1',
            display: 'title',
            value: 'title',
            description: 'Meeting request title',
            icon: '📝'
          },
          {
            id: 'mrf-2',
            display: 'attendees',
            value: 'attendees',
            description: 'Number of attendees',
            icon: '👥'
          }
        ];
      }
      
      if (textBeforeCursor.endsWith('user.') || textBeforeCursor.includes('user.')) {
        return [
          {
            id: 'user-1',
            display: 'email',
            value: 'email',
            description: 'User email address',
            icon: '📧'
          },
          {
            id: 'user-2',
            display: 'department',
            value: 'department',
            description: 'User department',
            icon: '🏢'
          }
        ];
      }
      
      return [];
    }),
    getProviderByTrigger: jest.fn().mockReturnValue({
      formatSuggestion: jest.fn((suggestion) => suggestion.value)
    })
  }))
}));

const theme = createTheme();

const mockContext: ConversationContext = {
  workflowId: 'test-workflow',
  workflowName: 'Test Workflow',
  userRole: 'admin',
  userDepartment: 'IT',
  availableFunctions: [],
  conversationGoal: 'create',
  currentWorkflowSteps: []
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('SmartAutocomplete - Cursor Position Integration', () => {
  const mockOnChange = jest.fn();
  const mockOnKeyPress = jest.fn();
  const mockInputRef = React.createRef<HTMLTextAreaElement>();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('triggers autocomplete when typing @ at the end of text', async () => {
    renderWithTheme(
      <SmartAutocomplete
        value=""
        onChange={mockOnChange}
        onKeyPress={mockOnKeyPress}
        placeholder="Type @ for functions"
        disabled={false}
        inputRef={mockInputRef}
        context={mockContext}
      />
    );

    const input = screen.getByRole('textbox');
    
    // Type @ at the end
    fireEvent.change(input, { target: { value: 'Send notification using @' } });
    
    await waitFor(() => {
      expect(screen.getByText('sendEmail')).toBeInTheDocument();
      expect(screen.getByText('requestApproval')).toBeInTheDocument();
    });
  });

  it('triggers autocomplete when typing @ in the middle of text', async () => {
    renderWithTheme(
      <SmartAutocomplete
        value="Send notification using @ when done"
        onChange={mockOnChange}
        onKeyPress={mockOnKeyPress}
        placeholder="Type @ for functions"
        disabled={false}
        inputRef={mockInputRef}
        context={mockContext}
      />
    );

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Simulate cursor position in the middle after @
    Object.defineProperty(input, 'selectionStart', { 
      value: 24, // Position right after @
      configurable: true 
    });
    
    // Trigger cursor change event
    fireEvent.click(input);
    
    await waitFor(() => {
      expect(screen.getByText('sendEmail')).toBeInTheDocument();
      expect(screen.getByText('requestApproval')).toBeInTheDocument();
    });
  });

  it('triggers autocomplete when typing mrf. in the middle of text', async () => {
    renderWithTheme(
      <SmartAutocomplete
        value="Check if mrf. meets requirements"
        onChange={mockOnChange}
        onKeyPress={mockOnKeyPress}
        placeholder="Type mrf. for MRF fields"
        disabled={false}
        inputRef={mockInputRef}
        context={mockContext}
      />
    );

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Simulate cursor position after "mrf."
    Object.defineProperty(input, 'selectionStart', { 
      value: 13, // Position right after "mrf."
      configurable: true 
    });
    
    // Trigger cursor change event
    fireEvent.click(input);
    
    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument();
      expect(screen.getByText('attendees')).toBeInTheDocument();
    });
  });

  it('triggers autocomplete when typing user. in the middle of text', async () => {
    renderWithTheme(
      <SmartAutocomplete
        value="Notify user. about the event"
        onChange={mockOnChange}
        onKeyPress={mockOnKeyPress}
        placeholder="Type user. for user fields"
        disabled={false}
        inputRef={mockInputRef}
        context={mockContext}
      />
    );

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Simulate cursor position after "user."
    Object.defineProperty(input, 'selectionStart', { 
      value: 12, // Position right after "user."
      configurable: true 
    });
    
    // Trigger cursor change event
    fireEvent.click(input);
    
    await waitFor(() => {
      expect(screen.getByText('email')).toBeInTheDocument();
      expect(screen.getByText('department')).toBeInTheDocument();
    });
  });

  it('handles arrow key navigation to different cursor positions', async () => {
    renderWithTheme(
      <SmartAutocomplete
        value="Check @ and mrf. and user. values"
        onChange={mockOnChange}
        onKeyPress={mockOnKeyPress}
        placeholder="Navigate with arrows"
        disabled={false}
        inputRef={mockInputRef}
        context={mockContext}
      />
    );

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Move cursor to position after first @
    Object.defineProperty(input, 'selectionStart', { 
      value: 7, // Position right after first @
      configurable: true 
    });
    
    fireEvent.keyUp(input, { key: 'ArrowRight' });
    
    await waitFor(() => {
      expect(screen.getByText('sendEmail')).toBeInTheDocument();
    });

    // Move cursor to position after mrf.
    Object.defineProperty(input, 'selectionStart', { 
      value: 17, // Position right after "mrf."
      configurable: true 
    });
    
    fireEvent.keyUp(input, { key: 'ArrowRight' });
    
    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument();
    });
  });

  it('updates suggestions when editing text around triggers', async () => {
    renderWithTheme(
      <SmartAutocomplete
        value="Send @ notification"
        onChange={mockOnChange}
        onKeyPress={mockOnKeyPress}
        placeholder="Edit around triggers"
        disabled={false}
        inputRef={mockInputRef}
        context={mockContext}
      />
    );

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Position cursor after @
    Object.defineProperty(input, 'selectionStart', { 
      value: 6, // Position right after @
      configurable: true 
    });
    
    // Change text while cursor is positioned after @
    fireEvent.change(input, { target: { value: 'Send @send notification' } });
    
    await waitFor(() => {
      // Should still show suggestions since @ is still before cursor
      expect(screen.getByText('sendEmail')).toBeInTheDocument();
    });
  });

  it('hides suggestions when cursor moves away from triggers', async () => {
    renderWithTheme(
      <SmartAutocomplete
        value="Send @ notification to user"
        onChange={mockOnChange}
        onKeyPress={mockOnKeyPress}
        placeholder="Move away from triggers"
        disabled={false}
        inputRef={mockInputRef}
        context={mockContext}
      />
    );

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // First show suggestions by positioning after @
    Object.defineProperty(input, 'selectionStart', { 
      value: 6, // Position right after @
      configurable: true 
    });
    
    fireEvent.click(input);
    
    await waitFor(() => {
      expect(screen.getByText('sendEmail')).toBeInTheDocument();
    });

    // Move cursor to end of text (away from @)
    Object.defineProperty(input, 'selectionStart', { 
      value: 29, // Position at end of text
      configurable: true 
    });
    
    fireEvent.keyUp(input, { key: 'ArrowRight' });
    
    await waitFor(() => {
      // Suggestions should be hidden
      expect(screen.queryByText('sendEmail')).not.toBeInTheDocument();
    });
  });

  it('handles rapid cursor position changes without breaking', async () => {
    renderWithTheme(
      <SmartAutocomplete
        value="@ mrf. user. @ test"
        onChange={mockOnChange}
        onKeyPress={mockOnKeyPress}
        placeholder="Rapid cursor changes"
        disabled={false}
        inputRef={mockInputRef}
        context={mockContext}
      />
    );

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Rapidly change cursor positions
    const positions = [1, 6, 12, 15]; // After each trigger
    
    for (const position of positions) {
      Object.defineProperty(input, 'selectionStart', { 
        value: position,
        configurable: true 
      });
      
      fireEvent.click(input);
      
      // Small delay to simulate real user interaction
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Should still work without errors
    expect(input).toBeInTheDocument();
  });
});

describe('SmartAutocomplete - Error Handling', () => {
  const mockOnChange = jest.fn();
  const mockOnKeyPress = jest.fn();
  const mockInputRef = React.createRef<HTMLTextAreaElement>();

  it('handles missing cursor position gracefully', async () => {
    renderWithTheme(
      <SmartAutocomplete
        value="Test @ text"
        onChange={mockOnChange}
        onKeyPress={mockOnKeyPress}
        placeholder="Handle missing cursor"
        disabled={false}
        inputRef={mockInputRef}
        context={mockContext}
      />
    );

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Remove selectionStart property to simulate missing cursor position
    Object.defineProperty(input, 'selectionStart', { 
      value: undefined,
      configurable: true 
    });
    
    // Should not crash when cursor position is undefined
    fireEvent.click(input);
    
    expect(input).toBeInTheDocument();
  });

  it('handles null textarea ref gracefully', () => {
    // This test ensures the component doesn't crash when ref is null
    renderWithTheme(
      <SmartAutocomplete
        value="Test text"
        onChange={mockOnChange}
        onKeyPress={mockOnKeyPress}
        placeholder="Handle null ref"
        disabled={false}
        inputRef={mockInputRef}
        context={mockContext}
      />
    );

    // Component should render without errors
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});