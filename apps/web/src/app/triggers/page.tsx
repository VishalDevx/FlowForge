/**
 * Triggers page — manage workflow triggers with create, toggle, test, and delete.
 * Supports filtering by trigger category and shows webhook URLs.
 *
 * @example
 * ```tsx
 * <TriggersPage />
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '../../components/layout/dashboard-layout';
import { api } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Trigger {
  id: string;
  workflowId: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
  webhookKey?: string;
  createdAt: string;
  updatedAt: string;
  workflow?: {
    id: string;
    name: string;
  };
}

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manual Run', category: 'Manual' },
  { value: 'manual_json', label: 'Manual (JSON payload)', category: 'Manual' },
  { value: 'manual_form', label: 'Manual (Form)', category: 'Manual' },
  { value: 'webhook', label: 'Webhook (POST)', category: 'Webhook' },
  { value: 'webhook_get', label: 'Webhook (GET)', category: 'Webhook' },
  { value: 'webhook_custom_path', label: 'Webhook (Custom Path)', category: 'Webhook' },
  { value: 'webhook_multi_url', label: 'Webhook (Multi-URL)', category: 'Webhook' },
  { value: 'cron', label: 'Cron Expression', category: 'Schedule' },
  { value: 'scheduled', label: 'One-time Schedule', category: 'Schedule' },
  { value: 'interval', label: 'Interval', category: 'Schedule' },
  { value: 'one_shot', label: 'One-shot', category: 'Schedule' },
  { value: 'business_hours', label: 'Business Hours', category: 'Schedule' },
  { value: 'event', label: 'Event/Pub-Sub', category: 'Event' },
  { value: 'queue_consumer', label: 'Queue Consumer', category: 'Event' },
  { value: 'workflow_completed', label: 'Workflow Completed', category: 'Event' },
  { value: 'workflow_failed', label: 'Workflow Failed', category: 'Event' },
  { value: 'sub_workflow', label: 'Sub-Workflow', category: 'Event' },
  { value: 'file_arrival', label: 'File Arrival (S3)', category: 'Event' },
  { value: 'email_inbound', label: 'Inbound Email', category: 'Event' },
  { value: 'rss_poller', label: 'RSS/Feed Poller', category: 'Event' },
  { value: 'polling_url', label: 'Polling URL', category: 'Event' },
  { value: 'db_trigger', label: 'DB Trigger', category: 'Event' },
  { value: 'mqtt_message', label: 'MQTT Message', category: 'Event' },
  { value: 'kafka_subject', label: 'Kafka Subject', category: 'Event' },
  { value: 'nats_subject', label: 'NATS Subject', category: 'Event' },
  { value: 'git_webhook', label: 'Git Webhook', category: 'Event' },
  { value: 'cicd_webhook', label: 'CI/CD Webhook', category: 'Event' },
  { value: 'payment_webhook', label: 'Payment Webhook', category: 'Event' },
  { value: 'slack_command', label: 'Slack Command', category: 'Event' },
  { value: 'discord_interaction', label: 'Discord Interaction', category: 'Event' },
  { value: 'calendar_event', label: 'Calendar Event', category: 'Event' },
  { value: 'form_endpoint', label: 'Form Endpoint', category: 'Event' },
];

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [configJson, setConfigJson] = useState('{}');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  const refreshTriggers = useCallback(async () => {
    const params = filter !== 'all' ? `?type=${filter}` : '';
    try {
      const data = await api.get<{ triggers: Trigger[] }>(`/workflows/triggers${params}`);
      setTriggers(data.triggers || []);
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to load triggers');
    }
  }, [filter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refreshTriggers().finally(() => setLoading(false)); }, [refreshTriggers]);

  async function handleCreate() {
    if (!selectedWorkflowId || !selectedType) {
      setError('Please select workflow and trigger type');
      return;
    }

    setCreating(true);
    try {
      const config = JSON.parse(configJson);
      await api.post('/workflows/triggers', {
        workflowId: selectedWorkflowId,
        type: selectedType,
        config,
      });
      setShowCreateModal(false);
      setSelectedWorkflowId('');
      setSelectedType('');
      setConfigJson('{}');
      refreshTriggers();
    } catch (error: unknown) {
      const err = error as { message?: string };
      setError(err.message || 'Failed to create trigger');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(triggerId: string) {
    try {
      await api.patch(`/triggers/${triggerId}/toggle`, {});
      refreshTriggers();
    } catch (error: unknown) {
      const err = error as { message?: string };
      setError(err.message || 'Failed to toggle trigger');
    }
  }

  async function handleDelete(triggerId: string) {
    if (!confirm('Are you sure you want to delete this trigger?')) return;

    try {
      await api.delete(`/triggers/${triggerId}`);
      refreshTriggers();
    } catch (error: unknown) {
      const err = error as { message?: string };
      setError(err.message || 'Failed to delete trigger');
    }
  }

  async function handleTest(triggerId: string) {
    try {
      await api.post(`/triggers/${triggerId}/test`, {});
      alert('Test successful! Check logs for details.');
    } catch (error: unknown) {
      const err = error as { message?: string };
      alert(`Test failed: ${err.message}`);
    }
  }

  function getWebhookUrl(trigger: Trigger): string {
    if (!trigger.webhookKey) return '';
    return `${window.location.origin}/api/webhooks/${trigger.webhookKey}`;
  }

  function formatTriggerType(type: string): string {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  const filteredTriggers = filter === 'all'
    ? triggers
    : triggers.filter(t => t.type === filter);

  const filterButtons = [
    { label: 'All', value: 'all' },
    { label: 'Manual', value: 'manual' },
    { label: 'Webhook', value: 'webhook' },
    { label: 'Schedule', value: 'schedule' },
    { label: 'Event', value: 'event' },
  ];

  return (
    <DashboardLayout
      title="Triggers"
      description="Manage workflow triggers"
      actions={
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Trigger
        </Button>
      }
    >
      {error && (
        <Card className="bg-destructive/10 border-destructive/20 mb-6">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="link" className="mt-2 text-xs text-destructive underline h-auto p-0" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 flex gap-2 flex-wrap">
        {filterButtons.map(btn => (
          <Button
            key={btn.value}
            variant={filter === btn.value ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setFilter(btn.value)}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : triggers.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-1">No triggers yet</h3>
            <p className="text-muted-foreground mb-6">Create a trigger to automate workflow execution.</p>
            <Button onClick={() => setShowCreateModal(true)}>Create Trigger</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTriggers.map((trigger) => (
            <Card key={trigger.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={trigger.enabled ? 'success' : 'secondary'}>
                        {trigger.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatTriggerType(trigger.type)}
                      </span>
                    </div>
                    <h3 className="font-semibold">
                      <Link href={`/workflows/${trigger.workflowId}`} className="hover:text-primary">
                        {trigger.workflow?.name || 'Unknown Workflow'}
                      </Link>
                    </h3>
                    {trigger.webhookKey && (
                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {getWebhookUrl(trigger)}
                        </code>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs h-auto p-0"
                          onClick={() => navigator.clipboard.writeText(getWebhookUrl(trigger))}
                        >
                          Copy
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Created {new Date(trigger.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTest(trigger.id)}
                      title="Test trigger"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggle(trigger.id)}
                      title={trigger.enabled ? 'Disable' : 'Enable'}
                      className={trigger.enabled ? 'text-success' : ''}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={trigger.enabled
                          ? "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          : "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                        } />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(trigger.id)}
                      title="Delete"
                      className="hover:text-destructive"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.25 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H9.084a2.25 2.25 0 01-2.244-2.077L6.16 5.79m14.428 0a2.25 2.25 0 00-2.276-.192l-.3-.192a2.25 2.25 0 00-1.875-1.115l-.3-.192a2.25 2.25 0 00-2.276-.192l-.3.192a2.25 2.25 0 01-1.875 1.115l-.3.192a2.25 2.25 0 01-2.276.192m14.428 0H4.572" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Trigger</DialogTitle>
            <DialogDescription>Configure a new trigger for your workflow.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workflow-id">Workflow ID</Label>
              <Input
                id="workflow-id"
                value={selectedWorkflowId}
                onChange={(e) => setSelectedWorkflowId(e.target.value)}
                placeholder="Enter workflow ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger-type">Trigger Type</Label>
              <select
                id="trigger-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select type...</option>
                {['Manual', 'Webhook', 'Schedule', 'Event'].map(category => (
                  <optgroup key={category} label={category}>
                    {TRIGGER_TYPES.filter(t => t.category === category).map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="config-json">Config (JSON)</Label>
              <textarea
                id="config-json"
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono resize-y min-h-[200px]"
                rows={8}
                placeholder='{"expression": "* * * * *", "timezone": "UTC"}'
              />
              <p className="text-xs text-muted-foreground">
                Enter trigger-specific configuration as JSON
              </p>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create Trigger'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
