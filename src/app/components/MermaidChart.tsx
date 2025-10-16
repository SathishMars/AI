'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography, CircularProgress, IconButton, Stack, Tooltip } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScreenRotationIcon from '@mui/icons-material/ScreenRotation';
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
    // Guard against duplicate or stale renders (e.g. React Strict Mode double-invoke)
    const renderIdRef = useRef(0);
    const renderingRef = useRef(false);
    const [scale, setScale] = useState<number>(1);
    const [currentOrientation, setCurrentOrientation] = useState<'TD' | 'LR'>('TD'); // in degrees
    const MIN_SCALE = 0.2;
    const MAX_SCALE = 3;

    const findCurrentOrientation = (diagram: string): void => {
        const match = diagram.match(/^\s*flowchart\s+(TD|LR|RL|BT)/m);
        setCurrentOrientation(match ? match[1] as 'TD' | 'LR' : 'TD');
    }

    const generateSVG = useCallback(async (passedMermaidDiagram: string): Promise<void> => {
        try {
            mermaid.initialize({ startOnLoad: true, theme: 'default' });
            console.log('[MermaidChart] mermaidDiagram prop changed:', passedMermaidDiagram);

            // If another render is already in-flight, bail out early for identical diagrams
            if (renderingRef.current && mermaidRef.current?.innerHTML?.includes(passedMermaidDiagram)) {
                console.debug('[MermaidChart] skipping duplicate in-flight render');
                return;
            }

            if (passedMermaidDiagram && passedMermaidDiagram.trim().length > 0 && mermaidRef.current) {
                setIsLoading(true);
                setError(null);

                // bump render id for this run
                const thisRenderId = ++renderIdRef.current;
                renderingRef.current = true;

                // Validate diagram syntax first (optional)
                // await mermaid.parse(passedMermaidDiagram);

                // Render diagram and get SVG code
                const { svg } = await mermaid.render('mermaidChart', passedMermaidDiagram);

                // If a newer render started while we were rendering, discard this SVG
                if (thisRenderId !== renderIdRef.current) {
                    console.debug('[MermaidChart] discarding stale render result');
                    return;
                }

                if (mermaidRef.current) {
                    mermaidRef.current.innerHTML = svg;
                    console.log('[MermaidChart] Diagram rendered successfully', svg);
                    setIsLoading(false);
                    setError(null);
                }
            } else {
                const msg = 'No Mermaid diagram data provided';
                console.warn('[MermaidChart]', msg);
                setError(msg);
                if (onError) onError(msg);
            }
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : 'Unknown error rendering Mermaid diagram';
            console.error('[MermaidChart] Error rendering Mermaid diagram:', errMsg);
            setError(errMsg);
            if (onError) onError(errMsg);
        } finally {
            renderingRef.current = false;
        }
    }, [onError]);

    useEffect(() => {
        if (mermaidRef.current) {
            mermaidRef.current.innerHTML = ''; // Clear previous diagram
            findCurrentOrientation(mermaidDiagram);
            generateSVG(mermaidDiagram).then(() => {
                // After rendering, reset scroll to top-left
                console.log('scrollRef', scrollRef);
            });
        }
    }, [generateSVG, mermaidDiagram]);

    // Helpers for zooming
    const clamp = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

    const zoomIn = useCallback(() => setScale(s => clamp(+(s + 0.1).toFixed(2))), []);
    const zoomOut = useCallback(() => setScale(s => clamp(+(s - 0.1).toFixed(2))), []);
    const resetZoom = useCallback(() => setScale(1), []);
    const rotate = useCallback(async () => {
        if (mermaidRef.current && mermaidDiagram) {
            // Update the diagram definition to change the orientation directive
            let newOrientation: 'TD' | 'LR';
            switch (currentOrientation) {
                case 'TD':
                    newOrientation = 'LR';
                    break;
                case 'LR':
                    newOrientation = 'TD';
                    break;
                default:
                    newOrientation = 'TD';
                    break;
            }
            setCurrentOrientation(newOrientation);
            const updatedDiagram = mermaidDiagram.replace(/(flowchart\s+)(TD|LR|RL|BT)/, `$1${newOrientation}`);
            console.log(`[MermaidChart] Rotating diagram from ${currentOrientation} to ${newOrientation}`, updatedDiagram);

            await generateSVG(updatedDiagram);
        }
    }, [currentOrientation, generateSVG, mermaidDiagram]);

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
        <Box sx={{ height: '100%', width: '100%' }}>
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
                <Tooltip title="Rotate">
                    <IconButton size="small" onClick={rotate} aria-label="rotate">
                        <ScreenRotationIcon />
                    </IconButton>
                </Tooltip>
            </Stack>

            {isLoading && <CircularProgress />}
            {error && <Typography color="error">{error}</Typography>}

            {/* scrollRef holds the scrollable area; wheel zoom works when Ctrl/Meta is pressed */}
            <div ref={scrollRef} onWheel={handleWheel} style={{ overflow: 'auto', height: '100%', width: '100%', border: '1px solid transparent' }}>
                {/* mermaidRef will contain the SVG; apply transform scaling to it */}
                <div ref={mermaidRef} className='mermaidChart' style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }} />
            </div>
        </Box>
    );
}
