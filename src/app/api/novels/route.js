// src/app/api/novels/route.js
import { pool } from '../../../lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT * FROM novels ORDER BY views DESC LIMIT 5');
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
