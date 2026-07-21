import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import User from '../models/User';

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
      await this.createUsers();
      console.log('🎉 Seeding completed successfully!');
      console.log('\n📊 Created:');
      console.log(`- ${sampleUsers.length} users`);
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


}

// Run seeder
if (require.main === module) {
  const seeder = new WebtoonSeeder();
  seeder.seed().catch(console.error);
}

export default WebtoonSeeder;
