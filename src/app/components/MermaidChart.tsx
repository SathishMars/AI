'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import mermaid from 'mermaid';

interface MermaidChartProps {
    mermaidDiagram: string;
    regenerateMermaidDiagram?: () => Promise<void>;
    onError?: (error: string) => void;
}

export default function MermaidChart({
    mermaidDiagram,
    regenerateMermaidDiagram,
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
        <div className="h-full w-full">
            <TooltipProvider>
                <div className="flex items-center gap-1 mb-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={regenerateMermaidDiagram} aria-label="regenerate-diagram">
                                <RotateCw className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Regenerate Diagram</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={zoomOut} aria-label="zoom-out">
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zoom out ( - )</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={resetZoom} aria-label="reset-zoom">
                                <RotateCw className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reset zoom (0)</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={zoomIn} aria-label="zoom-in">
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zoom in ( + )</TooltipContent>
                    </Tooltip>
                    
                    <span className="text-xs text-muted-foreground ml-2">{Math.round(scale * 100)}%</span>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={rotate} aria-label="rotate">
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Rotate</TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>

            {isLoading && (
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading diagram...</span>
                </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* scrollRef holds the scrollable area; wheel zoom works when Ctrl/Meta is pressed */}
            <div ref={scrollRef} onWheel={handleWheel} className="overflow-auto h-full w-full border border-transparent">
                {/* mermaidRef will contain the SVG; apply transform scaling to it */}
                <div ref={mermaidRef} className='mermaidChart' style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }} />
            </div>
        </div>
    );
}
