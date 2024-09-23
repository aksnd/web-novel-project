// src/app/api/novels/route.js


const db = require('../../../db/db'); // 데이터베이스 연결 모듈
export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT 
          novels.*,
          GROUP_CONCAT(tags.name SEPARATOR ' ') AS tags
      FROM 
          novels
      INNER JOIN 
          novel_tags ON novels.id = novel_tags.novel_id
      INNER JOIN 
          tags ON novel_tags.tag_id = tags.id
      GROUP BY 
          novels.id
    `);
    //태그가 없는 소설들의 경우, db에 있어도 검색이 불가능하기에 가져오지 않았음.
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching novels:', error);
    return new Response(JSON.stringify({ message: 'Error fetching novels', error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
