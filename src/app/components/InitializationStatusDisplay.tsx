'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useInitializationStatus, type InitializationStatus } from '@/app/hooks/useInitializationStatus';
import { CheckCircle2, AlertCircle, Loader2, Database, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function InitializationStatusDisplay() {
  const { status, loading, error, initialize, isInitialized } = useInitializationStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Database Initialization</h1>
        <p className="text-muted-foreground">
          Monitor and manage the database initialization status for system readiness
        </p>
      </div>

      {/* Status Cards Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Overall Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              {isInitialized ? (
                <>
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="font-semibold text-green-600">Ready</div>
                    <p className="text-sm text-muted-foreground">Database initialized</p>
                  </div>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div>
                    <div className="font-semibold text-destructive">Failed</div>
                    <p className="text-sm text-muted-foreground">Initialization error</p>
                  </div>
                </>
              ) : (
                <>
                  <Database className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="font-semibold text-muted-foreground">Not Started</div>
                    <p className="text-sm text-muted-foreground">Pending initialization</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Duration Card */}
        {status && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <Clock className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{status.duration}ms</div>
                  <p className="text-sm text-muted-foreground">Initialization time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Versions Applied Card */}
        {status && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Versions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Applied:</span>
                  <span className="font-semibold text-green-600">{status.appliedVersions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Skipped:</span>
                  <span className="font-semibold text-amber-600">{status.skippedVersions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="font-semibold text-destructive">{status.failedVersions.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <CardTitle>Initialization Details</CardTitle>
          <CardDescription>
            {status ? 'Latest initialization result' : 'Run database initialization to see details'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message */}
          {status && (
            <div
              className={cn(
                'rounded-lg p-4',
                status.success ? 'bg-green-50 text-green-900' : 'bg-amber-50 text-amber-900'
              )}
            >
              <p className="text-sm font-medium">{status.message}</p>
            </div>
          )}

          {/* Error Message */}
          {error && !status && (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
              <p className="text-sm font-medium">Error: {error}</p>
            </div>
          )}

          {/* Applied Versions */}
          {status && status.appliedVersions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-green-700">Applied Versions</h3>
              <div className="flex flex-wrap gap-2">
                {status.appliedVersions.map((version) => (
                  <span
                    key={version}
                    className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800"
                  >
                    ✓ {version}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skipped Versions */}
          {status && status.skippedVersions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-amber-700">Skipped Versions</h3>
              <div className="flex flex-wrap gap-2">
                {status.skippedVersions.map((version) => (
                  <span
                    key={version}
                    className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800"
                  >
                    ⊘ {version}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Failed Versions */}
          {status && status.failedVersions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-destructive">Failed Versions</h3>
              <div className="flex flex-wrap gap-2">
                {status.failedVersions.map((version) => (
                  <span
                    key={version}
                    className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive"
                  >
                    ✕ {version}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error Details */}
          {status && status.errors.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-destructive">Errors</h3>
              <div className="space-y-2">
                {status.errors.map((err, idx) => (
                  <div key={idx} className="rounded-md bg-destructive/5 p-3 text-sm text-destructive">
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Status Message */}
          {!status && !loading && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                No initialization has been run yet. Click the button below to initialize the database.
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center space-x-3 rounded-lg bg-blue-50 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-blue-900">Initializing database...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex gap-3">
        <Button
          onClick={initialize}
          disabled={loading}
          size="lg"
          className={cn(isInitialized && 'bg-green-600 hover:bg-green-700')}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Initializing...' : isInitialized ? 'Reinitialize Database' : 'Initialize Database'}
        </Button>

        {status && (
          <div className="text-sm text-muted-foreground flex items-center">
            Last run: {new Date().toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Documentation */}
      <Card className="border-muted bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            The database initialization endpoint prepares your system for use by creating required collections and
            indexes in MongoDB/DocumentDB.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Applied Versions:</strong> Successfully applied database migrations
            </li>
            <li>
              <strong>Skipped Versions:</strong> Already applied migrations that were skipped
            </li>
            <li>
              <strong>Failed Versions:</strong> Migrations that encountered errors
            </li>
          </ul>
          <p>It is safe to run initialization multiple times - already applied versions will be skipped.</p>
        </CardContent>
      </Card>
    </div>
  );
}
