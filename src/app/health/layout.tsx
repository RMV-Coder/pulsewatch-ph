import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Health',
  description: 'Real-time system health monitoring for PulseWatch PH. Track scraping metrics, analysis status, and database connectivity.',
  openGraph: {
    title: 'System Health - PulseWatch PH',
    description: 'Real-time system health monitoring for PulseWatch PH',
  },
};

export default function HealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
