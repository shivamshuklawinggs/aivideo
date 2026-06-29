# Webtoon Data Seeder

This seeder creates sample data for testing the AI Webtoon Explainer API.

## 🚀 Quick Start

### 1. Run the Seeder
```bash
npm run seed
```

### 2. What Gets Created

#### Users
- **demo@example.com** / password123
- **creator@example.com** / password123

#### Webtoons
1. **"The Adventure Begins"** - Action/Fantasy genre
2. **"Love in Tokyo"** - Romance/Drama genre

#### Sample Structure
Each webtoon contains:
- 2 chapters
- 5 panels per chapter (10 total panels)
- Generated AI explanation script
- Sample comic archive files

### 3. Test the API

After seeding, you can test the API:

```bash
# 1. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'

# 2. Get webtoons list
curl -X GET http://localhost:5000/api/webtoon-explainer/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 3. Upload new webtoon (using existing sample)
curl -X POST http://localhost:5000/api/webtoon-explainer/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "archive=@uploads/archives/webtoon_1.zip" \
  -F "title=My Test Webtoon"
```

## 📁 File Structure Created

```
uploads/
├── archives/
│   ├── webtoon_1.zip      # Sample comic archive
│   └── webtoon_2.zip
├── extracted/
│   ├── {webtoonId}/
│   │   ├── Chapter 1/
│   │   │   ├── panel_1.jpg
│   │   │   └── ...
│   │   └── Chapter 2/
└── thumbnails/
```

## 🗄️ Database Schema

### Users Collection
```json
{
  "_id": "...",
  "email": "demo@example.com",
  "username": "demouser",
  "name": "Demo User"
}
```

### Webtoons Collection
```json
{
  "_id": "...",
  "title": "The Adventure Begins",
  "description": "An exciting journey...",
  "author": "Demo Artist",
  "genres": ["action", "adventure", "fantasy"],
  "processingStatus": "completed",
  "totalChapters": 2,
  "metadata": {
    "totalPanels": 10,
    "averagePanelsPerChapter": 5
  }
}
```

### Chapters Collection
```json
{
  "_id": "...",
  "webtoonId": "...",
  "chapterNumber": 1,
  "title": "Chapter 1: The Journey Begins",
  "panelCount": 5,
  "processingStatus": "completed"
}
```

### Panels Collection
```json
{
  "_id": "...",
  "webtoonId": "...",
  "chapterId": "...",
  "panelNumber": 1,
  "imageUrl": "/api/webtoons/.../panels/1",
  "metadata": {
    "width": 800,
    "height": 600,
    "fileSize": 150000
  }
}
```

### Generated Scripts Collection
```json
{
  "_id": "...",
  "webtoonId": "...",
  "title": "The Adventure Begins - AI Explanation",
  "hook": "Have you ever wondered...",
  "summary": "An exciting adventure story...",
  "detailedExplanation": "This webtoon takes us on...",
  "scriptSegments": [...],
  "characters": [...],
  "keyEvents": [...]
}
```

## 🛠️ Customization

### Modify Sample Data

Edit `src/scripts/seedWebtoonData.ts`:

```typescript
// Change sample webtoons
const sampleWebtoons = [
  {
    title: 'Your Custom Title',
    description: 'Your description',
    author: 'Your Name',
    genres: ['your', 'genres'],
    tags: ['your', 'tags']
  }
];

// Change sample panel descriptions
const samplePanelDescriptions = [
  'Your custom panel description 1',
  'Your custom panel description 2'
];
```

### Add More Sample Images

The seeder creates 10 placeholder images. To add real images:

1. Place images in `sample-images/` directory
2. Name them: `panel_001.jpg`, `panel_002.jpg`, etc.
3. Run `npm run seed` again

## 🧹 Clean and Reseed

To clear all data and reseed:

```bash
# The seeder automatically clears existing data before seeding
npm run seed
```

## 🔍 Verification

After seeding, verify the data:

```bash
# Check database collections
# (Using MongoDB shell)
mongo webtoon-explainer
> db.users.find().pretty()
> db.webtoons.find().pretty()
> db.chapters.find().pretty()
> db.panels.find().pretty()
> db.generatedscripts.find().pretty()
```

## 📝 Notes

- Sample images are 1x1 pixel JPEG placeholders
- Archives contain real folder structure with dummy images
- All webtoons are marked as "completed" processing status
- Scripts contain sample AI-generated explanations
- Passwords are hashed using bcrypt

## 🚨 Troubleshooting

### MongoDB Connection Error
```bash
# Make sure MongoDB is running
mongod

# Check your .env MONGODB_URI
MONGODB_URI=mongodb://localhost:27017/webtoon-explainer
```

### Permission Errors
```bash
# Make sure uploads directory is writable
chmod -R 755 uploads/
```

### Missing Dependencies
```bash
npm install archiver uuid
```

## 🎯 Next Steps

1. Start the development server: `npm run dev`
2. Login with demo user
3. Test webtoon upload and processing
4. Generate voice explanations
5. Explore the API endpoints

The seeder provides a complete foundation for testing all features of the AI Webtoon Explainer API!
