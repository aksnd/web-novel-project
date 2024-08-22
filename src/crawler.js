const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const db = require('./lib/db'); // 데이터베이스 연결 모듈

// 랜덤 대기 시간을 추가하는 함수
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 목록 페이지의 URL을 설정합니다.
// 실제 페이지 URL로 변경하세요.
const LIST_URL = 'https://page.kakao.com/menu/10011/screen/94';

const fetchNovelLinks = async () => {
  try {
    const { data } = await axios.get(LIST_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const $ = cheerio.load(data);

    // 이미지 클릭으로 이동하는 링크를 추출합니다.
    const novelLinks = [];

    const eightDigitRegex = /\d{8}$/;

    // 이미지 링크를 포함한 부모 요소의 링크를 추출
    $('.w-full.overflow-hidden a').each((index, element) => {
      const link = $(element).attr('href');
      if (link) {
        if (eightDigitRegex.test(link)) {
            novelLinks.push(link.startsWith('http') ? link : `https://page.kakao.com${link}`);
          }
      }
    });

    return novelLinks;
  } catch (error) {
    console.error('Error fetching novel links:', error);
  }
};

const fetchNovelData = async (url) => {
  console.log(url);
  let browser;
  try {
    // Puppeteer 브라우저를 시작합니다.
    browser = await puppeteer.launch({ headless: true }); // headless: true로 설정하여 브라우저를 표시하지 않습니다.
    const page = await browser.newPage();
    
    // 페이지를 엽니다.
    await page.goto(url, { waitUntil: 'networkidle2' });

    // 페이지에서 특정 클래스의 div를 찾습니다.
    const novelData = await page.evaluate(() => {
      // 데이터 추출을 위한 HTML 구조를 정의합니다.
      const parentDiv = document.querySelector('.relative.px-18pxr.text-center.bg-bg-a-20.mt-24pxr');
      if (!parentDiv) return { title: null, author: null };

      // 그 내부의 또 다른 특정 div를 찾습니다.
      const targetDiv = parentDiv.querySelector('.flex.flex-col');
      if (!targetDiv) return { title: null, author: null };

      // 첫 번째, 두 번째 자식 요소를 각각 선택합니다.
      const title = targetDiv.children[0]?.textContent.trim() || '';
      const author = targetDiv.children[1]?.textContent.trim() || '';

      // 추출한 데이터를 객체로 반환합니다.
      return {title, author};
    });

    console.log(novelData);
    await saveNovelToDB(novelData);
    return novelData;

  } catch (error) {
    console.error(`Error fetching novel data from ${url}:`, error);
    return null;
  } finally {
    // 브라우저를 종료합니다.
    if (browser) {
      await browser.close();
    }
  }
};

const fetchAllNovelsData = async () => {
  const novelLinks = await fetchNovelLinks(); // 이전에 구현한 fetchNovelLinks 함수 호출
  const novels = [];

  for (const link of novelLinks) {
    
    const novelData = await fetchNovelData(link); // 각 링크에서 소설 데이터 추출
    if (novelData) {
      novels.push(novelData); // 유효한 데이터만 추가
    }
    const waitTime = Math.floor(Math.random() * 2000) + 1000;
    console.log(`Waiting for ${waitTime} ms...`);
    await wait(waitTime);

  }

  return novels;
};

const saveNovelToDB = async (novelData) => {
  const { title, author } = novelData;
  if (!title || !author) return; // 데이터가 없으면 저장하지 않음

  try {
    // SQL 쿼리 작성
    const query = 'INSERT INTO novels (title, author) VALUES (?, ?)';
    
    // 쿼리 실행
    const [result] = await db.query(query, [title, author]);

    console.log('Novel saved to database with ID:', result.insertId);
  } catch (error) {
    console.error('Error saving novel to database:', error);
  }
};


fetchAllNovelsData().then(novels => {
  console.log('Novels Data:', novels);
});