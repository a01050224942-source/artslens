"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import Link from "next/link";

export default function Home() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const gridRef = useRef(null); // 그리드 섹션으로 이동하기 위한 참조

  useEffect(() => {
    const fetchArtworks = async () => {
      const artCollection = collection(db, "artworks");
      const artSnapshot = await getDocs(artCollection);
      const artList = artSnapshot.docs.map(doc => doc.data());
      setArtworks(artList);
      setLoading(false);
    };
    fetchArtworks();
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : artworks.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < artworks.length - 1 ? prev + 1 : 0));
  };

  const scrollToGrid = () => {
    gridRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 3D 스타일 계산 함수
  const getCardStyle = (index) => {
    const offset = index - currentIndex;
    let adjustedOffset = offset;
    const halfLength = Math.floor(artworks.length / 2);
    if (offset > halfLength) adjustedOffset -= artworks.length;
    if (offset < -halfLength) adjustedOffset += artworks.length;

    const absOffset = Math.abs(adjustedOffset);
    const sign = Math.sign(adjustedOffset);

    if (absOffset > 2) return { opacity: 0, pointerEvents: 'none', zIndex: -1 };

    const translateX = adjustedOffset * 120; 
    const translateZ = absOffset * -200; 
    const rotateY = sign * -45; 

    return {
      transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
      zIndex: 10 - absOffset,
      opacity: absOffset === 0 ? 1 : 0.5,
      filter: absOffset === 0 ? 'none' : 'blur(1px)',
      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <div className="animate-pulse">미술관 입장 중...</div>
    </div>
  );

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans scroll-smooth">
      
      {/* SECTION 1: 3D Hero Carousel */}
      <section className="h-screen flex flex-col items-center justify-center relative overflow-hidden border-b border-gray-800">
        <header className="absolute top-10 text-center z-20">
          <h1 className="text-5xl font-extrabold tracking-tighter mb-2">ArtLens</h1>
          <p className="text-gray-400">시각 지능으로 경험하는 새로운 미학</p>
        </header>

        <div 
          className="relative w-[300px] h-[400px] sm:w-[350px] sm:h-[480px] flex items-center justify-center"
          style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        >
          {artworks.map((art, index) => {
            const isCenter = index === currentIndex;
            return (
              <div 
                key={art.id}
                className="absolute w-full h-full bg-white rounded-lg shadow-2xl overflow-hidden cursor-pointer"
                style={getCardStyle(index)}
                onClick={() => !isCenter && setCurrentIndex(index)}
              >
                <Link href={isCenter ? `/artwork/${art.id}` : '#'} className="block w-full h-full" onClick={(e) => !isCenter && e.preventDefault()}>
                  <img src={art.imageUrl} alt={art.title} className="w-full h-3/4 object-cover" />
                  <div className="h-1/4 p-4 bg-white flex flex-col justify-center">
                    <h3 className="text-gray-900 font-bold truncate">{art.title}</h3>
                    <p className="text-gray-500 text-xs">{art.artist}</p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        <div className="flex gap-10 mt-16 z-20">
          <button onClick={handlePrev} className="hover:scale-110 transition-transform text-2xl">←</button>
          <button onClick={handleNext} className="hover:scale-110 transition-transform text-2xl">→</button>
        </div>

        {/* 하단 그리드로 이동 유도 버튼 */}
        <button 
          onClick={scrollToGrid}
          className="absolute bottom-10 animate-bounce text-gray-500 text-sm flex flex-col items-center"
        >
          전체 작품 보기
          <span className="mt-2">↓</span>
        </button>
      </section>

      {/* SECTION 2: Gallery Grid */}
      <section ref={gridRef} className="py-24 px-8 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-2">Collection</h2>
            <p className="text-gray-500">아트렌즈가 엄선한 명화 라이브러리</p>
          </div>
          <div className="text-gray-600 text-sm">{artworks.length} Artworks Loaded</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {artworks.map((art) => (
            <Link href={`/artwork/${art.id}`} key={art.id}>
              <div className="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-500 transition-all shadow-lg">
                <div className="h-56 overflow-hidden">
                  <img 
                    src={art.imageUrl} 
                    alt={art.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-white truncate">{art.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">{art.artist}</p>
                  <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 px-2 py-1 bg-gray-900 rounded uppercase tracking-wider">{art.style}</span>
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors">Details →</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="py-12 text-center text-gray-600 border-t border-gray-800">
        <p>© 2026 ArtLens Project. All Artworks from Metropolitan Museum API.</p>
      </footer>
    </div>
  );
}