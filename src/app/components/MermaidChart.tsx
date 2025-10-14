'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography, CircularProgress, IconButton, Stack, Tooltip } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RefreshIcon from '@mui/icons-material/Refresh';
import mermaid from 'mermaid';

interface MermaidChartProps {
  mermaidDiagram: string;
  onError?: (error: string) => void;
}

export default function MermaidChart({ 
  mermaidDiagram,
  onError 
}: MermaidChartProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
        const mermaidRef = useRef<HTMLDivElement>(null);
        const scrollRef = useRef<HTMLDivElement>(null);
        const [scale, setScale] = useState<number>(1);

        const MIN_SCALE = 0.2;
        const MAX_SCALE = 3;

    useEffect(() => {
        console.log('[MermaidChart] mermaidDiagram prop changed:', mermaidDiagram);
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        if (mermaidRef.current) {
            mermaidRef.current.innerHTML = ''; // Clear previous diagram
            if (mermaidDiagram && mermaidDiagram.trim().length > 0) {
                (async () => {
                    try {
                        // Validate diagram syntax first
                        mermaid.parse(mermaidDiagram);
                        // Render diagram and get SVG code
                        const { svg } = await mermaid.render('mermaidChart', mermaidDiagram);
                        if (mermaidRef.current) {
                            mermaidRef.current.innerHTML = svg;
                            setIsLoading(false);
                            setError(null);
                        }
                    } catch (err: unknown) {
                        const errMsg = err instanceof Error ? err.message : 'Unknown error rendering Mermaid diagram';
                        console.error('[MermaidChart] Error rendering Mermaid diagram:', errMsg);
                        setError(errMsg);
                        setIsLoading(false);
                        if (onError) onError(errMsg);
                    }
                })();
            } else {
                const msg = 'No Mermaid diagram data provided';
                console.warn('[MermaidChart]', msg);
                setError(msg);
                setIsLoading(false);
                if (onError) onError(msg);
            }
        }
    }, [mermaidDiagram, onError]);

    // Helpers for zooming
    const clamp = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

    const zoomIn = useCallback(() => setScale(s => clamp(+(s + 0.1).toFixed(2))), []);
    const zoomOut = useCallback(() => setScale(s => clamp(+(s - 0.1).toFixed(2))), []);
    const resetZoom = useCallback(() => setScale(1), []);

    // Wheel-to-zoom handler (requires Ctrl/Meta to avoid interfering with scrolling)
    const handleWheel: React.WheelEventHandler<HTMLDivElement> = useCallback((e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY;
            // deltaY > 0 means zoom out, < 0 zoom in
            setScale(s => {
                const next = +(s - delta * 0.001).toFixed(3);
                return clamp(next);
            });
        }
    }, []);

    // Keyboard shortcuts: + (or =) for zoom in, - for zoom out, 0 to reset
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === '+' || e.key === '=') {
                zoomIn();
            } else if (e.key === '-') {
                zoomOut();
            } else if (e.key === '0') {
                resetZoom();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [zoomIn, zoomOut, resetZoom]);

    return (
        <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Tooltip title="Zoom out ( - )">
                    <IconButton size="small" onClick={zoomOut} aria-label="zoom-out">
                        <ZoomOutIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Reset zoom (0)">
                    <IconButton size="small" onClick={resetZoom} aria-label="reset-zoom">
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Zoom in ( + )">
                    <IconButton size="small" onClick={zoomIn} aria-label="zoom-in">
                        <ZoomInIcon />
                    </IconButton>
                </Tooltip>
                <Typography variant="caption" sx={{ ml: 1 }}>{Math.round(scale * 100)}%</Typography>
            </Stack>

            {isLoading && <CircularProgress />}
            {error && <Typography color="error">{error}</Typography>}

            {/* scrollRef holds the scrollable area; wheel zoom works when Ctrl/Meta is pressed */}
            <div ref={scrollRef} onWheel={handleWheel} style={{ overflow: 'auto', maxHeight: '60vh', border: '1px solid transparent' }}>
                {/* mermaidRef will contain the SVG; apply transform scaling to it */}
                <div ref={mermaidRef} className='mermaidChart' style={{ transform: `scale(${scale})`, transformOrigin: '0 0', width: `calc(${100 / scale}% )` }} />
            </div>
        </Box>
    );
}
