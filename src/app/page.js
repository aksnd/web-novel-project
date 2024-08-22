// src/app/page.js
"use client";

import { useEffect, useState } from 'react';

export default function Home() {
  const [novels, setNovels] = useState([]);

  useEffect(() => {
    const fetchNovels = async () => {
      try {
        const response = await fetch('/api/novels');
        const data = await response.json();
        setNovels(data);
      } catch (error) {
        console.error('Error fetching novels:', error);
      }
    };

    fetchNovels();
  }, []);

  return (
    <div>
      <h1>Top 5 Novels by Views</h1>
      <ul>
        {novels.map((novel) => (
          <li key={novel.id}>
            <h2>{novel.title}</h2>
            <p>Author: {novel.author}</p>
            <p>{novel.description}</p>
            <p>Views: {novel.views}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
