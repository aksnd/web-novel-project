const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const db = require('./lib/db'); // 데이터베이스 연결 모듈

// 랜덤 대기 시간을 추가하는 함수
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 목록 페이지의 URL을 설정합니다.
// 실제 페이지 URL로 변경하세요.
const LIST_URL = 'https://page.kakao.com/menu/10011/screen/94';

const fetchNovelLinks = async () => { //List_URL로 접속하여, 접속할 링크들을 찾아주는 함수
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
            novelLinks.push(link.startsWith('http') ? link : `https://page.kakao.com${link}?tab_type=about`);
          }
      }
    });

    return novelLinks;
  } catch (error) {
    console.error('Error fetching novel links:', error);
  }
};

const fetchNovelData = async (url) => { //url을 받아서 필요한 정보를 크롤링 해오는 함수
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
      if (!parentDiv) return { title:null, author:null, category:null, views:null, description:null, tags: null};

      // 그 내부의 또 다른 특정 div를 찾습니다.
      const titleTargetDiv = parentDiv.querySelector('.flex.flex-col');
      if (!titleTargetDiv) return { title:null, author:null, category:null, views:null, description:null, tags: null};

      // 첫 번째, 두 번째 자식 요소를 각각 선택합니다.
      const title = titleTargetDiv.children[0]?.textContent.trim() || '';
      const author = titleTargetDiv.children[1]?.textContent.trim() || ''; //제목, 작가 얻음.

      const categoryTargetDiv = parentDiv.querySelectorAll('.break-all.align-middle');
      if(!categoryTargetDiv) return { title, author, category:null, views:null, description:null, tags: null};

      const category = categoryTargetDiv[1].textContent.trim();

      const viewsDiv = parentDiv.querySelectorAll('.text-el-70.opacity-70');
      if(!viewsDiv) return { title, author, category, views:null, description:null, tags: null};
      const views = viewsDiv[2].textContent.trim();

      const descriptionDiv = document.querySelector('.font-small1.mb-8pxr.block.whitespace-pre-wrap.break-words.text-el-70');
      if(!descriptionDiv) return { title, author, category, views, description:null, tags: null};
      const description = descriptionDiv.textContent.trim();

      const tagsDiv = document.querySelectorAll('.font-small2-bold.text-ellipsis.text-el-70.line-clamp-1');
      if(!tagsDiv) return {title, author, category, views, description, tags: null};
      const tags = Array.from(tagsDiv).map(tag => tag.textContent.trim());
      // 추출한 데이터를 객체로 반환합니다.
      return {title, author, category, views, description, tags};
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

function viewsToInt(viewsStr) {
  // 단위에 따른 곱셈 값 설정
  const units = {
      '만': 10000,
      '억': 100000000
  };

  // 문자열에서 숫자와 단위를 분리
  const regex = /^([\d,.]+)([만억]?)$/;
  const match = viewsStr.match(regex);

  if (match) {
      // 숫자 부분을 가져오고 ',' 제거
      let number = parseFloat(match[1].replace(/,/g, ''));
      // 단위를 가져옴
      let unit = match[2];

      // 단위가 있으면 곱셈
      if (unit && units[unit]) {
          number *= units[unit];
      }

      return number;
  }

  // 잘못된 형식의 경우
  return null;
}


const fetchAllNovelsData = async () => { // main 함수
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

const saveNovelToDB = async (novelData) => { //DB에 정보 값들을 넣어주는 함수
  const {title, author, category, views, description, tags} = novelData;
  if (!title || !author || !category ||!views ||!description ||!tags) return; // 데이터가 없으면 저장하지 않음

  intViews = viewsToInt(views);

  try {
    // 먼저 제목과 작가로 기존 데이터가 있는지 확인
    const selectQuery = 'SELECT id FROM novels WHERE title = ? AND author = ?';
    const [rows] = await db.query(selectQuery, [title, author]);

    if (rows.length > 0) {
      // 이미 존재하는 경우, 업데이트 수행
      const updateQuery = `
        UPDATE novels
        SET category = ?, views = ?, description = ?
        WHERE id = ?
      `;
      const [result] = await db.query(updateQuery, [category, intViews, description, rows[0].id]);

      console.log('Novel updated in database with ID:', rows[0].id);
    } else {
      // 존재하지 않는 경우, 새로 삽입
      const insertQuery = `
        INSERT INTO novels (title, author, category, views, description)
        VALUES (?, ?, ?, ?, ?)
      `;
      const [result] = await db.query(insertQuery, [title, author, category, intViews, description]);

      console.log('Novel saved to database with ID:', result.insertId);
    }
  } catch (error) {
    console.error('Error saving or updating novel in database:', error);
  }
};


fetchAllNovelsData().then(novels => {
  console.log('Novels Data:', novels);
});