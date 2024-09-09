const puppeteer = require('puppeteer');

const db = require('../db/db'); // 데이터베이스 연결 모듈

// 랜덤 대기 시간을 추가하는 함수
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 목록 페이지의 URL을 설정합니다.
// 실제 페이지 URL로 변경하세요.
const LIST_URL = 'https://page.kakao.com/menu/10011/screen/94';

const fetchNovelLinks = async (browser) => { //List_URL로 접속하여, 접속할 링크들을 찾아주는 함수
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

  await page.goto(LIST_URL, { waitUntil: 'networkidle2' });

  const autoScroll = async () => {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100; // 스크롤 할 거리
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100); // 100ms마다 스크롤
      });
    });
  };
  await autoScroll();


  const novelLinks = await page.evaluate(() => {
    const links = [];
    const eightDigitRegex = /\d{8}$/;

    // '.w-full.overflow-hidden a' 셀렉터를 가진 링크 추출
    document.querySelectorAll('.w-full.overflow-hidden a').forEach(element => {
      const link = element.getAttribute('href');
      if (link && eightDigitRegex.test(link)) {
        links.push(link.startsWith('http') ? link : `https://page.kakao.com${link}?tab_type=about`);
      }
    });

    return links;
  });
  return novelLinks;

};

const fetchNovelData = async (url,browser) => { //url을 받아서 필요한 정보를 크롤링 해오는 함수
  console.log(url);
  try {
    // Puppeteer 브라우저를 시작합니다.
    
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
    await page.close();
    await saveNovelToDB(novelData);
    return novelData;

  } catch (error) {
    console.error(`Error fetching novel data from ${url}:`, error);
    return null;
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
  
  const novels = [];
  const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']}) //linux 버전
    //browser = await puppeteer.launch({ headless: true }); // 윈도우 버전 
  const novelLinks = await fetchNovelLinks(browser); // 이전에 구현한 fetchNovelLinks 함수 호출
  console.log(novelLinks.length);

  for (const link of novelLinks) {
    
    const novelData = await fetchNovelData(link,browser); // 각 링크에서 소설 데이터 추출
    if (novelData) {
      novels.push(novelData); // 유효한 데이터만 추가
    }
    const waitTime = Math.floor(Math.random() * 2000) + 1000;
    await wait(waitTime);

  }
  await browser.close();

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
    let novelId;
    if (rows.length > 0) {
      // 이미 존재하는 경우, 업데이트 수행
      const updateQuery = `
        UPDATE novels
        SET category = ?, views = ?, description = ?
        WHERE id = ?
      `;
      const [result] = await db.query(updateQuery, [category, intViews, description, rows[0].id]);
      novelId = rows[0].id;
      console.log('Novel updated in database with ID:', novelId);
    } else {
      // 존재하지 않는 경우, 새로 삽입
      const insertQuery = `
        INSERT INTO novels (title, author, category, views, description)
        VALUES (?, ?, ?, ?, ?)
      `;
      const [result] = await db.query(insertQuery, [title, author, category, intViews, description]);
      novelId = result.insertId;
      console.log('Novel saved to database with ID:', novelId);
      
    }
    //태그 삽입
    for (let tag of tags) {
      if (!tag.startsWith('#')) continue; // 태그가 '#'으로 시작하는지 확인

      // '#' 문자를 제거한 태그명
      const tagName = tag.substring(1).trim(); // '#'을 제거하고 공백을 제거합니다.

      // 태그가 존재하는지 확인
      const selectTagQuery = 'SELECT id FROM tags WHERE name = ?';
      const [tagRows] = await db.query(selectTagQuery, [tagName]);

      let tagId;
      if (tagRows.length > 0) {
        // 이미 존재하는 경우 해당 태그의 id를 가져옴
        tagId = tagRows[0].id;
      } else {
        // 존재하지 않는 경우 새로 삽입
        const insertTagQuery = 'INSERT INTO tags (name) VALUES (?)';
        const [insertTagResult] = await db.query(insertTagQuery, [tagName]);
        tagId = insertTagResult.insertId;
      }

      // novel_tags 테이블에 소설과 태그의 관계를 삽입
      const checkNovelTagQuery = 'SELECT * FROM novel_tags WHERE novel_id = ? AND tag_id = ?';
      const [novelTagRows] = await db.query(checkNovelTagQuery, [novelId, tagId]);

      if (novelTagRows.length === 0) {
        // 중복되지 않는 경우, novel_tags 테이블에 관계 삽입
        const insertNovelTagQuery = 'INSERT INTO novel_tags (novel_id, tag_id) VALUES (?, ?)';
        await db.query(insertNovelTagQuery, [novelId, tagId]);
      }

    }
  } catch (error) {
    console.error('Error saving or updating novel in database:', error);
  }
};


fetchAllNovelsData().then(novels => {
  console.log('Novels Data:', novels);
});