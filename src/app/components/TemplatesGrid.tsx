"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataGrid, GridColDef, GridRowParams, GridRowSelectionModel } from '@mui/x-data-grid';
import { Box, Typography, Button } from '@mui/material';
import { useUnifiedUserContext } from '@/app/contexts/UnifiedUserContext';
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
    const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchTemplates = async () => {
            try {
                setLoading(true);
                setError(null);

                const params = new URLSearchParams({ page: '1', pageSize: '100', status: 'draft,published' });
                const res = await fetch(`/api/workflow-templates?${params}`);
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

    const columns: GridColDef<TemplateRow>[] = [
        {
            field: 'label',
            headerName: 'Template',
            flex: 1,
            minWidth: 240
        },
        { field: 'version', headerName: 'Version', width: 110 },
        { field: 'status', headerName: 'Status', width: 140 },
        { field: 'author', headerName: 'Author', width: 180 }
    ];

    const handleRowClick = (id: string) => {
        // Navigate to configure page for the template
        router.push(`/workflows/configure/${id}`);
    };

    const handleDeleteSelected = async () => {
        if (!selectionModel || selectionModel.length === 0) return;
        if (!confirm(`Delete ${selectionModel.length} selected template(s)? This cannot be undone.`)) return;

        try {
            setDeleting(true);
            const failures: string[] = [];

            // Build delete requests with template id and version from rows
            const promises = selectionModel.map(async (id: string | number) => {
                const sid = String(id);
                const row = rows.find(r => r.id === sid);
                if (!row) return;
                const version = row.version;
                const url = `/api/workflow-templates/${encodeURIComponent(sid)}?version=${encodeURIComponent(version)}`;

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

                const res = await fetch(url, { method: 'DELETE', headers });
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
                setRows(prev => prev.filter(r => !selectionModel.includes(r.id)));
                setSelectionModel([]);
            }
        } catch (err) {
            console.error('Failed to delete templates', err);
            alert(err instanceof Error ? err.message : 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    if (userLoading) {
        return <Typography>Loading user context...</Typography>;
    }

    if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    return (
        <Box sx={{ width: '100%', height: 480 }}>
            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Workflow Templates</Typography>
                <Typography variant="caption" color="text.secondary">{account?.name || currentOrganization?.name || user?.profile?.firstName}</Typography>
            </Box>
            <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
                <Button
                    variant="contained"
                    color="error"
                    disabled={selectionModel.length === 0 || deleting}
                    onClick={handleDeleteSelected}
                >
                    Delete selected
                </Button>
            </Box>
            <DataGrid<TemplateRow>
                rows={rows}
                columns={columns}
                loading={loading}
                getRowId={(row: TemplateRow) => row.id}
                onRowClick={(params: GridRowParams<TemplateRow>) => handleRowClick(String(params.id))}
                density="comfortable"
                pageSizeOptions={[10, 25, 50]}
                checkboxSelection
                onRowSelectionModelChange={(newSelection: GridRowSelectionModel) => setSelectionModel(newSelection)}
                rowSelectionModel={selectionModel}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            />
        </Box>
    );
}
