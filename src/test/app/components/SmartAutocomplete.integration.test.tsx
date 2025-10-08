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
      if (typeof cursorPosition !== 'number') {
        return [];
      }

      const textBeforeCursor = text.substring(0, cursorPosition);

      const triggers = [
        {
          token: 'mrf.',
          suggestions: [
            {
              id: 'mrf-1',
              display: 'title',
              value: 'title',
              description: 'Meeting request title',
              icon: '�'
            },
            {
              id: 'mrf-2',
              display: 'attendees',
              value: 'attendees',
              description: 'Number of attendees',
              icon: '👥'
            }
          ]
        },
        {
          token: 'user.',
          suggestions: [
            {
              id: 'user-1',
              display: 'email',
              value: 'email',
              description: 'User email address',
              icon: '�'
            },
            {
              id: 'user-2',
              display: 'department',
              value: 'department',
              description: 'User department',
              icon: '🏢'
            }
          ]
        },
        {
          token: '@',
          suggestions: [
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
          ]
        }
      ];

      const matchedTrigger = triggers
        .map(trigger => ({
          ...trigger,
          index: textBeforeCursor.lastIndexOf(trigger.token)
        }))
        .filter(trigger => trigger.index !== -1)
        .sort((a, b) => b.index - a.index)[0];

      if (!matchedTrigger) {
        return [];
      }

      const isCursorImmediatelyAfterTrigger =
        matchedTrigger.index + matchedTrigger.token.length === textBeforeCursor.length;

      if (isCursorImmediatelyAfterTrigger) {
        return matchedTrigger.suggestions;
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
  let mockInputRef: React.RefObject<HTMLTextAreaElement | null>;

  const renderControlledAutocomplete = (
    initialValue: string,
    {
      placeholder,
      context = mockContext,
      disabled = false
    }: {
      placeholder: string;
      context?: ConversationContext;
      disabled?: boolean;
    }
  ) => {
    const Wrapper: React.FC = () => {
      const [value, setValue] = React.useState(initialValue);

      const handleChange = (newValue: string) => {
        setValue(newValue);
        mockOnChange(newValue);
      };

      return (
        <SmartAutocomplete
          value={value}
          onChange={handleChange}
          onKeyPress={mockOnKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          inputRef={mockInputRef}
          context={context}
        />
      );
    };

    return renderWithTheme(<Wrapper />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockInputRef = React.createRef<HTMLTextAreaElement | null>();
  });

  it('triggers autocomplete when typing @ at the end of text', async () => {
    renderControlledAutocomplete('', { placeholder: 'Type @ for functions' });

    const input = screen.getByRole('textbox');
    
    // Type @ at the end
    fireEvent.change(input, { target: { value: 'Send notification using @' } });
    
    await waitFor(() => {
      expect(screen.getAllByText(/sendEmail/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/requestApproval/).length).toBeGreaterThan(0);
    });
  });

  it('triggers autocomplete when typing @ in the middle of text', async () => {
    renderControlledAutocomplete('Send notification using @ when done', {
      placeholder: 'Type @ for functions'
    });

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Simulate cursor position in the middle after @
    const atPosition = input.value.indexOf('@') + 1;
    Object.defineProperty(input, 'selectionStart', { 
      value: atPosition,
      configurable: true 
    });
    
    fireEvent.focus(input);
    fireEvent.select(input);
    
    await waitFor(() => {
      expect(screen.getByText(/sendEmail/)).toBeInTheDocument();
      expect(screen.getByText(/requestApproval/)).toBeInTheDocument();
    });
  });

  it('triggers autocomplete when typing mrf. in the middle of text', async () => {
    renderControlledAutocomplete('Check if mrf. meets requirements', {
      placeholder: 'Type mrf. for MRF fields'
    });

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Simulate cursor position after "mrf."
    const mrfPosition = input.value.indexOf('mrf.') + 'mrf.'.length;
    Object.defineProperty(input, 'selectionStart', { 
      value: mrfPosition,
      configurable: true 
    });
    
    fireEvent.focus(input);
    fireEvent.select(input);
    
    await waitFor(() => {
      expect(screen.getAllByText(/title/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/attendees/).length).toBeGreaterThan(0);
    });
  });

  it('triggers autocomplete when typing user. in the middle of text', async () => {
    renderControlledAutocomplete('Notify user. about the event', {
      placeholder: 'Type user. for user fields'
    });

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Simulate cursor position after "user."
    const userPosition = input.value.indexOf('user.') + 'user.'.length;
    Object.defineProperty(input, 'selectionStart', { 
      value: userPosition,
      configurable: true 
    });
    
    fireEvent.focus(input);
    fireEvent.select(input);
    
    await waitFor(() => {
      expect(screen.getAllByText(/email/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/department/).length).toBeGreaterThan(0);
    });
  });

  it('handles arrow key navigation to different cursor positions', async () => {
    renderControlledAutocomplete('Check @ and mrf. and user. values', {
      placeholder: 'Navigate with arrows'
    });

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Move cursor to position after first @
    const firstAt = input.value.indexOf('@') + 1;
    Object.defineProperty(input, 'selectionStart', { 
      value: firstAt,
      configurable: true 
    });

    fireEvent.focus(input);
    fireEvent.select(input);
    
    await waitFor(() => {
      expect(screen.getAllByText(/sendEmail/).length).toBeGreaterThan(0);
    });

    // Move cursor to position after mrf.
    const mrfIndex = input.value.indexOf('mrf.') + 'mrf.'.length;
    Object.defineProperty(input, 'selectionStart', { 
      value: mrfIndex,
      configurable: true 
    });
    
    fireEvent.focus(input);
    fireEvent.select(input);
    fireEvent.keyUp(input, { key: 'ArrowRight' });
    
    await waitFor(() => {
      expect(screen.getAllByText(/title/).length).toBeGreaterThan(0);
    });
  });

  it('updates suggestions when editing text around triggers', async () => {
    renderControlledAutocomplete('Send @ notification', {
      placeholder: 'Edit around triggers'
    });

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
      expect(screen.getByText(/sendEmail/)).toBeInTheDocument();
    });
  });

  it('hides suggestions when cursor moves away from triggers', async () => {
    renderControlledAutocomplete('Send @ notification to user', {
      placeholder: 'Move away from triggers'
    });

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // First show suggestions by positioning after @
    Object.defineProperty(input, 'selectionStart', { 
      value: 6, // Position right after @
      configurable: true 
    });
    
    fireEvent.focus(input);
    fireEvent.select(input);
    
    await waitFor(() => {
      expect(screen.getByText(/sendEmail/)).toBeInTheDocument();
    });

    // Move cursor to end of text (away from @)
    Object.defineProperty(input, 'selectionStart', { 
      value: input.value.length,
      configurable: true 
    });
    
    fireEvent.focus(input);
    fireEvent.keyUp(input, { key: 'ArrowRight' });
    
    await waitFor(() => {
      // Suggestions should be hidden
      expect(screen.queryByText(/sendEmail/)).not.toBeInTheDocument();
    });
  });

  it('handles rapid cursor position changes without breaking', async () => {
    renderControlledAutocomplete('@ mrf. user. @ test', {
      placeholder: 'Rapid cursor changes'
    });

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