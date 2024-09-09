// src/components/novelSelectDropdown.js
import React, { useState, useEffect } from 'react';
import Select from 'react-select';


export default function NovelSelect({ onSelect }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    async function fetchNovels() {
      const res = await fetch('/api/novels'); // 전체 소설 목록을 가져오는 API
      const novels = await res.json();
      const options = novels.map(novel => ({
        value: novel.id,
        label: novel.title,
      }));
      setOptions(options);
    }

    fetchNovels();
  }, []);

  const customStyles = {
    container: (provided) => ({
      ...provided,
      width: '100%',
      maxWidth: '500px',
      margin: '0 auto',
    }),
    control: (provided) => ({
      ...provided,
      height: '40px', // 높이 설정
      minHeight: '40px',
      fontSize: '16px', // 폰트 크기 설정
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999, // 메뉴가 다른 요소 위에 오도록 설정
    }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: '16px',
    }),
  };

  return (
    <Select
      options={options}
      onChange={option => onSelect(option)}
      placeholder="Select a novel..."
      styles={customStyles} // 커스텀 스타일 적용
    />
  );
}
