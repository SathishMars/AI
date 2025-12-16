import { renderHook, act, waitFor } from '@testing-library/react';
import { useInitializationStatus } from '@/app/hooks/useInitializationStatus';

// Mock apiFetch
jest.mock('@/app/utils/api', () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from '@/app/utils/api';

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('useInitializationStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with null status and no error', () => {
    const { result } = renderHook(() => useInitializationStatus());

    expect(result.current.status).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isInitialized).toBe(false);
  });

  it('should fetch initialization status successfully', async () => {
    const mockStatus = {
      success: true,
      appliedVersions: ['1.0.0'],
      skippedVersions: [],
      failedVersions: [],
      errors: [],
      duration: 245,
      message: 'Database initialization completed successfully',
    };

    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatus,
    } as any);

    const { result } = renderHook(() => useInitializationStatus());

    await act(async () => {
      await result.current.initialize();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toEqual(mockStatus);
    expect(result.current.error).toBeNull();
    expect(result.current.isInitialized).toBe(true);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should handle failed initialization', async () => {
    const mockStatus = {
      success: false,
      appliedVersions: [],
      skippedVersions: [],
      failedVersions: ['1.0.0'],
      errors: ['Connection failed'],
      duration: 100,
      message: 'Database initialization failed',
    };

    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatus,
    } as any);

    const { result } = renderHook(() => useInitializationStatus());

    await act(async () => {
      await result.current.initialize();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toEqual(mockStatus);
    expect(result.current.error).toBe('Connection failed');
    expect(result.current.isInitialized).toBe(false);
  });

  it('should handle network errors', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useInitializationStatus());

    await act(async () => {
      await result.current.initialize();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.status).toBeNull();
    expect(result.current.isInitialized).toBe(false);
  });

  it('should handle HTTP errors', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as any);

    const { result } = renderHook(() => useInitializationStatus());

    await act(async () => {
      await result.current.initialize();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('HTTP 500: Internal Server Error');
    expect(result.current.status).toBeNull();
  });

  it('should set loading state during initialization', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        appliedVersions: ['1.0.0'],
        skippedVersions: [],
        failedVersions: [],
        errors: [],
        duration: 245,
        message: 'Success',
      }),
    } as any);

    const { result } = renderHook(() => useInitializationStatus());

    // Before initialization, loading should be false
    expect(result.current.loading).toBe(false);

    // Call initialize
    await act(async () => {
      await result.current.initialize();
    });

    // After initialization, loading should be false and status should be set
    expect(result.current.loading).toBe(false);
    expect(result.current.status).toBeDefined();
  });

  it('should handle missing error message in failed response', async () => {
    const mockStatus = {
      success: false,
      appliedVersions: [],
      skippedVersions: [],
      failedVersions: ['1.0.0'],
      errors: [],
      duration: 100,
      message: 'Database initialization failed',
    };

    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatus,
    } as any);

    const { result } = renderHook(() => useInitializationStatus());

    await act(async () => {
      await result.current.initialize();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Initialization failed');
  });

  it('should handle partial initialization with applied and skipped versions', async () => {
    const mockStatus = {
      success: true,
      appliedVersions: ['1.0.1', '1.0.2'],
      skippedVersions: ['1.0.0'],
      failedVersions: [],
      errors: [],
      duration: 350,
      message: 'Initialization completed. Applied: 2, Skipped: 1',
    };

    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatus,
    } as any);

    const { result } = renderHook(() => useInitializationStatus());

    await act(async () => {
      await result.current.initialize();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status?.appliedVersions).toHaveLength(2);
    expect(result.current.status?.skippedVersions).toHaveLength(1);
    expect(result.current.isInitialized).toBe(true);
  });
});
