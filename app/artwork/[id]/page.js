"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function ArtworkDetail() {
  const params = useParams();
  const router = useRouter();
  const [art, setArt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false); 

  // 🔊 TTS 오디오 관련 상태
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // 👤 로그인 유저 및 🔖 북마크 상태
  const [user, setUser] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // 🎯 도슨트 맞춤 조합 키워드 상태 (다중 선택 가능)
  const [selectedKeywords, setSelectedKeywords] = useState([]);

  const keywordOptions = [
    "작품 정보",
    "작가",
    "역사 및 사회적 배경",
    "작품 분석",
    "의미 해석",
    "비하인드 스토리",
    "미술사적 관점"
  ];

  useEffect(() => {
    const fetchArtworkDetail = async () => {
      if (!params.id) return;
      const docRef = doc(db, "artworks", params.id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setArt(docSnap.data());
      }
      setLoading(false);
    };
    fetchArtworkDetail();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && params.id) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const bookmarks = userData.bookmarks || [];
          setIsBookmarked(bookmarks.includes(params.id));
        }
      }
    });

    return () => unsubscribe();
  }, [params.id]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 키워드 토글 함수
  const handleToggleKeyword = (keyword) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(prev => prev.filter(k => k !== keyword));
    } else {
      setSelectedKeywords(prev => [...prev, keyword]);
    }
  };

  const handleToggleBookmark = async () => {
    if (!user) {
      alert("로그인이 필요한 기능입니다. 로그인 페이지로 이동합니다.");
      router.push("/login");
      return;
    }
    if (!art || bookmarkLoading) return;

    setBookmarkLoading(true);
    const userDocRef = doc(db, "users", user.uid);

    try {
      if (isBookmarked) {
        await updateDoc(userDocRef, {
          bookmarks: arrayRemove(params.id)
        });
        setIsBookmarked(false);
        alert("🔖 북마크가 해제되었습니다.");
      } else {
        await updateDoc(userDocRef, {
          bookmarks: arrayUnion(params.id)
        }).catch(async (err) => {
          if (err.code === "not-found") {
            const { setDoc } = await import("firebase/firestore");
            await setDoc(userDocRef, { bookmarks: [params.id] });
          } else {
            throw err;
          }
        });
        setIsBookmarked(true);
        alert("💛 맘에 드는 작품으로 북마크되었습니다!");
      }
    } catch (error) {
      console.error("북마크 연동 오류:", error);
      alert("북마크 처리 중 에러가 발생했습니다.");
    } finally {
      setBookmarkLoading(false);
    }
  };

  // 🎯 [대교정 핵심 패치]: 새 해설 생성 시 프론트엔드 상태창을 완전히 클리어하는 로직 빌드
  const handleGenerateDocent = async () => {
    if (!art) return;
    setIsGenerating(true);

    // 💡 재생 중이던 TTS가 있다면 즉시 중단하여 꼬임 방지
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }

    // 💡 화면 텍스트 상태를 로딩 안내 멘트로 선제적 강제 전환 (렌더링 트리거 활성화)
    setArt((prev) => ({
      ...prev,
      docentStory: "⏳ 선택하신 키워드를 기반으로 완전히 새로운 AI 맞춤 도슨트 해설을 편찬하고 있습니다. 잠시만 기다려 주세요..."
    }));

    try {
      const response = await fetch("/api/docent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleKo: art.titleKo || "",
          titleEn: art.titleEn || art.title || "",
          artist: art.artist || "Unknown Artist",
          year: art.year || "Unknown",
          style: art.style || "European Paintings",
          selectedKeywords: selectedKeywords 
        }),
      });

      const data = await response.json();

      if (data.story) {
        setArt((prev) => ({ 
          ...prev, 
          titleKo: data.titleKo || prev.titleKo,
          artistKo: data.artistKo || prev.artistKo,
          docentStory: data.story 
        }));

        const docRef = doc(db, "artworks", params.id);
        await updateDoc(docRef, {
          titleKo: data.titleKo || art.titleKo,
          artistKo: data.artistKo || art.artistKo,
          docentStory: data.story,
        });
      }
    } catch (error) {
      console.error("Gemini 호출 에러:", error);
      alert("해설을 생성하지 못했습니다.");
      // 에러 발생 시 기존 데이터 복구
      const docRef = doc(db, "artworks", params.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setArt(docSnap.data());
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayTTS = () => {
    if (typeof window === "undefined" || !window.speechSynthesis || !art?.docentStory) return;
    const synth = window.speechSynthesis;

    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(art.docentStory);
    utterance.lang = "ko-KR"; 

    const voices = synth.getVoices();
    const googleVoice = voices.find(
      (voice) => voice.lang === "ko-KR" && voice.name.includes("Google")
    );

    if (googleVoice) {
      utterance.voice = googleVoice;
    }

    utterance.rate = 0.95; 
    utterance.pitch = 1.0; 

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    synth.speak(utterance);
    setIsSpeaking(true);
  };

  const handlePauseTTS = () => {
    if (typeof window !== "undefined" && window.speechSynthesis && isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  };

  const handleStopTTS = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#242629] flex items-center justify-center text-white font-medium">작품 정보를 불러오는 중입니다...</div>;
  if (!art) return <div className="min-h-screen bg-[#242629] flex items-center justify-center text-white">작품을 찾을 수 없습니다.</div>;

  // 순정 디폴트 멘트인지 확인하는 판별식
  const isDefaultStory = !art.docentStory || art.docentStory === "현재 AI 도슨트가 이 작품을 분석 중입니다...";
  const userName = user ? user.email?.split("@")[0] : "";

  return (
    <main className="min-h-screen bg-[#242629] text-white p-6 sm:p-12 relative flex flex-col items-center justify-start overflow-x-hidden">
      
      {/* 뒤로가기 버튼 */}
      <div className="w-full max-w-6xl flex justify-start mb-8 border-b border-neutral-800 pb-4">
        <button 
          onClick={() => router.push("/")} 
          className="text-neutral-400 hover:text-white transition-colors text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> 
          <span>메인 미술관 갤러리로 돌아가기</span>
        </button>
      </div>

      {/* 메인 2분할 뷰 포트 공간 */}
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12 relative">
        
        {/* 🖼️ 왼쪽: 와이드 스포트라이트 명화 구역 */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-2 relative sticky top-8 max-h-[70vh] h-fit">
          <div 
            className="absolute pointer-events-none z-10 opacity-95"
            style={{
              top: "-160px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "720px",
              height: "760px",
              backgroundImage: "linear-gradient(to bottom, rgba(255, 253, 220, 0.24) 0%, rgba(255, 253, 220, 0.06) 60%, transparent 100%)",
              clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)"
            }}
          ></div>

          <div 
            className="bg-[#1a1b1d] rounded-none overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.85),inset_0_0_15px_rgba(0,0,0,0.5)] transition-all duration-300 relative z-20 max-h-[70vh] w-auto h-fit flex items-center justify-center"
            style={{
              borderImage: "linear-gradient(to bottom right, #dfba73 0%, #cfa862 25%, #927437 50%, #c5a059 75%, #f5dfa3 100%) 14",
              borderWidth: "14px",
              borderStyle: "solid",
            }}
          >
            <img 
              src={art.imageUrl || art.image} 
              alt={art.titleEn || art.title} 
              className="max-h-[calc(70vh-28px)] w-auto h-full block object-contain"
              draggable="false"
            />
          </div>
        </div>

        {/* 📄 오른쪽: 대리석 화이트 설명 및 컨트롤 패널 */}
        <div className="w-full lg:w-1/2 bg-[#fdfcf8] text-[#1c1d1f] p-6 sm:p-10 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col justify-between border border-[#e5dfcc] relative z-20">
          
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="text-[11px] font-black text-[#8a6d3b] uppercase tracking-widest bg-[#f4ebd0]/60 border border-[#d6c294] px-3 py-1 rounded-sm">
                {art.style || "European Paintings"}
              </div>
              
              <button
                onClick={handleToggleBookmark}
                disabled={bookmarkLoading}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-sm cursor-pointer ${
                  isBookmarked 
                    ? "bg-[#8a6d3b] text-white border-[#735a2f]" 
                    : "bg-white text-[#504939] border-[#dcd4bd] hover:bg-[#fcfaf2]"
                }`}
              >
                <span>{isBookmarked ? "💛" : "🤍"}</span>
                <span>{isBookmarked ? "컬렉션 보관 완료" : "내 컬렉션에 추가"}</span>
              </button>
            </div>
            
            <h1 className="text-3xl font-black mb-1 tracking-tight text-[#1a1b1d] font-sans leading-tight">
              {art.titleEn || art.title || "Untitled Masterpiece"}
            </h1>
            
            {art.titleKo && art.titleKo !== "작품명 번역 중" && art.titleKo !== art.titleEn && (
              <h2 className="text-sm font-bold text-[#8a6d3b] mb-6 tracking-wide">
                국내 한글 명칭: {art.titleKo}
              </h2>
            )}
            
            <p className="text-md text-[#554e40] mb-8 border-b border-[#e5dfcc] pb-5 font-medium font-serif italic">
              {art.artist || "Unknown Artist"}, <span className="text-neutral-500 font-sans not-italic font-bold">{art.year}</span>
            </p>

            {/* 다중 선택 가능한 메인 키워드 조합 인터페이스 칩 배치 구역 */}
            <div className="mb-6 bg-[#fcfbfa] p-4 rounded-md border border-[#eadabe] shadow-sm">
              <h4 className="text-xs font-black text-[#665e4e] mb-3 flex items-center gap-1 tracking-wide">
                <span>🧩</span> 원하는 해설 관점 조합하기 
              </h4>
              <div className="flex flex-wrap gap-2">
                {keywordOptions.map((keyword) => {
                  const isSelected = selectedKeywords.includes(keyword);
                  return (
                    <button
                      key={keyword}
                      onClick={() => handleToggleKeyword(keyword)}
                      className={`text-xs px-3 py-1.5 rounded-md border font-semibold transition-all duration-200 active:scale-95 cursor-pointer ${
                        isSelected
                          ? "bg-[#8a6d3b] text-white border-[#70582f] shadow-sm"
                          : "bg-white text-[#6b624f] border-[#e2dac3] hover:bg-[#f7f5ed]"
                      }`}
                    >
                      {keyword} {isSelected ? "✓" : "+"}
                    </button>
                  );
                })}
              </div>
              {selectedKeywords.length > 0 && (
                <p className="text-[11px] text-[#8a6d3b] mt-3 font-medium">
                  💡 선택된 관점: {selectedKeywords.join(", ")}
                </p>
              )}
            </div>
            
            {/* 오디오 가이드 및 스크립트 출력 도록 본문 */}
            <div className="bg-[#f7f5ed] p-6 rounded-lg border border-[#e5dfcc] shadow-inner">
              <h3 className="text-[10px] font-black mb-3 flex items-center tracking-widest text-[#706652]">
                <span className="bg-[#8a6d3b] text-white text-[9px] font-black px-2 py-0.5 rounded-sm mr-2 tracking-normal">AI DOCENT</span>
                AUDIO GUIDE SCRIPT
              </h3>
              <p className="leading-relaxed text-sm font-sans text-[#2e2b24] font-normal whitespace-pre-wrap">
                {art.docentStory}
              </p>
            </div>
          </div>

          {/* 하단 유동식 동적 제어 콘솔 시스템 */}
          <div className="mt-8">
            {isDefaultStory ? (
              <button 
                onClick={handleGenerateDocent}
                disabled={isGenerating}
                className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-[#2a2b2d] to-[#151617] hover:from-[#87672a] hover:to-[#6b501f] text-white rounded-md font-extrabold text-xs tracking-wider shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-40 cursor-pointer uppercase"
              >
                {isGenerating 
                  ? "✨ 제미나이가 엄선된 키워드를 융합 해설 중..." 
                  : user 
                    ? `✨ ${userName}님 맞춤 도슨트 스크립트 생성` 
                    : "✨ 맞춤 도슨트 스크립트 생성"}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                {/* 🎯 [대교정 포인트]: 다시 쓰기 단추를 누르는 즉시 상태값을 비워 시각적 피드백을 동기화함 */}
                <button
                  onClick={handleGenerateDocent}
                  disabled={isGenerating}
                  className="w-full mb-2 py-3 bg-[#1a1b1d] hover:bg-neutral-800 text-[#e2c184] font-bold rounded-md text-xs transition-all border border-neutral-700 shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {isGenerating ? "🔄 해설 갱신 중..." : "🔄 위의 선택한 키워드로 해설 다시 쓰기 (새로 생성)"}
                </button>

                {!isSpeaking || isPaused ? (
                  <button 
                    onClick={handlePlayTTS}
                    disabled={isGenerating}
                    className="w-full px-6 py-4 bg-gradient-to-r from-[#8a6d3b] to-[#735a2f] hover:from-[#9c7d46] hover:to-[#856a39] text-white rounded-md font-black text-xs tracking-wider shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5 uppercase disabled:opacity-50"
                  >
                    {isPaused ? "▶️ 도슨트 오디오 가이드 이어서 재생" : "🔊 오디오 가이드 가동 시작"}
                  </button>
                ) : (
                  <button 
                    onClick={handlePauseTTS}
                    className="w-full px-6 py-4 bg-gradient-to-r from-[#c5a059] to-[#a38144] hover:from-[#b4904e] hover:to-[#927137] text-white rounded-md font-bold text-xs tracking-wider shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    ⏸️ 오디오 가이드 일시정지
                  </button>
                )}

                {(isSpeaking || isPaused) && (
                  <button 
                    onClick={handleStopTTS}
                    className="text-[11px] text-[#88806f] hover:text-rose-600 transition-all underline mt-3 text-center cursor-pointer tracking-tight font-medium"
                  >
                    ⏹️ 해설 처음부터 다시 정주행 (처음으로)
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}