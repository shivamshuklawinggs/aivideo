const axios = require('axios');
const cheerio = require('cheerio');

async function testMangaFireDownloader() {
  try {
    console.log('Testing MangaFire downloader...');
    
    const testUrl = 'https://mangafire.to/manga/revival-mann.zl4ww';
    
    console.log(`Fetching: ${testUrl}`);
    
    const response = await axios.get(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 30000
    });
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response headers:`, error.response.headers);
    }
  }
}

testMangaFireDownloader();
