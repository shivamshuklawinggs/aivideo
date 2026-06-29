# Webtoon Downloader Usage Guide

## Overview

The MangaFire webtoon downloader has been successfully integrated into the backend application. This service allows you to automatically download webtoons from MangaFire URLs without needing manual file uploads.

## API Endpoints

### 1. Get Webtoon Information
```http
GET /api/webtoon-downloader/info?url=<mangafire_url>
```

**Example:**
```bash
curl -X GET "http://localhost:5000/api/webtoon-downloader/info?url=https://mangafire.to/manga/one-piece" \
  -H "Authorization: Bearer <your_jwt_token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "webtoon": {
      "title": "One Piece",
      "description": "The legendary pirate adventure...",
      "author": "Eiichiro Oda",
      "genres": ["Action", "Adventure", "Comedy"],
      "coverImage": "https://...",
      "url": "https://mangafire.to/manga/one-piece"
    },
    "chapters": [
      {
        "number": 1,
        "title": "Romance Dawn",
        "url": "https://mangafire.to/read/one-piece-en-1",
        "releaseDate": "1997-07-22"
      }
    ]
  }
}
```

### 2. Download Webtoon
```http
POST /api/webtoon-downloader/download
```

**Body:**
```json
{
  "url": "https://mangafire.to/manga/one-piece",
  "chapters": [1, 2, 3], // Optional - download specific chapters
  "format": "zip", // Optional - "zip" or "cbz"
  "quality": "high", // Optional - "low", "medium", "high"
  "title": "Custom Title", // Optional - override title
  "description": "Custom Description", // Optional - override description
  "author": "Custom Author", // Optional - override author
  "genres": ["Action", "Adventure"] // Optional - override genres
}
```

**Example:**
```bash
curl -X POST "http://localhost:5000/api/webtoon-downloader/download" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -d '{
    "url": "https://mangafire.to/manga/one-piece",
    "chapters": [1, 2, 3],
    "format": "zip"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Webtoon downloaded successfully and processing started",
  "data": {
    "webtoonId": "64a1b2c3d4e5f6789012345",
    "title": "One Piece",
    "status": "pending",
    "chapters": {
      "total": 1000,
      "downloaded": 3
    },
    "archive": {
      "name": "One_Piece.zip",
      "size": 15728640
    }
  }
}
```

### 3. Check Download Status
```http
GET /api/webtoon-downloader/{webtoonId}/status
```

**Example:**
```bash
curl -X GET "http://localhost:5000/api/webtoon-downloader/64a1b2c3d4e5f6789012345/status" \
  -H "Authorization: Bearer <your_jwt_token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "webtoonId": "64a1b2c3d4e5f6789012345",
    "title": "One Piece",
    "processingStatus": "completed",
    "processingProgress": 100,
    "sourceType": "mangafire",
    "sourceUrl": "https://mangafire.to/manga/one-piece",
    "archiveDownloaded": true,
    "metadata": {
      "sourceInfo": {...},
      "totalSourceChapters": 1000,
      "downloadFormat": "zip",
      "downloadQuality": "high"
    }
  }
}
```

### 4. Retry Failed Download
```http
POST /api/webtoon-downloader/{webtoonId}/retry
```

**Example:**
```bash
curl -X POST "http://localhost:5000/api/webtoon-downloader/64a1b2c3d4e5f6789012345/retry" \
  -H "Authorization: Bearer <your_jwt_token>"
```

## Processing Workflow

1. **Download Status**: `downloading` - Webtoon is being downloaded from MangaFire
2. **Pending Status**: `pending` - Download completed, ready for AI processing
3. **Processing Status**: `processing` - AI is analyzing and generating explanations
4. **Completed Status**: `completed` - Full processing finished

## Error Handling

The downloader includes comprehensive error handling:

- **Network Errors**: Automatic retry with exponential backoff
- **Missing Chapters**: Continues with available chapters
- **Image Download Failures**: Logs errors but continues with other images
- **Archive Creation**: Validates archive integrity before completion

## File Storage

- **Temporary Files**: Stored in `/temp/` directory during download
- **Archives**: Stored in `/downloads/` directory
- **Cleanup**: Automatic cleanup of temporary files after processing

## Rate Limiting

- **Requests**: Limited to 10 requests per minute per IP
- **Concurrent Downloads**: Limited to prevent server overload
- **Chapter Limits**: Optional chapter selection to manage download size

## Integration with Webtoon Explainer

Downloaded webtoons automatically integrate with the existing AI explanation workflow:

1. Download completes → Archive created
2. Archive processed → Chapters extracted
3. AI analysis → Explanations generated
4. Results stored → Available via existing endpoints

## Troubleshooting

### Common Issues

1. **"Webtoon not found"**
   - Check if the MangaFire URL is valid and accessible
   - Verify the webtoon hasn't been removed or region-locked

2. **"No images found in chapter"**
   - Some chapters may be unavailable or require login
   - Try downloading different chapters

3. **"Download failed"**
   - Check network connectivity
   - Verify MangaFire is accessible from your server
   - Try retrying the download

### Logs

Check the application logs for detailed error information:
```bash
# Check downloader logs
tail -f logs/combined.log | grep "MangaFire"
```

## Security Notes

- All downloads require valid JWT authentication
- File size limits are enforced to prevent abuse
- Temporary files are automatically cleaned up
- Rate limiting prevents excessive requests

## Performance Considerations

- Large webtoons (100+ chapters) may take several minutes to download
- Image quality affects download size and time
- Concurrent downloads are limited to preserve server performance
- Archives are compressed to optimize storage space
