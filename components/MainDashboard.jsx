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

  // 🎯 무한 루프 인덱싱 적용 (끝나지 않고 계속 회전)
  const handlePrev = () => {
    setArtworks((prevArtworks) => {
      const next = [...prevArtworks];
      const lastItem = next.pop();
      next.unshift(lastItem);
      return next;
    });
  };

  const handleNext = () => {
    setArtworks((prevArtworks) => {
      const next = [...prevArtworks];
      const firstItem = next.shift();
      next.push(firstItem);
      return next;
    });
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

  // 🎯 무한 3D 배치를 위한 상대적 스타일 계산
  const getCardStyle = (index) => {
    // 배열의 가운데(0번째) 카드를 항상 센터로 고정하고 양옆으로 날개 배치
    const centerIndex = 0; 
    let offset = index - centerIndex;

    // 카드가 원형으로 돌고 있는 것처럼 보이게 하기 위해 인덱스 절반 보정
    const half = Math.floor(artworks.length / 2);
    if (offset > half) offset -= artworks.length;
    if (offset < -half) offset += artworks.length;

    const absOffset = Math.abs(offset);
    const sign = Math.sign(offset);

    // 좌우로 2단계 떨어진 카드까지만 화면에 노출 (나머지는 뒤로 숨김)
    if (absOffset > 2) return { opacity: 0, pointerEvents: 'none', zIndex: -1 };

    const translateX = offset * 115; 
    const translateZ = absOffset * -180; 
    const rotateY = sign * -40; 

    return {
      transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
      zIndex: 10 - absOffset,
      opacity: absOffset === 0 ? 1 : absOffset === 1 ? 0.6 : 0.2,
      filter: absOffset === 0 ? 'none' : 'blur(1.5px)',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">미술관 입장 중...</div>;

  // 화면에 그릴 때 현재 중앙 카드의 정보를 하단에 보여주기 위해 타겟팅
  const centerArtwork = artworks[0] || {};

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans scroll-smooth overflow-x-hidden">
      
      {/* 히어로 랜딩 섹션 */}
      <section className="h-[88vh] flex flex-col items-center justify-start relative p-8">
        
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

        {/* 타이틀 헤더 */}
        <header className="relative mt-2 text-center z-20 flex flex-col items-center">
          <h1 className="text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">ArtLens</h1>
          <p className="text-gray-500 text-sm mb-4">시각 지능으로 경험하는 새로운 미학</p>
          
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          
          <button 
            onClick={handleCameraClick}
            disabled={isIdentifying}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-full shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer mb-2"
          >
            {isIdentifying ? "작품 분석 중..." : "AI 렌즈로 작품 촬영하기"}
          </button>
        </header>

        {/* 🎯 무한 순환 구조로 재탄생한 3D 캐러셀 컨테이너 */}
        <div 
          className="relative w-[300px] h-[350px] sm:w-[340px] sm:h-[420px] flex items-center justify-center mt-2"
          style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        >
          {artworks.map((art, index) => {
            const isCenter = index === 0; // 항상 0번째가 화면 한가운데 배치됨
            return (
              <div 
                key={`${art.id}-${index}`}
                className="absolute w-full h-full bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200 select-none"
                style={getCardStyle(index)}
              >
                <Link href={isCenter ? `/artwork/${art.id}` : '#'} className="block w-full h-full" onClick={(e) => !isCenter && e.preventDefault()}>
                  <img src={art.imageUrl} alt={art.titleEn} className="w-full h-3/4 object-cover" draggable="false" />
                  <div className="h-1/4 p-4 bg-white flex flex-col justify-center">
                    <h3 className="text-gray-900 font-bold truncate text-xs sm:text-sm">{art.titleEn || "Untitled"}</h3>
                    <p className="text-gray-400 font-serif italic text-[11px] truncate mt-0.5">{art.artist || "Unknown Artist"}</p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* 좌우 무한 컨트롤러 슬라이더 버튼 */}
        <div className="flex gap-12 mt-6 z-20">
          <button onClick={handlePrev} className="hover:scale-110 active:scale-95 text-xl bg-gray-800 border border-gray-700 hover:border-gray-500 w-10 h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all">←</button>
          <button onClick={handleNext} className="hover:scale-110 active:scale-95 text-xl bg-gray-800 border border-gray-700 hover:border-gray-500 w-10 h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all">→</button>
        </div>

        {/* 전체 컬렉션 스크롤 가이드 버튼 */}
        <button 
          onClick={scrollToGrid}
          className="mt-6 animate-bounce text-gray-500 text-[10px] flex flex-col items-center tracking-widest cursor-pointer hover:text-white transition-colors"
        >
          전체 컬렉션 보기 ↓
        </button>
      </section>

      {/* 🎯 수정 포인트: 화면 왼쪽 끝에서 오른쪽 끝까지 완벽하게 맞는 흰색(연한 회색) 구분선 구현 */}
      <div className="w-full border-t border-gray-800/80"></div>

      {/* 컬렉션 그리드 영역 */}
      <section ref={gridRef} className="py-20 px-8 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-10 border-b border-gray-800 pb-4 tracking-tight">Collection</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {artworks.map((art) => (
            <Link href={`/artwork/${art.id}`} key={`grid-${art.id}`}>
              <div className="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-indigo-500 transition-all shadow-lg hover:shadow-2xl">
                <div className="h-52 overflow-hidden"><img src={art.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={art.titleEn} /></div>
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