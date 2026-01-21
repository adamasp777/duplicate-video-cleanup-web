const fs = require('fs');
const path = require('path');
const { isVideoFile } = require('./videoService');

/**
 * Recursively find all video files in a directory
 */
async function findVideoFiles(dirPath, recurse = true) {
  const videoFiles = [];
  
  async function scanDir(currentPath) {
    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory() && recurse) {
          await scanDir(fullPath);
        } else if (entry.isFile() && isVideoFile(entry.name)) {
          videoFiles.push(fullPath);
        }
      }
    } catch (err) {
      console.error(`Error scanning directory ${currentPath}:`, err.message);
    }
  }
  
  await scanDir(dirPath);
  return videoFiles;
}

/**
 * Validate that a path exists and is accessible
 */
async function validatePath(dirPath) {
  try {
    const stats = await fs.promises.stat(dirPath);
    return {
      valid: true,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  } catch (err) {
    return {
      valid: false,
      error: err.message
    };
  }
}

/**
 * Move a file while preserving directory structure
 */
async function moveFile(sourcePath, baseDirectory, destinationRoot) {
  try {
    // Calculate relative path from base directory
    const relativePath = path.relative(baseDirectory, sourcePath);
    const relativeDir = path.dirname(relativePath);
    
    // Build destination directory
    let destDir;
    if (relativeDir === '.' || relativeDir === '') {
      destDir = destinationRoot;
    } else {
      destDir = path.join(destinationRoot, relativeDir);
    }
    
    // Create destination directory if it doesn't exist
    await fs.promises.mkdir(destDir, { recursive: true });
    
    // Build destination file path
    const fileName = path.basename(sourcePath);
    const destPath = path.join(destDir, fileName);
    
    // Move the file
    await fs.promises.rename(sourcePath, destPath);
    console.log(`Successfully moved: ${sourcePath} -> ${destPath}`);
    
    return {
      success: true,
      sourcePath,
      destinationPath: destPath
    };
  } catch (err) {
    // If rename fails (cross-device), try copy + delete
    if (err.code === 'EXDEV') {
      try {
        const relativePath = path.relative(baseDirectory, sourcePath);
        const relativeDir = path.dirname(relativePath);
        
        let destDir;
        if (relativeDir === '.' || relativeDir === '') {
          destDir = destinationRoot;
        } else {
          destDir = path.join(destinationRoot, relativeDir);
        }
        
        await fs.promises.mkdir(destDir, { recursive: true });
        
        const fileName = path.basename(sourcePath);
        const destPath = path.join(destDir, fileName);
        
        await fs.promises.copyFile(sourcePath, destPath);
        await fs.promises.unlink(sourcePath);
        console.log(`Successfully moved (copy+delete): ${sourcePath} -> ${destPath}`);
        
        return {
          success: true,
          sourcePath,
          destinationPath: destPath
        };
      } catch (copyErr) {
        console.error(`Failed to move file: ${sourcePath} - ${copyErr.message}`);
        return {
          success: false,
          sourcePath,
          error: copyErr.message
        };
      }
    }
    
    console.error(`Failed to move file: ${sourcePath} - ${err.message}`);
    return {
      success: false,
      sourcePath,
      error: err.message
    };
  }
}

/**
 * Ensure a directory exists, create if it doesn't
 */
async function ensureDirectory(dirPath) {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  findVideoFiles,
  validatePath,
  moveFile,
  ensureDirectory
};
