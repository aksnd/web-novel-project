const cosineSimilarity = require('cosine-similarity');

const db = require('../db/db'); // 데이터베이스 연결 모듈

let novels = null;
let vectors = null;

async function fetchNovelsAndTags() {
    const [rows] = await db.query(`
        SELECT 
            novels.id,
            novels.title,
            novels.author,
            novels.description,
            novels.category,
            novels.views,
            GROUP_CONCAT(tags.name SEPARATOR ' ') AS tags
        FROM 
            novels
        JOIN 
            novel_tags ON novels.id = novel_tags.novel_id
        JOIN 
            tags ON novel_tags.tag_id = tags.id
        GROUP BY 
            novels.id;
    `);

    // tags를 문자열에서 배열로 변환
    const processedRows = rows.map(row => {
        // tags를 공백으로 분리하여 배열로 변환
        const tagsArray = row.tags ? row.tags.split(' ') : [];
        return {
            ...row,
            tags: tagsArray
        };
    });

    return processedRows;
}
// IDF 계산
function computeIDF(tagDocumentCount, totalDocuments) {
    const idf = {};
    for (const tag in tagDocumentCount) {
        idf[tag] = Math.log(totalDocuments / (1 + tagDocumentCount[tag]));
    }
    return idf;
}

// TF-IDF 벡터 생성
function createTfIdfVector(tags, idf) {
    const vector = {};
    tags.forEach(tag => {
        vector[tag] = idf[tag];
    });
    return vector;
}

// Cosine Similarity 계산
function computeCosineSimilarity(vectorA, vectorB) {
    const commonTags = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);
    const vecA = [];
    const vecB = [];
    commonTags.forEach(tag => {
        vecA.push(vectorA[tag] || 0);
        vecB.push(vectorB[tag] || 0);
    });

    return cosineSimilarity(vecA, vecB);
}

async function createNovelVectors(){
    
    novels = await fetchNovelsAndTags();
    console.log(novels.slice(100, 140));
    const tagDocumentCount = {}; //각 태그별 나오는 개수
    const totalDocuments = novels.length; // 총 소설 개수
    
    novels.forEach(novel => {
        const uniqueTags = new Set(novel.tags);
        uniqueTags.forEach(tag => {
            if (!tagDocumentCount[tag]) {
                tagDocumentCount[tag] = 0;
            }
            tagDocumentCount[tag]++;
        });
    });
    
    const idf = computeIDF(tagDocumentCount, totalDocuments);

        // 각 소설의 TF-IDF 벡터 생성
    vectors = novels.map(novel => ({
        id: novel.id,
        vector: createTfIdfVector(novel.tags, idf)
    }));
    
}
// 유사도 계산
export async function getSimilarNovels(targetId, topN = 5) {
    
    if(novels==null || vectors==null){
        await createNovelVectors();
    }
    const targetVector = vectors.find(v => v.id === targetId).vector;
    

    return vectors.map(v => {
        if (v.id !== targetId) {
            const similarity = computeCosineSimilarity(targetVector, v.vector);
            return {
                novel: novels.find(n => n.id === v.id),
                similarity: similarity
            };
        }
        return null;
    }).filter(result => result !== null)
      .sort((a, b) => b.similarity - a.similarity) // 유사도 기준으로 내림차순 정렬
      .slice(0, topN); // 상위 N개 선택
}
// 데이터베이스에서 가져온 예제 태그와 소설 데이터

/*
async function main() {
    try {
        // 예제: targetId 소설과 다른 소설 간의 유사도 계산
        const targetId = 45;
        const recommendations = await getSimilarNovels(targetId);
        const targetNovel = novels.find(novel => novel.id === targetId);

        // 추천 결과 출력
        console.log("Recommendations for Novel Title:", targetNovel.title);
        recommendations.forEach(recommendation => {
        console.log(`Novel ID: ${recommendation.novel.title}, Similarity: ${recommendation.similarity}`);
        });

    } catch (error) {
        console.error('Error recommending novels:', error);
    }
}

main();*/

