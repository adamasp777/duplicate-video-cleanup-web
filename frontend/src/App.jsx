import React, { useState, useEffect, useRef } from 'react';

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #16213e',
  },
  title: {
    fontSize: '28px',
    color: '#e94560',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#888',
    fontSize: '14px',
  },
  section: {
    background: '#16213e',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '15px',
    color: '#e94560',
  },
  inputGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '500',
    color: '#ccc',
  },
  input: {
    width: '100%',
    padding: '12px 15px',
    borderRadius: '8px',
    border: '1px solid #0f3460',
    background: '#0f3460',
    color: '#fff',
    fontSize: '14px',
  },
  checkbox: {
    marginRight: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    color: '#ccc',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
  },
  button: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  primaryButton: {
    background: '#e94560',
    color: '#fff',
  },
  secondaryButton: {
    background: '#0f3460',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  progressContainer: {
    marginTop: '20px',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#ccc',
  },
  progressBar: {
    height: '24px',
    background: '#0f3460',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #e94560, #ff6b6b)',
    transition: 'width 0.3s ease',
    borderRadius: '12px',
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginTop: '15px',
  },
  summaryCard: {
    background: '#0f3460',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#e94560',
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#888',
    marginTop: '5px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
  },
  th: {
    background: '#0f3460',
    padding: '12px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#ccc',
    borderBottom: '2px solid #1a1a2e',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #0f3460',
    fontSize: '13px',
  },
  keepRow: {
    background: 'rgba(46, 204, 113, 0.1)',
  },
  moveRow: {
    background: 'rgba(233, 69, 96, 0.1)',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  keepBadge: {
    background: '#2ecc71',
    color: '#fff',
  },
  moveBadge: {
    background: '#e94560',
    color: '#fff',
  },
  log: {
    background: '#0a0a14',
    borderRadius: '8px',
    padding: '15px',
    maxHeight: '200px',
    overflowY: 'auto',
    fontFamily: 'Monaco, Consolas, monospace',
    fontSize: '12px',
  },
  logEntry: {
    marginBottom: '4px',
    color: '#888',
  },
  logTime: {
    color: '#e94560',
  },
  tableContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  alert: {
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '15px',
  },
  alertSuccess: {
    background: 'rgba(46, 204, 113, 0.2)',
    border: '1px solid #2ecc71',
    color: '#2ecc71',
  },
  alertError: {
    background: 'rgba(233, 69, 96, 0.2)',
    border: '1px solid #e94560',
    color: '#e94560',
  },
};

function App() {
  const [sourcePath, setSourcePath] = useState('/media');
  const [cleanupPath, setCleanupPath] = useState('/cleanup');
  const [recurse, setRecurse] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [scanId, setScanId] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [progressMessage, setProgressMessage] = useState('');
  const [operation, setOperation] = useState('');
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState([]);
  const [alert, setAlert] = useState(null);
  
  const wsRef = useRef(null);
  const logRef = useRef(null);

  // Add log entry
  const addLog = (message) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, message }]);
  };

  // Connect to WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const connect = () => {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        addLog('Connected to server');
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      wsRef.current.onclose = () => {
        addLog('Disconnected from server, reconnecting...');
        setTimeout(connect, 3000);
      };
      
      wsRef.current.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
    };
    
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'scan_progress':
        setOperation('Scanning');
        if (data.progress) {
          setProgress(data.progress);
        }
        if (data.message) {
          setProgressMessage(data.message);
          addLog(data.message);
        }
        break;
        
      case 'scan_complete':
        setIsScanning(false);
        setResults(data.results);
        setOperation('');
        setProgress({ current: 0, total: 0, percentage: 0 });
        addLog(`Scan complete! Found ${data.results.summary?.duplicateGroupCount || 0} duplicate groups`);
        if (data.results.summary?.duplicateGroupCount === 0) {
          setAlert({ type: 'success', message: 'No duplicate videos found!' });
        }
        break;
        
      case 'scan_error':
        setIsScanning(false);
        setOperation('');
        addLog(`Error: ${data.error}`);
        setAlert({ type: 'error', message: data.error });
        break;
        
      case 'move_progress':
        setOperation('Moving');
        setProgress(data.progress);
        setProgressMessage(data.message);
        addLog(data.message);
        break;
        
      case 'move_complete':
        setIsMoving(false);
        setOperation('');
        setProgress({ current: 0, total: 0, percentage: 0 });
        setResults(null);
        addLog(`Move complete! Moved ${data.results.successCount} files (${data.results.totalGBMoved} GB)`);
        setAlert({ 
          type: 'success', 
          message: `Successfully moved ${data.results.successCount} files (${data.results.totalGBMoved} GB). Failed: ${data.results.failureCount}` 
        });
        break;
    }
  };

  // Start scan
  const handleScan = async () => {
    if (!sourcePath) {
      setAlert({ type: 'error', message: 'Please enter a source path' });
      return;
    }
    
    setAlert(null);
    setIsScanning(true);
    setResults(null);
    setLogs([]);
    addLog(`Starting scan: ${sourcePath}`);
    
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePath, recurse })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setScanId(data.scanId);
        addLog(`Scan started with ID: ${data.scanId}`);
      } else {
        setIsScanning(false);
        setAlert({ type: 'error', message: data.error });
        addLog(`Error: ${data.error}`);
      }
    } catch (err) {
      setIsScanning(false);
      setAlert({ type: 'error', message: err.message });
      addLog(`Error: ${err.message}`);
    }
  };

  // Move duplicates
  const handleMove = async () => {
    if (!scanId || !cleanupPath) {
      setAlert({ type: 'error', message: 'Please enter a cleanup path' });
      return;
    }
    
    setAlert(null);
    setIsMoving(true);
    addLog(`Moving duplicates to: ${cleanupPath}`);
    
    try {
      const response = await fetch('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId, cleanupPath })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setIsMoving(false);
        setAlert({ type: 'error', message: data.error });
        addLog(`Error: ${data.error}`);
      }
    } catch (err) {
      setIsMoving(false);
      setAlert({ type: 'error', message: err.message });
      addLog(`Error: ${err.message}`);
    }
  };

  // Build display data from results
  const getDisplayData = () => {
    if (!results?.duplicateGroups) return [];
    
    const data = [];
    results.duplicateGroups.forEach(group => {
      // Add keep file
      data.push({
        group: group.groupNumber,
        status: 'KEEP',
        fileName: group.largestFile.fileName,
        path: group.largestFile.directory,
        sizeMB: group.largestFile.sizeMB,
        duration: group.duration,
        resolution: group.resolution,
        codec: group.codec,
      });
      
      // Add move files
      group.filesToMove.forEach(file => {
        data.push({
          group: group.groupNumber,
          status: 'MOVE',
          fileName: file.fileName,
          path: file.directory,
          sizeMB: file.sizeMB,
          duration: group.duration,
          resolution: group.resolution,
          codec: group.codec,
        });
      });
    });
    
    return data;
  };

  const displayData = getDisplayData();
  const canMove = results?.summary?.totalFilesToMove > 0 && !isScanning && !isMoving;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🎬 Duplicate Video Cleanup</h1>
        <p style={styles.subtitle}>Find and remove duplicate video files based on duration and resolution</p>
      </header>

      {alert && (
        <div style={{ ...styles.alert, ...(alert.type === 'success' ? styles.alertSuccess : styles.alertError) }}>
          {alert.message}
        </div>
      )}

      {/* Configuration Section */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>📁 Configuration</h2>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Source Path</label>
          <input
            style={styles.input}
            type="text"
            value={sourcePath}
            onChange={(e) => setSourcePath(e.target.value)}
            placeholder="/mnt/user/media/videos"
            disabled={isScanning || isMoving}
          />
        </div>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Cleanup Folder</label>
          <input
            style={styles.input}
            type="text"
            value={cleanupPath}
            onChange={(e) => setCleanupPath(e.target.value)}
            placeholder="/mnt/user/media/duplicates"
            disabled={isScanning || isMoving}
          />
        </div>
        
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            style={styles.checkbox}
            checked={recurse}
            onChange={(e) => setRecurse(e.target.checked)}
            disabled={isScanning || isMoving}
          />
          Include subdirectories
        </label>
        
        <div style={styles.buttonGroup}>
          <button
            style={{
              ...styles.button,
              ...styles.primaryButton,
              ...(isScanning || isMoving ? styles.disabledButton : {})
            }}
            onClick={handleScan}
            disabled={isScanning || isMoving}
          >
            {isScanning ? '⏳ Scanning...' : '🔍 Scan for Duplicates'}
          </button>
          
          <button
            style={{
              ...styles.button,
              ...styles.secondaryButton,
              ...(!canMove ? styles.disabledButton : {})
            }}
            onClick={handleMove}
            disabled={!canMove}
          >
            {isMoving ? '⏳ Moving...' : '📦 Move Duplicates'}
          </button>
        </div>
      </section>

      {/* Progress Section */}
      {(isScanning || isMoving) && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>⏳ {operation} Progress</h2>
          <div style={styles.progressContainer}>
            <div style={styles.progressLabel}>
              <span>{progressMessage}</span>
              <span>{progress.percentage}%</span>
            </div>
            <div style={styles.progressBar}>
              <div 
                style={{ ...styles.progressFill, width: `${progress.percentage}%` }}
              />
            </div>
            {progress.total > 0 && (
              <div style={{ ...styles.progressLabel, marginTop: '8px' }}>
                <span>{progress.current} of {progress.total} files</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Results Section */}
      {results?.summary && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>📊 Scan Results</h2>
          
          <div style={styles.summary}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryValue}>{results.videoCount}</div>
              <div style={styles.summaryLabel}>Videos Scanned</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryValue}>{results.summary.duplicateGroupCount}</div>
              <div style={styles.summaryLabel}>Duplicate Groups</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryValue}>{results.summary.totalFilesToMove}</div>
              <div style={styles.summaryLabel}>Files to Move</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryValue}>{results.summary.spaceToSaveGB} GB</div>
              <div style={styles.summaryLabel}>Space to Save</div>
            </div>
          </div>

          {displayData.length > 0 && (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Group</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>File Name</th>
                    <th style={styles.th}>Path</th>
                    <th style={styles.th}>Size (MB)</th>
                    <th style={styles.th}>Duration</th>
                    <th style={styles.th}>Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((row, idx) => (
                    <tr key={idx} style={row.status === 'KEEP' ? styles.keepRow : styles.moveRow}>
                      <td style={styles.td}>{row.group}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          ...(row.status === 'KEEP' ? styles.keepBadge : styles.moveBadge)
                        }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={styles.td}>{row.fileName}</td>
                      <td style={styles.td}>{row.path}</td>
                      <td style={styles.td}>{row.sizeMB}</td>
                      <td style={styles.td}>{row.duration}s</td>
                      <td style={styles.td}>{row.resolution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Log Section */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>📝 Activity Log</h2>
        <div style={styles.log} ref={logRef}>
          {logs.length === 0 ? (
            <div style={styles.logEntry}>No activity yet. Start a scan to begin.</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} style={styles.logEntry}>
                <span style={styles.logTime}>[{log.time}]</span> {log.message}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
