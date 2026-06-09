"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../lib/firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth"; 
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [user, setUser] = useState(null); 
  
  const gridRef = useRef(null);
  const fileInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const fetchArtworks = async () => {
      const artCollection = collection(db, "artworks");
      const artSnapshot = await getDocs(artCollection);
      const artList = artSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setArtworks(artList);
      setLoading(false);
    };
    fetchArtworks();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("로그아웃 되었습니다.");
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsIdentifying(true);
    
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/identify", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("인식 실패");

      const result = await response.json();

      const matchedArtwork = artworks.find(art => {
        const targetTitleEn = (art.titleEn || art.title || "").toLowerCase();
        const resultTitle = (result.title || "").toLowerCase();
        return targetTitleEn.includes(resultTitle) || resultTitle.includes(targetTitleEn);
      });

      if (matchedArtwork) {
        router.push(`/artwork/${matchedArtwork.id}`);
      } else {
        alert(`인식된 작품: ${result.title}\n컬렉션에 없는 작품입니다.`);
      }

    } catch (error) {
      console.error("이미지 분석 중 오류 발생:", error);
      alert("분석 중 에러가 발생했습니다.");
    } finally {
      setIsIdentifying(false);
    }
  };

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

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">미술관 입장 중...</div>;

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans scroll-smooth">
      
      {/* 🎯 개선된 히어로 섹션: 여백 최소화 및 수직 정렬 최적화 */}
      <section className="h-[90vh] flex flex-col items-center justify-start relative overflow-hidden border-b border-gray-800 p-8">
        
        {/* 상단 우측 고정 유저 뱃지 */}
        <div className="fixed top-6 right-6 z-50 text-xs font-medium">
          {user ? (
            <div className="flex items-center gap-3 bg-gray-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-gray-700 shadow-2xl">
              <button 
                onClick={() => router.push("/mypage")}
                className="text-blue-400 font-extrabold hover:text-blue-300 tracking-tight active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                👤 <u>{user.email?.split("@")[0]}</u>님
              </button>
              <span className="text-gray-700">|</span>
              <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors cursor-pointer">로그아웃</button>
            </div>
          ) : (
            <Link href="/login">
              <button className="px-5 py-2.5 bg-gray-800 hover:bg-indigo-600 text-white rounded-full border border-gray-700 transition-all font-bold cursor-pointer">
                로그인 / 회원가입
              </button>
            </Link>
          )}
        </div>

        {/* 🎯 수정 포인트 1: 타이틀을 화면 최상단(mt-4)으로 밀착 배치 */}
        <header className="relative mt-4 text-center z-20 flex flex-col items-center">
          <h1 className="text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">ArtLens</h1>
          <p className="text-gray-500 text-sm mb-4">시각 지능으로 경험하는 새로운 미학</p>
          
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          
          {/* 🎯 수정 포인트 2: 버튼 마진(mb-2)을 줄여 캐러셀과의 간격을 좁힘 */}
          <button 
            onClick={handleCameraClick}
            disabled={isIdentifying}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-full shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer mb-2"
          >
            {isIdentifying ? "작품 분석 중..." : "AI 렌즈로 작품 촬영하기"}
          </button>
        </header>

        {/* 🎯 수정 포인트 3: 캐러셀 위치(mt-2)를 버튼 바로 아래로 밀착시켜 황금 비율 완성 */}
        <div 
          className="relative w-[300px] h-[380px] sm:w-[350px] sm:h-[450px] flex items-center justify-center mt-2"
          style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        >
          {artworks.slice(0, 15).map((art, index) => {
            const isCenter = index === currentIndex;
            return (
              <div 
                key={art.id}
                className="absolute w-full h-full bg-white rounded-lg shadow-2xl overflow-hidden cursor-pointer border border-gray-200"
                style={getCardStyle(index)}
                onClick={() => !isCenter && setCurrentIndex(index)}
              >
                <Link href={isCenter ? `/artwork/${art.id}` : '#'} className="block w-full h-full" onClick={(e) => !isCenter && e.preventDefault()}>
                  <img src={art.imageUrl} alt={art.titleEn} className="w-full h-3/4 object-cover" />
                  <div className="h-1/4 p-4 bg-white flex flex-col justify-center">
                    <h3 className="text-gray-900 font-bold truncate text-sm">{art.titleEn}</h3>
                    <p className="text-gray-400 font-serif italic text-xs truncate mt-0.5">{art.artist}</p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* 🎯 수정 포인트 4: 좌우 버튼과 전체보기 텍스트가 안 겹치도록 마진(mt-8) 조정 */}
        <div className="flex gap-10 mt-8 z-20">
          <button onClick={handlePrev} className="hover:scale-110 text-2xl bg-gray-800 border border-gray-700 w-10 h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer">←</button>
          <button onClick={handleNext} className="hover:scale-110 text-2xl bg-gray-800 border border-gray-700 w-10 h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer">→</button>
        </div>

        <button 
          onClick={scrollToGrid}
          className="mt-6 animate-bounce text-gray-500 text-[10px] flex flex-col items-center tracking-widest cursor-pointer"
        >
          전체 컬렉션 보기 ↓
        </button>
      </section>

      {/* 컬렉션 그리드 영역 (기존 유지) */}
      <section ref={gridRef} className="py-20 px-8 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-10 border-b border-gray-800 pb-4">Collection</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {artworks.map((art) => (
            <Link href={`/artwork/${art.id}`} key={art.id}>
              <div className="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-indigo-500 transition-all shadow-lg">
                <div className="h-52 overflow-hidden"><img src={art.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /></div>
                <div className="p-5">
                  <h3 className="font-bold text-white truncate text-base">{art.titleEn}</h3>
                  <p className="text-gray-400 font-serif italic text-xs mt-1 truncate">{art.artist}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="py-12 text-center text-gray-600 border-t border-gray-800 text-[10px] font-mono">
        <p>© 2026 ArtLens Project. MET Museum Open Access API.</p>
      </footer>
    </div>
  );
}

이제 겹침 현상 없이 아주 쾌적하게 명화를 감상하실 수 있을 거예요. 마지막 슛 날려보세요! 🚀🎨🌐👤💛