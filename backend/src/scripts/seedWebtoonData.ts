import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import User from '../models/User';
import Webtoon from '../models/Webtoon';
import Chapter from '../models/Chapter';
import Panel from '../models/Panel';
import GeneratedScript from '../models/GeneratedScript';

// Sample data
const sampleUsers = [
  {
    email: 'demo@example.com',
    password: 'password123',
    username: 'demouser',
    name: 'Demo User'
  },
  {
    email: 'creator@example.com',
    password: 'password123',
    username: 'creator',
    name: 'Content Creator'
  }
];

const sampleWebtoons = [
  {
    title: 'The Adventure Begins',
    description: 'An exciting journey of a young hero discovering their powers',
    author: 'Demo Artist',
    genres: ['action', 'adventure', 'fantasy'],
    tags: ['hero', 'magic', 'journey']
  },
  {
    title: 'Love in Tokyo',
    description: 'A romantic story set in the bustling streets of Tokyo',
    author: 'Romance Creator',
    genres: ['romance', 'drama', 'slice-of-life'],
    tags: ['romance', 'tokyo', 'relationships']
  }
];

// Sample panel descriptions for AI script generation
const samplePanelDescriptions = [
  'A young hero stands on a cliff overlooking a vast kingdom',
  'The hero discovers an ancient glowing sword in a cave',
  'A mysterious figure appears in the shadows',
  'The hero practices sword fighting in a training ground',
  'A dramatic sunset scene with the hero contemplating their journey',
  'The hero meets a wise old mentor',
  'An intense battle scene with magical effects',
  'The hero discovers their hidden powers',
  'A peaceful village scene before the adventure begins',
  'The hero says goodbye to their family'
];

