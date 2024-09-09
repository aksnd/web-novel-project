// src/app/page.js
"use client";

// src/app/recommendations/page.js
import React, { useState } from 'react';
import NovelSelectDropdown from '../components/NovelSelectDropdown';

export default function RecommendationsPage() {
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  async function handleSelect(novel) {
    setSelectedNovel(novel);

    const res = await fetch(`/api/recommendations?novelId=${novel.value}`);
    const data = await res.json();
    setRecommendations(data);
  }

  return (
    <div>
      <h1>Find Similar Novels</h1>
      <NovelSelectDropdown onSelect={handleSelect} />

      {selectedNovel && (
        <div>
          <h2>Recommendations for "{selectedNovel.label}"</h2>
          <div>
            {recommendations.map(recommendation => (
              <div>
                <h3>{recommendation.novel.title}</h3>
                <h3>{recommendation.similarity}</h3>
                <p>{recommendation.novel.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

