'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

interface MermaidChartProps {
  chart: string;
  id?: string;
  className?: string;
  onError?: (error: string) => void;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ 
  chart, 
  id = 'mermaid-chart', 
  className,
  onError 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [refReady, setRefReady] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');

  // Callback ref to track when the DOM element is actually set
  const setRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      ref.current = node;
      setRefReady(true);
    } else {
      setRefReady(false);
    }
  }, []);

  // Track when the component is mounted
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!chart) {
      setIsLoading(false);
      return;
    }

    if (!refReady || !isMounted) {
      setIsLoading(true); // Keep loading since we expect the ref to be ready soon
      return;
    }

    const renderChart = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Dynamic import to ensure proper loading
        const mermaid = (await import('mermaid')).default;
        
        // Initialize mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'Roboto, Arial, sans-serif',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true
          }
        });

        if (ref.current) {
          const uniqueId = `${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Render the chart
          const { svg } = await mermaid.render(uniqueId, chart);
          
          // Set SVG content in React state instead of direct DOM manipulation
          setSvgContent(svg);
        }
        
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Error rendering Mermaid chart:', err);
        setError(errorMessage);
        
        // Call onError callback if provided
        if (onError) {
          onError(errorMessage);
        }
        
        setIsLoading(false);
      }
    };

    renderChart();
  }, [chart, id, isMounted, refReady, onError]); // Added refReady to dependencies

  return (
    <Box
      ref={setRefCallback}
      className={className}
      sx={{
        width: '100%',
        overflow: 'auto',
        p: 2,
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        '& svg': {
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          margin: '0 auto'
        }
      }}
    >
      {isLoading && (
        <>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Rendering workflow diagram...
          </Typography>
        </>
      )}
      
      {error && (
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Typography color="error" variant="body2" gutterBottom>
            Error rendering diagram: {error}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Check console for details
          </Typography>
        </Box>
      )}
      
      {!isLoading && !error && svgContent && (
        <div dangerouslySetInnerHTML={{ __html: svgContent }} />
      )}
    </Box>
  );
};

export default MermaidChart;