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

    const translateX = offset * 120; 
    const translateZ = absOffset * -190; 
    const rotateY = sign * -35; 

    return {
      transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
      zIndex: 10 - absOffset,
      opacity: absOffset === 0 ? 1 : absOffset === 1 ? 0.45 : 0.12,
      filter: absOffset === 0 ? 'none' : 'blur(2px) brightness(0.55)',
      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  if (loading) return <div className="min-h-screen bg-[#242629] flex items-center justify-center text-white font-medium">미술관 갤러리 정렬 중...</div>;

  return (
    <div className="bg-[#242629] min-h-screen text-white font-sans scroll-smooth overflow-x-hidden relative">
      
      {/* 부드러운 광폭 원뿔형 프리미엄 스포트라이트 조명 오버레이 */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] sm:w-[850px] h-[650px] pointer-events-none z-10 opacity-95"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(255, 253, 220, 0.22) 0%, rgba(255, 253, 220, 0.05) 55%, transparent 100%)",
          clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)"
        }}
      ></div>

      {/* SECTION 1: 3D Hero Carousel */}
      <section className="h-screen w-full flex flex-col justify-between relative p-8 pb-4">
        
        {/* 우측 상단 유저 정보 인덱스 칩 */}
        <div className="fixed top-6 right-6 z-50 text-xs font-medium">
          {user ? (
            <div className="flex items-center gap-3 bg-[#1a1b1d]/90 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-700 shadow-2xl">
              <button 
                onClick={() => router.push("/mypage")}
                className="text-amber-400 font-extrabold hover:text-amber-300 tracking-tight active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
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
              {/* 🎯 [개편 포인트 1]: 우측 상단 로그인 버튼 - 은은한 다크 차콜에 앤틱 황동 골드 테두리 및 텍스트 이식 */}
              <button className="px-5 py-2.5 bg-gradient-to-r from-[#2c2214] to-[#1c150c] hover:from-[#87672a] hover:to-[#6b501f] text-[#e2c184] rounded-full border border-[#a38752]/60 transition-all duration-300 shadow-2xl font-bold tracking-wide cursor-pointer">
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
          
          {/* 🎯 [개편 포인트 2]: 중앙 카메라 사진인식 버튼 - 보라색 제거 후 월넛 브라운 및 황동 골드 스킨으로 100% 깔맞춤 */}
          <button 
            onClick={handleCameraClick}
            disabled={isIdentifying}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#2c2214] to-[#1c150c] hover:from-[#87672a] hover:to-[#6b501f] text-[#e2c184] font-bold text-xs rounded-full shadow-2xl border border-[#a38752]/60 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer mb-2 uppercase tracking-wide"
          >
            {isIdentifying ? (
              "작품 분석 중..."
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-[#e2c184]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
                <span>AI 렌즈로 작품 촬영하기</span>
              </>
            )}
          </button>
        </header>

        {/* 3D 명품 무한 캐러셀 공간 */}
        <div className="flex-grow flex items-center justify-center my-2">
          <div 
            className="relative w-[310px] h-[360px] sm:w-[350px] sm:h-[440px] flex items-center justify-center"
            style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
          >
            {artworks.map((art, index) => {
              const isCenter = index === currentIndex;
              return (
                <div 
                  key={`${art.id}-${index}`}
                  className={`absolute w-full h-full bg-[#111112] rounded-none overflow-hidden select-none transition-all duration-500 ${
                    isCenter 
                      ? "border-[14px] border-double shadow-[0_30px_70px_rgba(0,0,0,0.85),inset_0_0_15px_rgba(0,0,0,0.7)]" 
                      : "border-[10px] border-solid shadow-[0_20px_40px_rgba(0,0,0,0.65)]"
                  }`}
                  style={{
                    ...getCardStyle(index),
                    borderImage: "linear-gradient(to bottom right, #e5c483 0%, #cfa862 20%, #87672a 40%, #bc954f 60%, #a37d37 80%, #fcebc2 100%) 14",
                  }}
                  onClick={() => handleCardClick(index, isCenter)}
                >
                  <Link href={isCenter ? `/artwork/${art.id}` : '#'} className="block w-full h-full" onClick={(e) => !isCenter && e.preventDefault()}>
                    
                    <div className="w-full h-[73%] overflow-hidden bg-black flex items-center justify-center border-b-2 border-[#2b2110]">
                      <img src={art.imageUrl} alt={art.titleEn} className="w-full h-full object-cover" draggable="false" />
                    </div>

                    <div 
                      className="h-[27%] p-4 flex flex-col justify-center items-center text-center border-t border-[#46391e] relative shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)]"
                      style={{
                        background: "linear-gradient(to bottom, #2c2214 0%, #1c150c 100%)"
                      }}
                    >
                      <div className="absolute inset-2 border border-[#8a6d3b]/30 pointer-events-none"></div>
                      <h3 className="text-[#e2c184] font-black truncate w-full text-xs sm:text-[13px] tracking-tight font-sans relative z-10">
                        {art.titleEn || "Untitled"}
                      </h3>
                      <p className="text-[#a38752] font-serif italic text-[10px] sm:text-[11px] truncate w-full mt-1 relative z-10">
                        by {art.artist || "Unknown Artist"}
                      </p>
                    </div>

                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 화살표 조작 콘솔 패널 */}
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

        <div className="absolute bottom-0 left-0 w-full border-t border-[#1a1b1d]"></div>
      </section>

      {/* SECTION 2: 전체 컬렉션 그리드 구역 */}
      <section ref={gridRef} className="py-24 px-8 max-w-7xl mx-auto relative z-20">
        <h2 className="text-3xl font-bold mb-10 border-b border-neutral-800 pb-4 tracking-tight text-neutral-100 font-sans">Collection</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {artworks.map((art) => (
            <Link href={`/artwork/${art.id}`} key={`grid-${art.id}`}>
              <div 
                className="group bg-[#1a1b1d] border-2 rounded-none overflow-hidden transition-all shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1.5 duration-300"
                style={{ borderImage: "linear-gradient(to right, #c5a059, #927437) 1" }}
              >
                <div className="h-52 overflow-hidden bg-black"><img src={art.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={art.titleEn} /></div>
                <div className="p-5 bg-gradient-to-b from-[#241c10] to-[#17120a] border-t border-[#46391e]">
                  <h3 className="font-extrabold text-[#e2c184] truncate text-base font-sans">{art.titleEn}</h3>
                  <p className="text-[#a38752] font-serif italic text-xs mt-1 truncate">{art.artist}</p>
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