import { InitializationStatusDisplay } from '@/app/components/InitializationStatusDisplay';

export const metadata = {
  title: 'Database Initialization Status',
  description: 'Monitor and manage the database initialization status for system readiness',
};

export default function InitializePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <InitializationStatusDisplay />
      </div>
    </div>
  );
}
