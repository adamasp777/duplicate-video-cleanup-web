/**
 * Find duplicate groups based on duration and resolution
 * Videos with the same duration and resolution are considered duplicates
 */
function findDuplicateGroups(videoMetadata) {
  // Filter to only successful metadata extractions
  const validMetadata = videoMetadata.filter(v => v.success);
  
  // Group by duration + width + height
  const groups = new Map();
  
  validMetadata.forEach(video => {
    // Create a key from duration (rounded to 2 decimals), width, and height
    const key = `${video.duration}-${video.width}-${video.height}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(video);
  });
  
  // Filter to only groups with more than 1 file (actual duplicates)
  const duplicateGroups = [];
  let groupNumber = 1;
  
  groups.forEach((files, key) => {
    if (files.length > 1) {
      // Sort by file size descending (keep largest)
      files.sort((a, b) => b.sizeBytes - a.sizeBytes);
      
      const largestFile = files[0];
      const filesToMove = files.slice(1);
      
      const spaceToSaveMB = filesToMove.reduce((sum, f) => sum + f.sizeMB, 0);
      
      duplicateGroups.push({
        groupNumber,
        duration: largestFile.duration,
        resolution: largestFile.resolution,
        width: largestFile.width,
        height: largestFile.height,
        codec: largestFile.codec,
        fileCount: files.length,
        files,
        largestFile,
        filesToMove,
        totalSizeMB: files.reduce((sum, f) => sum + f.sizeMB, 0),
        spaceToSaveMB: Math.round(spaceToSaveMB * 100) / 100
      });
      
      groupNumber++;
    }
  });
  
  return duplicateGroups;
}

/**
 * Get flat list of files to move from duplicate groups
 */
function getFilesToMove(duplicateGroups) {
  const filesToMove = [];
  
  duplicateGroups.forEach(group => {
    group.filesToMove.forEach(file => {
      filesToMove.push({
        sourcePath: file.filePath,
        fileName: file.fileName,
        directory: file.directory,
        sizeMB: file.sizeMB,
        sizeBytes: file.sizeBytes,
        groupNumber: group.groupNumber,
        duration: group.duration,
        resolution: group.resolution,
        keepingFile: group.largestFile.fileName
      });
    });
  });
  
  return filesToMove;
}

/**
 * Calculate summary statistics
 */
function calculateSummary(duplicateGroups, filesToMove) {
  const totalSpaceMB = filesToMove.reduce((sum, f) => sum + f.sizeMB, 0);
  
  return {
    duplicateGroupCount: duplicateGroups.length,
    totalFilesToMove: filesToMove.length,
    spaceToSaveMB: Math.round(totalSpaceMB * 100) / 100,
    spaceToSaveGB: Math.round(totalSpaceMB / 1024 * 100) / 100
  };
}

module.exports = {
  findDuplicateGroups,
  getFilesToMove,
  calculateSummary
};
