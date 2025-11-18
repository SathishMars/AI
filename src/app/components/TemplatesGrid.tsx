"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUnifiedUserContext } from '@/app/contexts/UnifiedUserContext';
import { apiFetch } from '@/app/utils/api';
import type { WorkflowTemplate } from '@/app/types/workflowTemplate';

interface TemplateRow {
    id: string;
    label: string;
    version: string;
    status: string;
    author?: string;
}

export default function TemplatesGrid() {
    const router = useRouter();
    const { user, account, currentOrganization, isLoading: userLoading } = useUnifiedUserContext();
    const [rows, setRows] = useState<TemplateRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchTemplates = async () => {
            try {
                setLoading(true);
                setError(null);

                const params = new URLSearchParams({ page: '1', pageSize: '100', status: 'draft,published' });
                const res = await apiFetch(`/api/workflow-templates?${params}`);
                if (!res.ok) throw new Error(`Failed to fetch templates: ${res.status}`);
                const data = await res.json();
                const fetched: WorkflowTemplate[] = data.data?.templates || data.templates || [];

                const mapped: TemplateRow[] = fetched.map(t => ({
                    id: t.id,
                    label: t.metadata.label,
                    version: t.version,
                    status: t.metadata.status,
                    author: t.metadata?.createdBy || undefined
                }));

                if (mounted) {
                    setRows(mapped);
                }
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : 'Failed to load templates');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchTemplates();
        return () => { mounted = false; };
    }, []);

    const toggleSelectAll = () => {
        if (selectedIds.size === rows.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(rows.map(r => r.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleRowClick = (id: string) => {
        // Navigate to configure page for the template
        router.push(`/workflows/configure/${id}`);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} selected template(s)? This cannot be undone.`)) return;

        try {
            setDeleting(true);
            const failures: string[] = [];

            // Build delete requests with template id and version from rows
            const promises = Array.from(selectedIds).map(async (id) => {
                const row = rows.find(r => r.id === id);
                if (!row) return;
                const version = row.version;
                const url = `/api/workflow-templates/${encodeURIComponent(id)}?version=${encodeURIComponent(version)}`;

                const headers: Record<string, string> = {};
                if (account && typeof account === 'object') {
                    // account may be an object with id/name depending on context
                    // prefer id if available
                    const acctRec = account as unknown as Record<string, unknown>;
                    headers['x-account'] = String(acctRec['id'] ?? acctRec['name'] ?? acctRec as unknown as string);
                }
                if (currentOrganization && typeof currentOrganization === 'object') {
                    const orgRec = currentOrganization as unknown as Record<string, unknown>;
                    headers['x-organization'] = String(orgRec['id'] ?? orgRec['name'] ?? orgRec as unknown as string);
                }

                const res = await apiFetch(url, { method: 'DELETE', headers });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    failures.push(`${id}: ${res.status} ${body?.error ?? body?.message ?? res.statusText}`);
                }
            });

            await Promise.all(promises);

            if (failures.length > 0) {
                alert(`Some deletions failed:\n${failures.join('\n')}`);
            } else {
                // refresh list
                setRows(prev => prev.filter(r => !selectedIds.has(r.id)));
                setSelectedIds(new Set());
            }
        } catch (err) {
            console.error('Failed to delete templates', err);
            alert(err instanceof Error ? err.message : 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    if (userLoading) {
        return (
            <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading user context...</span>
            </div>
        );
    }

    if (error) {
        return <p className="text-sm text-destructive">{error}</p>;
    }

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Workflow Templates</h2>
                <span className="text-xs text-muted-foreground">
                    {account?.name || currentOrganization?.name || user?.profile?.firstName}
                </span>
            </div>
            
            <div className="flex gap-2">
                <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedIds.size === 0 || deleting}
                    onClick={handleDeleteSelected}
                >
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete selected ({selectedIds.size})
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading templates...</span>
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedIds.size === rows.length && rows.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Version</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Author</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No templates found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleRowClick(row.id)}
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedIds.has(row.id)}
                                                onCheckedChange={() => toggleSelect(row.id)}
                                                aria-label={`Select ${row.label}`}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{row.label}</TableCell>
                                        <TableCell>{row.version}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                row.status === 'published' 
                                                    ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                                                    : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                                            }`}>
                                                {row.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>{row.author || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
