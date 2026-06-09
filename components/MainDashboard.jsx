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
      loading && setLoading(false);
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
      console.log("Gemini 인식 결과:", result);

      const matchedArtwork = artworks.find(art => {
        const targetTitleEn = (art.titleEn || art.title || "").toLowerCase();
        const targetTitleKo = (art.titleKo || "").toLowerCase();
        const resultTitle = (result.title || "").toLowerCase();

        return (
          targetTitleEn.includes(resultTitle) || 
          resultTitle.includes(targetTitleEn) ||
          targetTitleKo.includes(resultTitle) ||
          resultTitle.includes(targetTitleKo)
        );
      });

      if (matchedArtwork) {
        const displayTitle = matchedArtwork.titleEn || matchedArtwork.title || "Untitled";
        alert(`🎨 작품이 인식되었습니다!\n제목: ${displayTitle}\n상세 페이지로 이동합니다.`);
        router.push(`/artwork/${matchedArtwork.id}`);
      } else {
        alert(`인식된 작품: ${result.title} (${result.artist})\n아쉽게도 현재 아트렌즈 컬렉션에 없는 작품입니다. 하단 컬렉션의 명화를 촬영해보세요!`);
      }

    } catch (error) {
      console.error("이미지 분석 중 오류 발생:", error);
      alert("이미지를 분석하는 도중 에러가 발생했습니다. 다시 시도해주세요.");
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

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <span className="text-2xl font-semibold tracking-wide text-gray-300">ArtLens</span>
        <div className="text-sm text-gray-500">미술관 입장 중...</div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans scroll-smooth">
      
      {/* SECTION 1: 3D Hero Carousel */}
      <section className="h-screen flex flex-col items-center justify-center relative overflow-hidden border-b border-gray-800">
        
        {/* 🎯 [인터페이스 전격 교정]: 우측 상단 고정 로그인 뱃지에 마이페이지 순간이동 라우팅 탑재 */}
        <div className="fixed top-6 right-6 z-50 text-xs font-medium">
          {user ? (
            <div className="flex items-center gap-3 bg-gray-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-gray-700 shadow-2xl transition-all">
              {/* 내 아이디 영역을 호버/클릭 가능한 버튼으로 빌트인 고도화 */}
              <button 
                onClick={() => router.push("/mypage")}
                className="text-blue-400 font-extrabold hover:text-blue-300 tracking-tight active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                title="나만의 명화 컬렉션 보관함 가기"
              >
                <span>👤</span>
                <span className="underline decoration-dashed decoration-blue-500 underline-offset-4">
                  {user.email?.split("@")[0]}
                </span>
                <span className="text-gray-400 font-normal text-[11px]"> 님</span>
              </button>
              <span className="text-gray-700">|</span>
              <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors cursor-pointer">로그아웃</button>
            </div>
          ) : (
            <Link href="/login">
              <button className="px-5 py-2.5 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-indigo-600 hover:to-purple-600 text-white rounded-full border border-gray-700 transition-all duration-300 shadow-2xl font-bold tracking-wide cursor-pointer">
                로그인 / 회원가입
              </button>
            </Link>
          )}
        </div>

        {/* 메인 타이틀 및 카메라 영역 */}
        <header className="absolute top-10 text-center z-20 flex flex-col items-center">
          <h1 className="text-5xl font-extrabold tracking-tighter mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">ArtLens</h1>
          <p className="text-gray-400 mb-6">시각 지능으로 경험하는 새로운 미학</p>
          
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageChange}
          />
          <button 
            onClick={handleCameraClick}
            disabled={isIdentifying}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm rounded-full shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isIdentifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>작품 분석 중...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
                <span>AI 렌즈로 작품 촬영하기</span>
              </>
            )}
          </button>
        </header>

        {/* 3D 캐러셀 바디 */}
        <div 
          className="relative w-[300px] h-[400px] sm:w-[350px] sm:h-[480px] flex items-center justify-center"
          style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        >
          {artworks.map((art, index) => {
            const isCenter = index === currentIndex;
            return (
              <div 
                key={art.id}
                className="absolute w-full h-full bg-white rounded-lg shadow-2xl overflow-hidden cursor-pointer border border-gray-200"
                style={getCardStyle(index)}
                onClick={() => !isCenter && setCurrentIndex(index)}
              >
                <Link href={isCenter ? `/artwork/${art.id}` : '#'} className="block w-full h-full" onClick={(e) => !isCenter && e.preventDefault()}>
                  <img src={art.imageUrl} alt={art.titleEn || art.title} className="w-full h-3/4 object-cover" />
                  
                  <div className="h-1/4 p-4 bg-white flex flex-col justify-center">
                    <h3 className="text-gray-900 font-bold truncate text-sm tracking-tight font-sans">
                      {art.titleEn || art.title || "Untitled"}
                    </h3>
                    <p className="text-gray-400 font-medium font-serif italic text-xs truncate mt-0.5">
                      {art.artist || "Unknown Artist"}
                    </p>
                  </div>

                </Link>
              </div>
            );
          })}
        </div>

        <div className="flex gap-10 mt-16 z-20">
          <button onClick={handlePrev} className="hover:scale-110 transition-transform text-2xl bg-gray-800 border border-gray-700 w-12 h-12 rounded-full flex items-center justify-center shadow-md">←</button>
          <button onClick={handleNext} className="hover:scale-110 transition-transform text-2xl bg-gray-800 border border-gray-700 w-12 h-12 rounded-full flex items-center justify-center shadow-md">→</button>
        </div>

        <button 
          onClick={scrollToGrid}
          className="absolute bottom-6 animate-bounce text-gray-500 text-xs flex flex-col items-center tracking-wider cursor-pointer"
        >
          전체 컬렉션 보기
          <span className="mt-1 text-sm">↓</span>
        </button>
      </section>

      {/* SECTION 2: Gallery Grid */}
      <section ref={gridRef} className="py-24 px-8 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-2">Collection</h2>
            <p className="text-gray-500">아트렌즈가 엄선한 명화 라이브러리</p>
          </div>
          <div className="text-gray-600 text-sm font-mono">{artworks.length} Artworks Loaded</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {artworks.map((art) => (
            <Link href={`/artwork/${art.id}`} key={art.id}>
              <div className="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-500 transition-all shadow-lg hover:shadow-2xl">
                <div className="h-56 overflow-hidden relative">
                  <img 
                    src={art.imageUrl} 
                    alt={art.titleEn || art.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                
                <div className="p-5">
                  <h3 className="font-extrabold text-white truncate text-base tracking-tight font-sans">
                    {art.titleEn || art.title || "Untitled"}
                  </h3>
                  <p className="text-gray-400 font-medium font-serif italic text-sm mt-1 truncate">
                    {art.artist || "Unknown Artist"}
                  </p>
                  
                  <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 px-2 py-0.5 bg-gray-900 border border-gray-700 rounded uppercase tracking-wider">{art.style || "Classical"}</span>
                    <span className="text-xs text-gray-400 group-hover:text-indigo-400 font-medium transition-colors">Details →</span>
                  </div>
                </div>

              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="py-12 text-center text-gray-600 border-t border-gray-800 text-xs font-mono">
        <p>© 2026 ArtLens Project. All Artworks from Metropolitan Museum API.</p>
      </footer>
    </div>
  );
}