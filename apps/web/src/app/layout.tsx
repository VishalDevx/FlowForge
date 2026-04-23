import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FlowForge - Workflow Automation Platform',
  description: 'Build, deploy, and run automated workflows with ease',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}