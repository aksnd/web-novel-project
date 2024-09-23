# Web-novel-project

## 프로젝트 소개

---

Web-novel-project는 웹소설의 정보를 크롤링 하여, 소설을 선택하면 해당 소설과 유사한 소설을 추천해주는 프로그램입니다.
카카오페이지에도 해당 기능이 있으나, 어째서인지 어떤 소설에만 적용이 되어있고, 대부분의 소설에는 적용되어있지 않아 개발하게 되었습니다.

## 개발 환경

---
언어 : Next.js(Front, back 통합) -> Django+React로 변경 중 - 사유: python기반 coding 필요

DB: MySQL 

버전 관리 : Git

### 페이지 화면
![스크린샷 2024-09-23 221627](https://github.com/user-attachments/assets/08924400-5fa6-49db-80d2-2214351ca333)

디자인 적인 부분은 아직 구현하지 않았으며, 추후 사진 및 링크도 크롤링하여 front에 전달 요함.


## 주요 기능

# 크롤링

web-novel-project/src/utils/crawler.js
~~~

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
~~~
카카오 페이지 TOP 300 링크를 통해 TOP300개의 웹소설 링크를 얻어낸 뒤, 그 링크로 접속하여 각 소설의 내용에 접속
거기서 puppeteer을 통한 크롤링-> 제목 작가 조회수 태그등 가져옴.

# TF-IDF
/home/ubuntu/web-novel-project/src/utils/tfexample.js
각 태그를 기반으로 한 TF-IDF vector를 프로그램 시작할 때 제작한 뒤, 특정 소설에 대한 조회가 요청될 경우 각 vector별 cosine 유사도 값으로 가장 유사한 5개 소설 반환

### 앞으로의 개발 진행 과정(예정)
1. 추후 description 이용을 위한 word2Vec기능을 넣을 예정이고, 그 외 AI기능도 사용하기 위해서 backend django 이전 준비중
2. front 상에서의 가독성을 위한 이미지 크롤링 및 해당 이미지 AWS S3 이용 예정, 또한 링크역시 크롤링 하여 연결 예정
3. 여러개의 웹소설을 가지고 해당 웹소설들과 유사한 웹소설 추천하는 과정을 만들 예정
4. 타 사이트 및 웹툰까지 연결하는 과정 생각하는 중
