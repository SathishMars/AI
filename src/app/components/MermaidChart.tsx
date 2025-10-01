'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Alert, Typography, CircularProgress } from '@mui/material';
import mermaid from 'mermaid';

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

  useEffect(() => {
    // Initialize Mermaid with enhanced configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'Roboto, Arial, sans-serif',
      fontSize: 14,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        padding: 20,
        nodeSpacing: 50,
        rankSpacing: 50
      },
      er: {
        useMaxWidth: true
      },
      sequence: {
        useMaxWidth: true,
        showSequenceNumbers: true
      },
      gantt: {
        useMaxWidth: true
      },
      journey: {
        useMaxWidth: true
      },
      timeline: {
        useMaxWidth: true
      },
      gitGraph: {
        useMaxWidth: true
      },
      mindmap: {
        useMaxWidth: true
      },
      quadrantChart: {
        useMaxWidth: true
      },
      xyChart: {
        useMaxWidth: true
      }
    });
  }, []);

  useEffect(() => {
    if (!chart || !ref.current) return;

    setIsLoading(true);
    setError(null);
    
    const currentRef = ref.current; // Capture ref for cleanup
    
    const renderChart = async () => {
      try {
        // Generate unique ID for this chart instance
        const uniqueId = `${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Clear previous content
        if (currentRef) {
          currentRef.innerHTML = '';
        }

        // Validate and parse the Mermaid syntax
        const isValid = await mermaid.parse(chart);
        if (!isValid) {
          throw new Error('Invalid Mermaid syntax');
        }

        // Render the chart
        const { svg } = await mermaid.render(uniqueId, chart);
        
        if (currentRef) {
          currentRef.innerHTML = svg;
          
          // Apply responsive styling to the SVG
          const svgElement = currentRef.querySelector('svg');
          if (svgElement) {
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
            svgElement.style.display = 'block';
            svgElement.style.margin = '0 auto';
          }
        }
        
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to render Mermaid chart';
        setError(errorMessage);
        setIsLoading(false);
        onError?.(errorMessage);
        
        console.error('Mermaid rendering error:', err);
        
        // Fallback: show the raw chart text
        if (currentRef) {
          currentRef.innerHTML = `
            <div style="padding: 16px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px;">
              <strong>Chart Syntax:</strong>
              <pre style="margin-top: 8px; font-family: monospace; font-size: 12px; white-space: pre-wrap;">${chart}</pre>
            </div>
          `;
        }
      }
    };

    renderChart();
    
    // Cleanup function
    return () => {
      if (currentRef) {
        try {
          // Chart cleanup - clear the content
          currentRef.innerHTML = '';
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [chart, id, onError]);

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 4,
          minHeight: 200
        }}
      >
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Rendering workflow diagram...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Chart Rendering Error
        </Typography>
        <Typography variant="body2">
          {error}
        </Typography>
      </Alert>
    );
  }

  return (
    <Box
      ref={ref}
      className={className}
      sx={{
        width: '100%',
        overflow: 'auto',
        p: 2,
        '& svg': {
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          margin: '0 auto'
        },
        '& .node': {
          cursor: 'pointer'
        },
        '& .edgePath': {
          cursor: 'pointer'
        }
      }}
    />
  );
};

export default MermaidChart;