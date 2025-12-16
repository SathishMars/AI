import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InitializationStatusDisplay } from '@/app/components/InitializationStatusDisplay';
import { useInitializationStatus } from '@/app/hooks/useInitializationStatus';

// Mock the hook
jest.mock('@/app/hooks/useInitializationStatus');

const mockUseInitializationStatus = useInitializationStatus as jest.MockedFunction<
  typeof useInitializationStatus
>;

describe('InitializationStatusDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render component title and description', () => {
    mockUseInitializationStatus.mockReturnValue({
      status: null,
      loading: false,
      error: null,
      initialize: jest.fn(),
      isInitialized: false,
    });

    render(<InitializationStatusDisplay />);

    expect(screen.getByText('Database Initialization')).toBeInTheDocument();
    expect(
      screen.getByText('Monitor and manage the database initialization status for system readiness')
    ).toBeInTheDocument();
  });

  it('should show not started status when no initialization has run', async () => {
    mockUseInitializationStatus.mockReturnValue({
      status: null,
      loading: false,
      error: null,
      initialize: jest.fn(),
      isInitialized: false,
    });

    render(<InitializationStatusDisplay />);

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByText('Not Started')).toBeInTheDocument();
    });
  });

  it('should show ready status when initialization is successful', async () => {
    const mockStatus = {
      success: true,
      appliedVersions: ['1.0.0'],
      skippedVersions: [],
      failedVersions: [],
      errors: [],
      duration: 245,
      message: 'Database initialization completed in 245ms. Applied: 1, Skipped: 0',
    };

    mockUseInitializationStatus.mockReturnValue({
      status: mockStatus,
      loading: false,
      error: null,
      initialize: jest.fn(),
      isInitialized: true,
    });

    render(<InitializationStatusDisplay />);

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });
  });

  it('should show failed status when initialization encounters errors', async () => {
    mockUseInitializationStatus.mockReturnValue({
      status: null,
      loading: false,
      error: 'Connection failed',
      initialize: jest.fn(),
      isInitialized: false,
    });

    render(<InitializationStatusDisplay />);

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('should display applied versions as tags', async () => {
    const mockStatus = {
      success: true,
      appliedVersions: ['1.0.0', '1.0.1'],
      skippedVersions: [],
      failedVersions: [],
      errors: [],
      duration: 350,
      message: 'Success',
    };

    mockUseInitializationStatus.mockReturnValue({
      status: mockStatus,
      loading: false,
      error: null,
      initialize: jest.fn(),
      isInitialized: true,
    });

    render(<InitializationStatusDisplay />);

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByText('Database Initialization')).toBeInTheDocument();
    });

    // Verify applied versions section exists
    expect(screen.getByText('Applied Versions')).toBeInTheDocument();
  });

  it('should display skipped versions as tags', async () => {
    const mockStatus = {
      success: true,
      appliedVersions: ['1.0.1'],
      skippedVersions: ['0.9.0'],
      failedVersions: [],
      errors: [],
      duration: 100,
      message: 'Success',
    };

    mockUseInitializationStatus.mockReturnValue({
      status: mockStatus,
      loading: false,
      error: null,
      initialize: jest.fn(),
      isInitialized: true,
    });

    render(<InitializationStatusDisplay />);

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByText('Database Initialization')).toBeInTheDocument();
    });

    expect(screen.getByText('Skipped Versions')).toBeInTheDocument();
  });

  it('should display failed versions with errors', async () => {
    const mockStatus = {
      success: false,
      appliedVersions: [],
      skippedVersions: [],
      failedVersions: ['1.0.0'],
      errors: ['Collection creation failed'],
      duration: 50,
      message: 'Failed',
    };

    mockUseInitializationStatus.mockReturnValue({
      status: mockStatus,
      loading: false,
      error: null,
      initialize: jest.fn(),
      isInitialized: false,
    });

    render(<InitializationStatusDisplay />);

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByText('Database Initialization')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed Versions')).toBeInTheDocument();
    expect(screen.getByText('Collection creation failed')).toBeInTheDocument();
  });

  it('should call initialize when button is clicked', async () => {
    const mockInitialize = jest.fn();

    mockUseInitializationStatus.mockReturnValue({
      status: null,
      loading: false,
      error: null,
      initialize: mockInitialize,
      isInitialized: false,
    });

    render(<InitializationStatusDisplay />);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /Initialize Database/i });
      expect(button).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /Initialize Database/i });
    fireEvent.click(button);

    expect(mockInitialize).toHaveBeenCalled();
  });

  it('should show loading state during initialization', async () => {
    mockUseInitializationStatus.mockReturnValue({
      status: null,
      loading: true,
      error: null,
      initialize: jest.fn(),
      isInitialized: false,
    });

    render(<InitializationStatusDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Initializing database...')).toBeInTheDocument();
    });
  });

  it('should disable button while loading', async () => {
    mockUseInitializationStatus.mockReturnValue({
      status: null,
      loading: true,
      error: null,
      initialize: jest.fn(),
      isInitialized: false,
    });

    render(<InitializationStatusDisplay />);

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  it('should display version counts correctly', async () => {
    const mockStatus = {
      success: true,
      appliedVersions: ['1.0.0', '1.0.1'],
      skippedVersions: ['0.9.0'],
      failedVersions: [],
      errors: [],
      duration: 500,
      message: 'Success',
    };

    mockUseInitializationStatus.mockReturnValue({
      status: mockStatus,
      loading: false,
      error: null,
      initialize: jest.fn(),
      isInitialized: true,
    });

    render(<InitializationStatusDisplay />);

    await waitFor(() => {
      const appliedCounts = screen.getAllByText('2');
      const skippedCounts = screen.getAllByText('1');

      expect(appliedCounts.length).toBeGreaterThan(0);
      expect(skippedCounts.length).toBeGreaterThan(0);
    });
  });

  it('should show information card with helpful text', async () => {
    mockUseInitializationStatus.mockReturnValue({
      status: null,
      loading: false,
      error: null,
      initialize: jest.fn(),
      isInitialized: false,
    });

    render(<InitializationStatusDisplay />);

    // Wait for component to mount
    await waitFor(() => {
      expect(
        screen.getByText(/The database initialization endpoint prepares your system/i)
      ).toBeInTheDocument();
    });
  });

  it('should show error message when initialization fails', async () => {
    const errorMsg = 'Failed to connect to database';
    mockUseInitializationStatus.mockReturnValue({
      status: null,
      loading: false,
      error: errorMsg,
      initialize: jest.fn(),
      isInitialized: false,
    });

    render(<InitializationStatusDisplay />);

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMsg}`)).toBeInTheDocument();
    });
  });

  it('should show status message from API response', async () => {
    const mockStatus = {
      success: true,
      appliedVersions: ['1.0.0'],
      skippedVersions: [],
      failedVersions: [],
      errors: [],
      duration: 245,
      message: 'Database initialization completed in 245ms. Applied: 1, Skipped: 0',
    };

    mockUseInitializationStatus.mockReturnValue({
      status: mockStatus,
      loading: false,
      error: null,
      initialize: jest.fn(),
      isInitialized: true,
    });

    render(<InitializationStatusDisplay />);

    await waitFor(() => {
      expect(screen.getByText(mockStatus.message)).toBeInTheDocument();
    });
  });

  it('should show reinitialize button text after successful initialization', async () => {
    const mockStatus = {
      success: true,
      appliedVersions: ['1.0.0'],
      skippedVersions: [],
      failedVersions: [],
      errors: [],
      duration: 245,
      message: 'Success',
    };

    mockUseInitializationStatus.mockReturnValue({
      status: mockStatus,
      loading: false,
      error: null,
      initialize: jest.fn(),
      isInitialized: true,
    });

    render(<InitializationStatusDisplay />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reinitialize Database/i })).toBeInTheDocument();
    });
  });

  it('should display multiple errors if present', async () => {
    const mockStatus = {
      success: false,
      appliedVersions: [],
      skippedVersions: [],
      failedVersions: ['1.0.0'],
      errors: ['Error 1', 'Error 2', 'Error 3'],
      duration: 100,
      message: 'Failed',
    };

    mockUseInitializationStatus.mockReturnValue({
      status: mockStatus,
      loading: false,
      error: null,
      initialize: jest.fn(),
      isInitialized: false,
    });

    render(<InitializationStatusDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
      expect(screen.getByText('Error 3')).toBeInTheDocument();
    });
  });
});
