const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getVideoMetadata } = require('../services/videoService');
const { findDuplicateGroups, getFilesToMove, calculateSummary } = require('../services/duplicateService');
const { findVideoFiles, validatePath, moveFile, ensureDirectory } = require('../services/fileService');

const router = express.Router();

// Store active scans and their results
const scans = new Map();

/**
 * POST /api/scan
 * Start a new duplicate scan
 */
router.post('/scan', async (req, res) => {
  const { sourcePath, recurse = true } = req.body;
  const broadcast = req.app.get('broadcast');
  
  if (!sourcePath) {
    return res.status(400).json({ error: 'sourcePath is required' });
  }
  
  // Validate source path
  const pathValidation = await validatePath(sourcePath);
  if (!pathValidation.valid || !pathValidation.isDirectory) {
    return res.status(400).json({ error: 'Invalid source path or not a directory' });
  }
  
  const scanId = uuidv4();
  
  // Initialize scan state
  scans.set(scanId, {
    id: scanId,
    status: 'running',
    phase: 'discovering',
    sourcePath,
    recurse,
    progress: { current: 0, total: 0, percentage: 0 },
    results: null,
    error: null,
    startTime: new Date()
  });
  
  // Return immediately with scan ID
  res.json({ scanId, status: 'started' });
  
  // Run scan asynchronously
  runScan(scanId, sourcePath, recurse, broadcast);
});

/**
 * Run the scan process asynchronously
 */
async function runScan(scanId, sourcePath, recurse, broadcast) {
  const scan = scans.get(scanId);
  
  try {
    // Phase 1: Discover video files
    broadcast({ type: 'scan_progress', scanId, phase: 'discovering', message: 'Searching for video files...' });
    
    const videoFiles = await findVideoFiles(sourcePath, recurse);
    
    if (videoFiles.length === 0) {
      scan.status = 'completed';
      scan.phase = 'complete';
      scan.results = { videoCount: 0, duplicateGroups: [], filesToMove: [], summary: null };
      broadcast({ type: 'scan_complete', scanId, results: scan.results });
      return;
    }
    
    broadcast({ type: 'scan_progress', scanId, phase: 'discovered', message: `Found ${videoFiles.length} video files` });
    
    // Phase 2: Analyze metadata
    scan.phase = 'analyzing';
    scan.progress.total = videoFiles.length;
    
    const videoMetadata = [];
    
    for (let i = 0; i < videoFiles.length; i++) {
      const filePath = videoFiles[i];
      const metadata = await getVideoMetadata(filePath);
      videoMetadata.push(metadata);
      
      scan.progress.current = i + 1;
      scan.progress.percentage = Math.round(((i + 1) / videoFiles.length) * 100);
      
      // Broadcast progress every 5 files or on last file
      if ((i + 1) % 5 === 0 || i === videoFiles.length - 1) {
        broadcast({
          type: 'scan_progress',
          scanId,
          phase: 'analyzing',
          progress: scan.progress,
          message: `Analyzing: ${metadata.fileName}`
        });
      }
    }
    
    // Phase 3: Find duplicates
    scan.phase = 'grouping';
    broadcast({ type: 'scan_progress', scanId, phase: 'grouping', message: 'Identifying duplicate groups...' });
    
    const duplicateGroups = findDuplicateGroups(videoMetadata);
    const filesToMove = getFilesToMove(duplicateGroups);
    const summary = calculateSummary(duplicateGroups, filesToMove);
    
    // Store results
    scan.status = 'completed';
    scan.phase = 'complete';
    scan.results = {
      videoCount: videoFiles.length,
      duplicateGroups,
      filesToMove,
      summary
    };
    scan.endTime = new Date();
    
    broadcast({ type: 'scan_complete', scanId, results: scan.results });
    
  } catch (err) {
    scan.status = 'error';
    scan.error = err.message;
    broadcast({ type: 'scan_error', scanId, error: err.message });
  }
}

/**
 * GET /api/scan/:id
 * Get scan status and results
 */
router.get('/scan/:id', (req, res) => {
  const scan = scans.get(req.params.id);
  
  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }
  
  res.json(scan);
});

/**
 * POST /api/move
 * Move duplicate files to cleanup folder
 */
router.post('/move', async (req, res) => {
  const { scanId, cleanupPath, selectedFiles } = req.body;
  const broadcast = req.app.get('broadcast');
  
  if (!scanId || !cleanupPath) {
    return res.status(400).json({ error: 'scanId and cleanupPath are required' });
  }
  
  const scan = scans.get(scanId);
  if (!scan || !scan.results) {
    return res.status(400).json({ error: 'Invalid scan or no results available' });
  }
  
  let filesToMove = scan.results.filesToMove;
  if (!filesToMove || filesToMove.length === 0) {
    return res.status(400).json({ error: 'No files to move' });
  }
  
  // If selectedFiles provided, filter to only those files
  if (selectedFiles && Array.isArray(selectedFiles) && selectedFiles.length > 0) {
    const selectedSet = new Set(selectedFiles);
    filesToMove = filesToMove.filter(f => selectedSet.has(f.sourcePath));
    
    if (filesToMove.length === 0) {
      return res.status(400).json({ error: 'No matching files found to move' });
    }
  }
  
  // Ensure cleanup directory exists
  const dirResult = await ensureDirectory(cleanupPath);
  if (!dirResult.success) {
    return res.status(400).json({ error: `Cannot create cleanup directory: ${dirResult.error}` });
  }
  
  // Return immediately
  res.json({ status: 'started', totalFiles: filesToMove.length });
  
  // Run move operation asynchronously
  runMoveOperation(scanId, scan.sourcePath, cleanupPath, filesToMove, broadcast);
});

/**
 * Run move operation asynchronously
 */
async function runMoveOperation(scanId, sourcePath, cleanupPath, filesToMove, broadcast) {
  const results = {
    totalFiles: filesToMove.length,
    successCount: 0,
    failureCount: 0,
    totalBytesMoved: 0,
    moveResults: []
  };
  
  for (let i = 0; i < filesToMove.length; i++) {
    const file = filesToMove[i];
    const moveResult = await moveFile(file.sourcePath, sourcePath, cleanupPath);
    
    results.moveResults.push(moveResult);
    
    if (moveResult.success) {
      results.successCount++;
      results.totalBytesMoved += file.sizeBytes;
    } else {
      results.failureCount++;
    }
    
    const progress = {
      current: i + 1,
      total: filesToMove.length,
      percentage: Math.round(((i + 1) / filesToMove.length) * 100)
    };
    
    broadcast({
      type: 'move_progress',
      scanId,
      progress,
      message: `Moving: ${file.fileName}`,
      success: moveResult.success
    });
  }
  
  broadcast({
    type: 'move_complete',
    scanId,
    results: {
      ...results,
      totalGBMoved: Math.round(results.totalBytesMoved / 1073741824 * 100) / 100
    }
  });
}

/**
 * POST /api/validate-path
 * Validate a directory path
 */
router.post('/validate-path', async (req, res) => {
  const { path: dirPath } = req.body;
  
  if (!dirPath) {
    return res.status(400).json({ error: 'path is required' });
  }
  
  const result = await validatePath(dirPath);
  res.json(result);
});

/**
 * GET /api/scans
 * List all scans
 */
router.get('/scans', (req, res) => {
  const scanList = Array.from(scans.values()).map(scan => ({
    id: scan.id,
    status: scan.status,
    phase: scan.phase,
    sourcePath: scan.sourcePath,
    startTime: scan.startTime,
    endTime: scan.endTime,
    summary: scan.results?.summary
  }));
  
  res.json(scanList);
});

module.exports = router;
