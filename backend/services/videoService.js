const { spawn } = require('child_process');
const path = require('path');

const VIDEO_EXTENSIONS = [
  '.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.webm',
  '.mpg', '.mpeg', '.m2v', '.ts', '.mts', '.m2ts', '.vob',
  '.3gp', '.3g2', '.divx', '.asf', '.ogv', '.f4v'
];

/**
 * Check if a file is a video based on extension
 */
function isVideoFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

/**
 * Get video metadata using ffprobe
 */
function getVideoMetadata(filePath) {
  return new Promise((resolve) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ];

    const ffprobe = spawn('ffprobe', args);
    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0 || !stdout) {
        resolve({
          filePath,
          fileName: path.basename(filePath),
          success: false,
          error: stderr || 'Failed to extract metadata'
        });
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams?.find(s => s.codec_type === 'video');
        const duration = parseFloat(data.format?.duration) || 0;

        resolve({
          filePath,
          fileName: path.basename(filePath),
          directory: path.dirname(filePath),
          sizeBytes: parseInt(data.format?.size) || 0,
          sizeMB: Math.round((parseInt(data.format?.size) || 0) / 1048576 * 100) / 100,
          duration: Math.round(duration * 100) / 100,
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'Unknown',
          codec: videoStream?.codec_name || 'Unknown',
          success: true
        });
      } catch (err) {
        resolve({
          filePath,
          fileName: path.basename(filePath),
          success: false,
          error: err.message
        });
      }
    });

    ffprobe.on('error', (err) => {
      resolve({
        filePath,
        fileName: path.basename(filePath),
        success: false,
        error: err.message
      });
    });
  });
}

module.exports = {
  VIDEO_EXTENSIONS,
  isVideoFile,
  getVideoMetadata
};
