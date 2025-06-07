require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for WordPress requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// GET endpoint to serve class-data.json
app.get('/api/classes', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'class-data.json');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Class data not found' });
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Return current data or fallback to latest history entry
    const classData = data.currentData || (data.history && data.history.length > 0 ? data.history[data.history.length - 1].data : []);
    
    res.json({
      success: true,
      lastUpdated: data.lastUpdated,
      totalClasses: classData.length,
      classes: classData
    });
  } catch (error) {
    console.error('Error serving class data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST endpoint to trigger refresh/execute index.js
app.post('/api/refresh', (req, res) => {
  console.log('🔄 Webhook triggered: Starting class data refresh...');
  
  try {
    // Spawn the index.js process
    const childProcess = spawn('node', ['index.js'], {
      stdio: 'pipe',
      cwd: __dirname
    });
    
    let output = '';
    let errorOutput = '';
    
    childProcess.stdout.on('data', (data) => {
      const message = data.toString();
      output += message;
      console.log(message.trim());
    });
    
    childProcess.stderr.on('data', (data) => {
      const message = data.toString();
      errorOutput += message;
      console.error(message.trim());
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Class data refresh completed successfully');
        res.json({
          success: true,
          message: 'Class data refresh completed successfully',
          output: output.trim()
        });
      } else {
        console.error(`❌ Class data refresh failed with exit code ${code}`);
        res.status(500).json({
          success: false,
          message: `Refresh process failed with exit code ${code}`,
          error: errorOutput.trim(),
          output: output.trim()
        });
      }
    });
    
    childProcess.on('error', (error) => {
      console.error('❌ Failed to start refresh process:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start refresh process',
        error: error.message
      });
    });
    
  } catch (error) {
    console.error('❌ Error triggering refresh:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering refresh',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Class data endpoint: http://localhost:${PORT}/api/classes`);
  console.log(`🔄 Refresh endpoint: http://localhost:${PORT}/api/refresh`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});