'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../components/layout/dashboard-layout';
import { isAuthenticated } from '../../lib/auth';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
  }, [router]);

  return (
    <DashboardLayout title="Settings" description="Manage your account, workspace secrets, and preferences.">
      <div className="max-w-2xl space-y-6">
        <div className="card">
          <h3 className="heading-sm mb-4">Account Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Display Name</label>
              <input className="input" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input className="input" type="email" placeholder="you@example.com" disabled />
            </div>
            <button className="btn-primary">Save Changes</button>
          </div>
        </div>

        <div className="card">
          <h3 className="heading-sm mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Current Password</label>
              <input className="input" type="password" placeholder="Enter current password" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">New Password</label>
              <input className="input" type="password" placeholder="Enter new password" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
              <input className="input" type="password" placeholder="Confirm new password" />
            </div>
            <button className="btn-primary">Update Password</button>
          </div>
        </div>

        <div className="card border-destructive/20">
          <h3 className="heading-sm mb-2 text-destructive">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button className="btn-destructive">Delete Account</button>
        </div>
      </div>
    </DashboardLayout>
  );
}
