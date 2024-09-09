// src/app/api/novels/route.js


const db = require('../../../db/db'); // 데이터베이스 연결 모듈
export async function GET() {
  try {
    const [rows] = await db.query('SELECT * FROM novels');
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
