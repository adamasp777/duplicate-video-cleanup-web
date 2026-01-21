# Duplicate Video Cleanup - Web Application

A web-based utility to find and clean up duplicate video files based on duration and resolution. Designed for Unraid but works on any Docker-compatible system.

## Features

- 🔍 Scan directories for video files (recursive)
- 📊 Identify duplicates based on duration + resolution
- 📁 Shows file names, paths, sizes in results table
- 🎯 Keeps the largest file, marks smaller duplicates for removal
- 📦 Move duplicates to a cleanup folder (preserves directory structure)
- 📈 Real-time progress bars for scan and move operations
- 📝 Activity log with timestamps
- 🌐 Modern, responsive web UI

## Supported Video Formats

`.mkv`, `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.m4v`, `.webm`, `.mpg`, `.mpeg`, `.m2v`, `.ts`, `.mts`, `.m2ts`, `.vob`, `.3gp`, `.3g2`, `.divx`, `.asf`, `.ogv`, `.f4v`

## Quick Start (Docker)

### Build the image:

```bash
cd duplicate-video-cleanup-web
docker build -t duplicate-video-cleanup:latest .
```

### Run with Docker:

```bash
docker run -d \
  --name duplicate-video-cleanup \
  -p 3000:3000 \
  -v /path/to/your/videos:/media:ro \
  -v /path/to/cleanup/folder:/cleanup \
  duplicate-video-cleanup:latest
```

### Run with Docker Compose:

Edit `docker-compose.yml` to set your volume paths, then:

```bash
docker-compose up -d
```

Access the web UI at: `http://your-server-ip:3000`

## Unraid Installation

### Option 1: Manual Docker Container

1. Copy the project to your Unraid server
2. SSH into Unraid and build the image:
   ```bash
   cd /path/to/duplicate-video-cleanup-web
   docker build -t duplicate-video-cleanup:latest .
   ```
3. In Unraid Docker tab, click "Add Container"
4. Configure:
   - **Repository:** `duplicate-video-cleanup:latest`
   - **Port:** `3000` → `3000`
   - **Path:** `/mnt/user/media` → `/media` (Read Only)
   - **Path:** `/mnt/user/duplicates` → `/cleanup`

### Option 2: Using the XML Template

1. Copy `unraid-template.xml` to `/boot/config/plugins/dockerMan/templates-user/`
2. In Unraid, go to Docker → Add Container
3. Select "DuplicateVideoCleanup" from the template dropdown
4. Adjust paths as needed

## Usage

1. Open the web UI at `http://your-server:3000`
2. Enter the **Source Path** (where your videos are, e.g., `/media`)
3. Enter the **Cleanup Folder** (where duplicates will be moved, e.g., `/cleanup`)
4. Click **Scan for Duplicates**
5. Review the results - green rows are kept, red rows will be moved
6. Click **Move Duplicates** to move the duplicate files

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Web server port |
| `NODE_ENV` | `production` | Node environment |
| `TZ` | `America/New_York` | Timezone |

### Volume Mounts

| Container Path | Description |
|----------------|-------------|
| `/media` | Source video files (can be read-only) |
| `/cleanup` | Destination for duplicate files |

## How It Works

1. **Scan Phase:** Recursively finds all video files in the source directory
2. **Analysis Phase:** Extracts metadata (duration, resolution) using ffprobe
3. **Grouping Phase:** Groups videos with identical duration + resolution
4. **Results:** For each group, keeps the largest file and marks others as duplicates
5. **Move Phase:** Moves duplicates to cleanup folder, preserving directory structure

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scan` | Start a new scan |
| GET | `/api/scan/:id` | Get scan status/results |
| POST | `/api/move` | Move duplicate files |
| POST | `/api/validate-path` | Validate a directory path |
| GET | `/health` | Health check endpoint |

## Development

### Backend (Node.js/Express):
```bash
cd backend
npm install
npm run dev
```

### Frontend (React/Vite):
```bash
cd frontend
npm install
npm run dev
```

## License

MIT
