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
  // 🎯 [모션 복구 핵심]: 데이터 배열을 훼손하지 않고, 인덱스 포인터(숫자)로만 제어하여 CSS Transition을 완전히 살립니다.
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

  // ◀️ 왼쪽 버튼: 숫자를 감소시키되, 0보다 작아지면 맨 끝 배열로 부드럽게 순환
  const handlePrev = () => {
    if (artworks.length === 0) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : artworks.length - 1));
  };

  // ▶️ 오른쪽 버튼: 숫자를 증가시키되, 배열 길이를 넘어서면 다시 0번으로 부드럽게 순환
  const handleNext = () => {
    if (artworks.length === 0) return;
    setCurrentIndex((prev) => (prev < artworks.length - 1 ? prev + 1 : 0));
  };

  // 🎯 [클릭 이동 완벽 복구]: 양옆 카드를 누르면 중앙과의 거리만큼 인덱스를 조절하여 스르륵 회전 모션 발동
  const handleCardClick = (index, isCenter) => {
    if (isCenter) return; // 이미 가운데 있다면 Link 컴포넌트가 작동해 상세페이지로 진입합니다.
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

  // 🎯 [수학적 모듈러 무한 3D 연산]: 데이터 파괴 없이 링 구조로 앞뒤 카드를 무한 스캔하는 알고리즘
  const getCardStyle = (index) => {
    let offset = index - currentIndex;
    const halfLength = Math.floor(artworks.length / 2);

    // 💡 핵심: 원형 서클 궤도를 돌리듯 앞뒤 경계선에서 인덱스를 밀고 당겨 양옆이 절대 비어 보이지 않게 만듭니다.
    if (offset > halfLength) offset -= artworks.length;
    if (offset < -halfLength) offset += artworks.length;

    const absOffset = Math.abs(offset);
    const sign = Math.sign(offset);

    // 내 시야 좌우로 2단계를 벗어난 카드들은 부드럽게 숨겨서 최적화합니다.
    if (absOffset > 2) return { opacity: 0, pointerEvents: 'none', zIndex: -1 };

    const translateX = offset * 115; 
    const translateZ = absOffset * -180; 
    const rotateY = sign * -40; 

    return {
      transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
      zIndex: 10 - absOffset,
      opacity: absOffset === 0 ? 1 : absOffset === 1 ? 0.6 : 0.2,
      filter: absOffset === 0 ? 'none' : 'blur(1.5px)',
      // ✨ 이 cubic-bezier 모션 공식이 가은님이 좋아하시던 그 '스르륵' 감성 모션의 핵심 비밀기지입니다!
      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">미술관 입장 중...</div>;

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans scroll-smooth overflow-x-hidden">
      
      {/* SECTION 1: 3D Hero Carousel */}
      <section className="h-screen w-full flex flex-col justify-between relative p-8 pb-4">
        
        {/* 상단 우측 고정 유저 마이페이지 칩 */}
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

        {/* 3D 부드러운 무한 캐러셀 스페이스 */}
        <div className="flex-grow flex items-center justify-center my-2">
          <div 
            className="relative w-[300px] h-[340px] sm:w-[340px] sm:h-[410px] flex items-center justify-center"
            style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
          >
            {artworks.map((art, index) => {
              const isCenter = index === currentIndex;
              return (
                <div 
                  key={`${art.id}-${index}`}
                  className="absolute w-full h-full bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200 select-none"
                  style={getCardStyle(index)}
                  // 🎯 [클릭 이동 핸들러 완벽 복원 연동]
                  onClick={() => handleCardClick(index, isCenter)}
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
        </div>

        {/* 하단 제어 컨트롤러 패널 */}
        <div className="w-full flex flex-col items-center z-20">
          <div className="flex gap-12 mb-4">
            <button onClick={handlePrev} className="hover:scale-110 active:scale-95 text-xl bg-gray-800 border border-gray-700 hover:border-gray-500 w-10 h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all">←</button>
            <button onClick={handleNext} className="hover:scale-110 active:scale-95 text-xl bg-gray-800 border border-gray-700 hover:border-gray-500 w-10 h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all">→</button>
          </div>

          <button 
            onClick={scrollToGrid}
            className="animate-bounce text-gray-500 text-[10px] flex flex-col items-center tracking-widest cursor-pointer hover:text-white transition-colors mb-2"
          >
            전체 컬렉션 보기 ↓
          </button>
        </div>

        {/* 완벽 밀착 바닥 흰색 구분선 */}
        <div className="absolute bottom-0 left-0 w-full border-t border-gray-800/80"></div>
      </section>

      {/* SECTION 2: 전체 그리드 영역 */}
      <section ref={gridRef} className="py-24 px-8 max-w-7xl mx-auto">
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