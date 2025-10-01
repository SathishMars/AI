'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Alert, Typography, CircularProgress } from '@mui/material';

interface SimpleMermaidProps {
  chart: string;
  id?: string;
}

const SimpleMermaid: React.FC<SimpleMermaidProps> = ({ 
  chart, 
  id = 'simple-mermaid' 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMermaidAndRender = async () => {
      try {
        console.log('SimpleMermaid: Starting render process');
        setIsLoading(true);
        setError(null);

        // Dynamic import of mermaid
        const mermaid = (await import('mermaid')).default;
        
        console.log('SimpleMermaid: Mermaid loaded, initializing...');
        
        // Initialize mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose'
        });

        console.log('SimpleMermaid: Rendering chart...');
        
        if (ref.current) {
          const uniqueId = `${id}-${Date.now()}`;
          const { svg } = await mermaid.render(uniqueId, chart);
          
          ref.current.innerHTML = svg;
          
          // Style the SVG
          const svgElement = ref.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
          }
        }
        
        console.log('SimpleMermaid: Render complete');
        setIsLoading(false);
      } catch (err) {
        console.error('SimpleMermaid: Error:', err);
        setError(err instanceof Error ? err.message : 'Rendering failed');
        setIsLoading(false);
      }
    };

    if (chart && ref.current) {
      loadMermaidAndRender();
    }
  }, [chart, id]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
        <CircularProgress size={30} sx={{ mb: 1 }} />
        <Typography variant="caption">Loading diagram...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="subtitle2">Render Error</Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  return <Box ref={ref} sx={{ width: '100%', textAlign: 'center' }} />;
};

export default SimpleMermaid;