class WebtoonSeeder {
  private uploadsDir: string;
  private sampleImagesDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.sampleImagesDir = path.join(process.cwd(), 'sample-images');
  }

  async seed() {
    try {
      console.log('🌱 Starting webtoon data seeding...');

      // Connect to database
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/webtoon-explainer');
      console.log('✅ Connected to database');

      // Clear existing data
      await this.clearDatabase();

      // Create directories
      await this.createDirectories();

      // Create sample images
      await this.createSampleImages();

      // Create users
      const users = await this.createUsers();

      // Create webtoons with sample archives
      for (let i = 0; i < sampleWebtoons.length; i++) {
        const webtoon = await this.createWebtoonWithArchive(users[0], sampleWebtoons[i], i);
        await this.createChaptersAndPanels(webtoon, users[0]);
        await this.createGeneratedScript(webtoon, users[0]);
      }

      console.log('🎉 Seeding completed successfully!');
      console.log('\n📊 Created:');
      console.log(`- ${sampleUsers.length} users`);
      console.log(`- ${sampleWebtoons.length} webtoons`);
      console.log('- Multiple chapters and panels');
      console.log('- Generated scripts with AI explanations');
      
      console.log('\n🔑 Login credentials:');
      console.log('Email: demo@example.com');
      console.log('Password: password123');

    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      await mongoose.disconnect();
    }
  }

  private async clearDatabase() {
    console.log('🧹 Clearing existing data...');
    await GeneratedScript.deleteMany({});
    await Panel.deleteMany({});
    await Chapter.deleteMany({});
    await Webtoon.deleteMany({});
    await User.deleteMany({});
  }

  private async createDirectories() {
    const dirs = [
      this.uploadsDir,
      this.sampleImagesDir,
      path.join(this.uploadsDir, 'archives'),
      path.join(this.uploadsDir, 'extracted'),
      path.join(this.uploadsDir, 'thumbnails')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private async createSampleImages() {
    console.log('🎨 Creating sample images...');
    
    // Create sample image files (placeholder images)
    for (let i = 1; i <= 10; i++) {
      const imagePath = path.join(this.sampleImagesDir, `panel_${i.toString().padStart(3, '0')}.jpg`);
      
      // Create a simple placeholder image (1x1 pixel JPEG)
      const placeholderBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
      ]);
      
      fs.writeFileSync(imagePath, placeholderBuffer);
    }
    
    console.log('✅ Created 10 sample panel images');
  }

  private async createUsers() {
    console.log('👥 Creating users...');
    const users = [];

    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword,
        isEmailVerified: true
      });
      await user.save();
      users.push(user);
    }

    console.log(`✅ Created ${users.length} users`);
    return users;
  }

  private async createWebtoonWithArchive(user: any, webtoonData: any, index: number) {
    console.log(`📚 Creating webtoon: ${webtoonData.title}`);

    // Create sample archive
    const archiveName = `webtoon_${index + 1}.zip`;
    const archivePath = path.join(this.uploadsDir, 'archives', archiveName);
    await this.createSampleArchive(archivePath, index);

    // Create webtoon record
    const webtoon = new Webtoon({
      ...webtoonData,
      userId: user._id,
      archiveFileName: archiveName,
      archiveFilePath: archivePath,
      archiveFileSize: fs.statSync(archivePath).size,
      processingStatus: 'completed',
      processingProgress: 100,
      totalChapters: 2,
      isProcessed: true,
      metadata: {
        totalPanels: 10,
        averagePanelsPerChapter: 5,
        estimatedReadTime: 15
      }
    });

    await webtoon.save();
    console.log(`✅ Created webtoon: ${webtoon.title}`);
    return webtoon;
  }

  private async createSampleArchive(archivePath: string, webtoonIndex: number) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(archivePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(undefined));
      archive.on('error', reject);

      archive.pipe(output);

      // Add chapters with panels
      for (let chapterNum = 1; chapterNum <= 2; chapterNum++) {
        const chapterDir = `Chapter ${chapterNum}/`;
        
        // Add chapter info file
        archive.append(
          `Chapter ${chapterNum}\nWebtoon ${webtoonIndex + 1}\n`,
          { name: `${chapterDir}chapter_info.txt` }
        );

        // Add panels to chapter
        const startPanel = (chapterNum - 1) * 5 + 1;
        for (let panelNum = 0; panelNum < 5; panelNum++) {
          const panelIndex = startPanel + panelNum;
          const imagePath = path.join(this.sampleImagesDir, `panel_${panelIndex.toString().padStart(3, '0')}.jpg`);
          
          if (fs.existsSync(imagePath)) {
            archive.append(fs.createReadStream(imagePath), {
              name: `${chapterDir}panel_${panelNum + 1}.jpg`
            });
          }
        }
      }

      archive.finalize();
    });
  }

  private async createChaptersAndPanels(webtoon: any, user: any) {
    console.log('📖 Creating chapters and panels...');

    for (let chapterNum = 1; chapterNum <= 2; chapterNum++) {
      // Create chapter
      const chapter = new Chapter({
        webtoonId: webtoon._id,
        userId: user._id,
        chapterNumber: chapterNum,
        title: `Chapter ${chapterNum}: The Journey Begins`,
        description: `Chapter ${chapterNum} of our exciting adventure`,
        sequence: chapterNum,
        panelCount: 5,
        processingStatus: 'completed',
        isProcessed: true
      });

      await chapter.save();

      // Create panels for chapter
      for (let panelNum = 0; panelNum < 5; panelNum++) {
        const panel = new Panel({
          chapterId: chapter._id,
          webtoonId: webtoon._id,
          userId: user._id,
          panelNumber: panelNum + 1,
          sequence: panelNum + 1,
          imageUrl: `/api/webtoons/${webtoon._id}/chapters/${chapter._id}/panels/${panelNum + 1}`,
          imagePath: `/uploads/extracted/${webtoon._id}/Chapter ${chapterNum}/panel_${panelNum + 1}.jpg`,
          thumbnailUrl: `/api/webtoons/${webtoon._id}/chapters/${chapter._id}/thumbnails/${panelNum + 1}`,
          metadata: {
            width: 800,
            height: 600,
            fileSize: 150000,
            format: 'jpeg',
            aspectRatio: 1.33
          },
          isProcessed: true
        });

        await panel.save();
      }

      console.log(`✅ Created Chapter ${chapterNum} with 5 panels`);
    }
  }

  private async createGeneratedScript(webtoon: any, user: any) {
    console.log('📝 Creating generated script...');

    // Create sample script segments
    const scriptSegments = [];
    for (let i = 0; i < 10; i++) {
      scriptSegments.push({
        panelId: new mongoose.Types.ObjectId(), // Placeholder ID
        panelNumber: i + 1,
        narration: samplePanelDescriptions[i],
        duration: 5.0,
        startTime: i * 5.0,
        endTime: (i + 1) * 5.0
      });
    }

    const script = new GeneratedScript({
      userId: user._id,
      webtoonId: webtoon._id,
      title: `${webtoon.title} - AI Explanation`,
      summary: `An exciting adventure story about a hero's journey to discover their true destiny.`,
      detailedExplanation: `This webtoon takes us on an incredible journey following a young hero who discovers their hidden powers. Through beautifully illustrated panels, we witness their transformation from an ordinary person to a legendary hero. The story explores themes of courage, friendship, and self-discovery.`,
      hook: "Have you ever wondered what it takes to become a hero? Join us as we explore this amazing webtoon that shows the journey of a lifetime!",
      ending: "And that's why this webtoon is absolutely worth reading! It reminds us that heroes are made, not born, and that the greatest adventures begin with a single step.",
      scriptSegments,
      metadata: {
        totalDuration: 50.0,
        wordCount: 450,
        estimatedVideoLength: 55.0,
        tone: 'engaging',
        style: 'narrative'
      },
      characters: [
        {
          name: 'Hero',
          description: 'The main protagonist discovering their powers',
          appearances: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        },
        {
          name: 'Mentor',
          description: 'Wise old guide helping the hero',
          appearances: [6, 7]
        }
      ],
      keyEvents: [
        {
          event: 'Hero discovers the sword',
          panelNumbers: [2],
          importance: 'high'
        },
        {
          event: 'First battle',
          panelNumbers: [7],
          importance: 'high'
        },
        {
          event: 'Power awakening',
          panelNumbers: [8],
          importance: 'high'
        }
      ],
      emotions: [
        {
          emotion: 'excitement',
          intensity: 8,
          panelNumbers: [2, 7, 8]
        },
        {
          emotion: 'determination',
          intensity: 7,
          panelNumbers: [4, 5, 9]
        }
      ],
      status: 'approved',
      version: 1
    });

    await script.save();
    console.log('✅ Created generated script with AI explanation');
  }
}

// Run seeder
if (require.main === module) {
  const seeder = new WebtoonSeeder();
  seeder.seed().catch(console.error);
}

export default WebtoonSeeder;
