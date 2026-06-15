"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../lib/firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth"; 
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MainDashboard() {
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

  // 🎯 3D 가상 차원 입체 이동 계수 공식
  const getCardStyle = (index) => {
    let offset = index - currentIndex;
    const halfLength = Math.floor(artworks.length / 2);

    if (offset > halfLength) offset -= artworks.length;
    if (offset < -halfLength) offset += artworks.length;

    const absOffset = Math.abs(offset);
    const sign = Math.sign(offset);

    if (absOffset > 2) return { opacity: 0, pointerEvents: 'none', zIndex: -1 };

    return {
      "--offset": offset,
      "--abs-offset": absOffset,
      "--sign": sign,
      zIndex: 10 - absOffset,
      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  if (loading) return <div className="min-h-screen bg-[#242629] flex items-center justify-center text-white font-medium">미술관 갤러리 정렬 중...</div>;

  return (
    <div className="bg-[#242629] min-h-screen text-white font-sans scroll-smooth overflow-x-hidden relative">
      
      {/* 프리미엄 광폭 원뿔형 스포트라이트 */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] sm:w-[850px] h-[650px] pointer-events-none z-10 opacity-95"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(255, 253, 220, 0.22) 0%, rgba(255, 253, 220, 0.05) 55%, transparent 100%)",
          clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)"
        }}
      ></div>

      {/* SECTION 1: 3D Hero Carousel */}
      <section className="h-screen w-full flex flex-col justify-between relative p-4 sm:p-8 pb-4">
        
        {/* 상단 우측 내비게이션 콘솔 */}
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 text-xs font-medium">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3 bg-[#1a1b1d]/90 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full border border-neutral-700 shadow-2xl">
              <button 
                onClick={() => router.push("/mypage")}
                className="text-amber-400 font-extrabold hover:text-amber-300 tracking-tight active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>👤</span>
                <span className="underline decoration-dashed decoration-amber-500 underline-offset-4 max-w-[70px] truncate sm:max-w-none">
                  {user.email?.split("@")[0]}
                </span>
                <span className="text-gray-400 font-normal text-[11px]"> 님</span>
              </button>
              <span className="text-neutral-700">|</span>
              <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors cursor-pointer">로그아웃</button>
            </div>
          ) : (
            <Link href="/login">
              <button className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-[#2c2214] to-[#1c150c] hover:from-[#87672a] hover:to-[#6b501f] text-[#e2c184] text-[11px] sm:text-xs rounded-full border border-[#a38752]/60 transition-all duration-300 shadow-2xl font-bold tracking-wide cursor-pointer">
                로그인 / 회원가입
              </button>
            </Link>
          )}
        </div>

        {/* 타이틀 헤더 */}
        <header className="relative mt-12 sm:mt-2 text-center z-20 flex flex-col items-center">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">ArtLens</h1>
          <p className="text-neutral-400 text-[11px] sm:text-sm mb-4 font-medium tracking-wide">시각 지능으로 경험하는 새로운 미학</p>
          
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          
          <button 
            onClick={handleCameraClick}
            disabled={isIdentifying}
            className="flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-2.5 bg-gradient-to-r from-[#2c2214] to-[#1c150c] hover:from-[#87672a] hover:to-[#6b501f] text-[#e2c184] font-bold text-[11px] sm:text-xs rounded-full shadow-2xl border border-[#a38752]/60 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer mb-2 uppercase tracking-wide"
          >
            {isIdentifying ? "작품 분석 중..." : "AI 렌즈로 작품 촬영하기"}
          </button>
        </header>

        {/* 3D 가변 비율 액자 캐러셀 구역 */}
        {/* 🎯 [완벽 복원]: 고정 높이를 완전히 해체하고, 작품 종횡비대로 액자가 가변 조절되는 순정 공식 복구 */}
        <div className="flex-grow flex items-center justify-center my-2 relative min-h-[320px] sm:min-h-[480px]">
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] sm:w-[340px] flex items-center justify-center"
            style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
          >
            {artworks.map((art, index) => {
              const isCenter = index === currentIndex;
              return (
                <div 
                  key={`${art.id}-${index}`}
                  className={`absolute w-full h-auto bg-[#111112] rounded-none overflow-hidden select-none card-3d-layer ${
                    isCenter 
                      ? "border-double shadow-[0_20px_50px_rgba(0,0,0,0.85)] opacity-100 filter-none" 
                      : "border-solid shadow-[0_10px_25px_rgba(0,0,0,0.65)] opacity-45"
                  }`}
                  style={getCardStyle(index)}
                  onClick={() => handleCardClick(index, isCenter)}
                >
                  <style jsx>{`
                    .card-3d-layer {
                      /* 🎯 흰색 유령 박스 버그 완전 해체 및 황동색 액자 두께 완전 복원 */
                      border-width: 10px;
                      border-image: linear-gradient(to bottom right, #e5c483 0%, #cfa862 20%, #87672a 40%, #bc954f 60%, #a37d37 80%, #fcebc2 100%) 14;
                      transform: translateX(calc(var(--offset) * 68%)) translateZ(calc(var(--abs-offset) * -110px)) rotateY(calc(var(--sign) * -28deg));
                    }
                    @media (min-width: 640px) {
                      .card-3d-layer {
                        /* 🎯 PC 화면 기존 순정 정밀 두께 복구 */
                        border-width: 14px;
                        transform: translateX(calc(var(--offset) * 115%)) translateZ(calc(var(--abs-offset) * -180px)) rotateY(calc(var(--sign) * -35deg));
                      }
                    }
                  `}</style>
                  
                  <Link href={isCenter ? `/artwork/${art.id}` : '#'} className="block w-full h-auto" onClick={(e) => !isCenter && e.preventDefault()}>
                    {/* 🎯 h-auto block 조합으로 작품 고유 크기대로 액자 테두리가 자연스럽게 완벽 피팅 */}
                    <div className="w-full h-auto bg-black border-b border-[#2b2110]">
                      <img src={art.imageUrl} alt={art.titleEn} className="w-full h-auto block object-contain" draggable="false" />
                    </div>
                    <div 
                      className="w-full p-2.5 sm:p-4 flex flex-col justify-center items-center text-center border-t border-[#46391e] relative shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)]"
                      style={{ background: "linear-gradient(to bottom, #2c2214 0%, #1c150c 100%)" }}
                    >
                      <div className="absolute inset-1 sm:inset-2 border border-[#8a6d3b]/30 pointer-events-none"></div>
                      <h3 className="text-[#e2c184] font-black truncate w-full text-[11px] sm:text-[13px] tracking-tight font-sans relative z-10">
                        {art.titleEn || "Untitled"}
                      </h3>
                      <p className="text-[#a38752] font-serif italic text-[9px] sm:text-[11px] truncate w-full mt-0.5 relative z-10">
                        by {art.artist || "Unknown Artist"}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 제어 화살표 콘솔 */}
        <div className="w-full flex flex-col items-center z-20">
          <div className="flex gap-8 sm:gap-12 mb-2 sm:mb-4">
            <button onClick={handlePrev} className="hover:scale-110 active:scale-95 text-sm sm:text-xl bg-[#1a1b1d] border border-neutral-700 hover:border-neutral-500 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all">←</button>
            <button onClick={handleNext} className="hover:scale-110 active:scale-95 text-sm sm:text-xl bg-[#1a1b1d] border border-neutral-700 hover:border-neutral-500 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all">→</button>
          </div>
          <button 
            onClick={scrollToGrid}
            className="animate-bounce text-neutral-500 text-[9px] flex flex-col items-center tracking-widest cursor-pointer hover:text-white transition-colors mb-2 font-medium"
          >
            전체 컬렉션 보기 ↓
          </button>
        </div>
        <div className="absolute bottom-0 left-0 w-full border-t border-[#1a1b1d]"></div>
      </section>

      {/* 하단 전체 컬렉션 메이슨리 구역 */}
      <section ref={gridRef} className="py-12 sm:py-24 px-4 sm:px-8 max-w-5xl mx-auto relative z-20">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-10 border-b border-neutral-800 pb-4 tracking-tight text-neutral-100 font-sans">Collection</h2>
        
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 sm:gap-6 space-y-4 sm:space-y-6">
          {artworks.map((art) => (
            <Link href={`/artwork/${art.id}`} key={`grid-${art.id}`} className="block break-inside-avoid">
              <div 
                className="group bg-[#1a1b1d] border rounded-none overflow-hidden transition-all shadow-xl hover:shadow-[0_15px_35px_rgba(0,0,0,0.5)] hover:-translate-y-1 duration-300 w-full h-auto"
                style={{ borderImage: "linear-gradient(to right, #c5a059, #927437) 1" }}
              >
                <div className="w-full h-auto bg-black">
                  <img src={art.imageUrl} className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500 block" alt={art.titleEn} />
                </div>
                <div className="p-2 sm:p-3.5 bg-gradient-to-b from-[#241c10] to-[#17120a] border-t border-[#46391e]">
                  <h3 className="font-extrabold text-[#e2c184] truncate text-[11px] sm:text-sm font-sans tracking-tight">{art.titleEn}</h3>
                  <p className="text-[#a38752] font-serif italic text-[9px] sm:text-[11px] mt-0.5 truncate">{art.artist}</p>
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