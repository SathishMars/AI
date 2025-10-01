'use client';

import React, { useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import SimpleMermaid from '@/app/components/SimpleMermaid';

const TestSimpleMermaid = () => {
  const [showChart, setShowChart] = useState(false);

  // Simple test chart
  const simpleChart = `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`;

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Simple Mermaid Test
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Testing direct Mermaid rendering with a simple flowchart.
      </Typography>

      <Button 
        variant="contained" 
        onClick={() => setShowChart(!showChart)}
        sx={{ mb: 3 }}
      >
        {showChart ? 'Hide Chart' : 'Show Simple Chart'}
      </Button>

      {showChart && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Simple Flowchart:
          </Typography>
          <SimpleMermaid 
            chart={simpleChart}
            id="simple-test-chart"
          />
        </Paper>
      )}
    </Box>
  );
};

export default TestSimpleMermaid;