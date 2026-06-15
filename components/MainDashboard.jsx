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

  const handleOriginalPrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : artworks.length - 1));
  };

  const handleOriginalNext = () => {
    setCurrentIndex((prev) => (prev < artworks.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    if (artworks.length === 0) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : artworks.length - 1));
  };

  const handleNext = () => {
    if (artworks.length === 0) return;
    setCurrentIndex((prev) => (prev < artworks.length - 1 ? prev + 1 : 0));
  };

  const handleCardClick = (index, isCenter) => {
    if (isCenter) return; 
    setCurrentIndex(index);
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
        return targetTitleEn.includes(result.title.toLowerCase());
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
    let offset = index - currentIndex;
    const halfLength = Math.floor(artworks.length / 2);

    if (offset > halfLength) offset -= artworks.length;
    if (offset < -halfLength) offset += artworks.length;

    const absOffset = Math.abs(offset);
    const sign = Math.sign(offset);

    if (absOffset > 2) return { opacity: 0, pointerEvents: 'none', zIndex: -1 };

    const translateX = offset * 115; 
    const translateZ = absOffset * -180; 
    const rotateY = sign * -40; 

    return {
      transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
      zIndex: 10 - absOffset,
      opacity: absOffset === 0 ? 1 : absOffset === 1 ? 0.5 : 0.15,
      filter: absOffset === 0 ? 'none' : 'blur(2px) brightness(0.6)',
      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  if (loading) return <div className="min-h-screen bg-[#242629] flex items-center justify-center text-white font-medium">미술관 입장 중...</div>;

  return (
    <div className="bg-[#242629] min-h-screen text-white font-sans scroll-smooth overflow-x-hidden relative">
      
      {/* 🎯 [대교정 포인트]: 메인 화면 상단에도 위는 좁고 아래는 넓게 떨어지는 리얼 원뿔형 핀조명 마스크 오버레이 투사 */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[500px] h-[600px] pointer-events-none z-10 opacity-90"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(255, 253, 230, 0.2) 0%, rgba(255, 253, 230, 0.04) 60%, transparent 100%)",
          clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)"
        }}
      ></div>

      {/* SECTION 1: 3D Hero Carousel */}
      <section className="h-screen w-full flex flex-col justify-between relative p-8 pb-4">
        
        {/* 상단 우측 고정 유저 마이페이지 칩 */}
        <div className="fixed top-6 right-6 z-50 text-xs font-medium">
          {user ? (
            <div className="flex items-center gap-3 bg-[#1a1b1d]/90 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-700 shadow-2xl">
              <button 
                onClick={() => router.push("/mypage")}
                className="text-amber-400 font-extrabold hover:text-amber-300 tracking-tight active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                title="나만의 명화 컬렉션 보관함 가기"
              >
                <span>👤</span>
                <span className="underline decoration-dashed decoration-amber-500 underline-offset-4">
                  {user.email?.split("@")[0]}
                </span>
                <span className="text-gray-400 font-normal text-[11px]"> 님</span>
              </button>
              <span className="text-neutral-700">|</span>
              <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors cursor-pointer">로그아웃</button>
            </div>
          ) : (
            <Link href="/login">
              <button className="px-5 py-2.5 bg-[#1a1b1d] hover:bg-amber-600 text-white rounded-full border border-neutral-700 transition-all font-bold cursor-pointer">
                로그인 / 회원가입
              </button>
            </Link>
          )}
        </div>

        {/* 타이틀 헤더 */}
        <header className="relative mt-2 text-center z-20 flex flex-col items-center">
          <h1 className="text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">ArtLens</h1>
          <p className="text-neutral-400 text-sm mb-4 font-medium tracking-wide">시각 지능으로 경험하는 새로운 미학</p>
          
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          
          <button 
            onClick={handleCameraClick}
            disabled={isIdentifying}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs rounded-full shadow-2xl border border-neutral-700/60 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer mb-2"
          >
            {isIdentifying ? "작품 분석 중..." : "AI 렌즈로 작품 촬영하기"}
          </button>
        </header>

        {/* 3D 부드러운 무한 캐러셀 본체 영역 */}
        <div className="flex-grow flex items-center justify-center my-2">
          <div 
            className="relative w-[300px] h-[340px] sm:w-[340px] sm:h-[420px] flex items-center justify-center"
            style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
          >
            {artworks.map((art, index) => {
              const isCenter = index === currentIndex;
              return (
                <div 
                  key={`${art.id}-${index}`}
                  className={`absolute w-full h-full bg-[#1a1b1d] rounded-sm overflow-hidden select-none transition-shadow duration-500 ${
                    isCenter 
                      ? "border-[12px] border-double border-gradient shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_0_10px_rgba(0,0,0,0.6)]" 
                      : "border-[10px] border-solid shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                  }`}
                  style={{
                    ...getCardStyle(index),
                    borderImage: "linear-gradient(to bottom right, #dfba73 0%, #c5a059 25%, #927437 50%, #c5a059 75%, #f5dfa3 100%) 12",
                    borderRadius: "4px"
                  }}
                  onClick={() => handleCardClick(index, isCenter)}
                >
                  <Link href={isCenter ? `/artwork/${art.id}` : '#'} className="block w-full h-full" onClick={(e) => !isCenter && e.preventDefault()}>
                    <div className="w-full h-3/4 overflow-hidden bg-black flex items-center justify-center border-b-[3px] border-[#3a301a]">
                      <img src={art.imageUrl} alt={art.titleEn} className="w-full h-full object-cover" draggable="false" />
                    </div>
                    <div className="h-1/4 p-4 bg-[#fdfcf7] flex flex-col justify-center border-t border-[#d4cbb3]">
                      <h3 className="text-[#1c1d1f] font-black truncate text-xs sm:text-sm tracking-tight font-sans">{art.titleEn || "Untitled"}</h3>
                      <p className="text-[#685f4c] font-serif italic text-[11px] truncate mt-0.5">{art.artist || "Unknown Artist"}</p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 제어 컨트롤러 패널 */}
        <div className="w-full flex flex-col items-center z-20">
          <div className="flex gap-12 mb-4">
            <button onClick={handlePrev} className="hover:scale-110 active:scale-95 text-xl bg-[#1a1b1d] border border-neutral-700 hover:border-neutral-500 w-10 h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all">←</button>
            <button onClick={handleNext} className="hover:scale-110 active:scale-95 text-xl bg-[#1a1b1d] border border-neutral-700 hover:border-neutral-500 w-10 h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all">→</button>
          </div>

          <button 
            onClick={scrollToGrid}
            className="animate-bounce text-neutral-500 text-[10px] flex flex-col items-center tracking-widest cursor-pointer hover:text-white transition-colors mb-2 font-medium"
          >
            전체 컬렉션 보기 ↓
          </button>
        </div>

        {/* 완벽 밀착 바닥 흰색 구분선 */}
        <div className="absolute bottom-0 left-0 w-full border-t border-[#1a1b1d]"></div>
      </section>

      {/* SECTION 2: 전체 그리드 영역 */}
      <section ref={gridRef} className="py-24 px-8 max-w-7xl mx-auto relative z-20">
        <h2 className="text-3xl font-bold mb-10 border-b border-neutral-800 pb-4 tracking-tight text-neutral-100 font-sans">Collection</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {artworks.map((art) => (
            <Link href={`/artwork/${art.id}`} key={`grid-${art.id}`}>
              <div 
                className="group bg-[#1a1b1d] border-2 rounded-lg overflow-hidden transition-all shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1.5 duration-300"
                style={{ borderImage: "linear-gradient(to right, #c5a059, #927437) 1" }}
              >
                <div className="h-52 overflow-hidden bg-black"><img src={art.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={art.titleEn} /></div>
                <div className="p-5 bg-[#fdfcf7]">
                  <h3 className="font-extrabold text-[#1c1d1f] truncate text-base font-sans">{art.titleEn}</h3>
                  <p className="text-[#685f4c] font-serif italic text-xs mt-1 truncate">{art.artist}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="py-12 text-center text-neutral-600 border-t border-neutral-800 text-[10px] font-mono">
        <p>© 2026 ArtLens Project. MET Museum Open Access API.</p>
      </footer>
    </div>
  );
}