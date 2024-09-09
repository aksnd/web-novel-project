// src/app/api/recommendations/route.js
import { getSimilarNovels } from '../../../utils/tfexample';

export async function GET(request) {
  const url = new URL(request.url);
  const novelId = Number(url.searchParams.get('novelId'));
  
  const recommendations = await getSimilarNovels(novelId);
  
  return new Response(JSON.stringify(recommendations), {
    headers: { 'Content-Type': 'application/json' },
  });
}
