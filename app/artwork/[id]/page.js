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

  const handleGenerateDocent = async () => {
    if (!art) return;
    setIsGenerating(true);

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

  if (loading) return <div className="min-h-screen bg-[#242629] flex items-center justify-center text-white">작품 정보를 불러오는 중입니다...</div>;
  if (!art) return <div className="min-h-screen bg-[#242629] flex items-center justify-center text-white">작품을 찾을 수 없습니다.</div>;

  const isDefaultStory = !art.docentStory || art.docentStory === "현재 AI 도슨트가 이 작품을 분석 중입니다...";

  return (
    // 🎯 [개편 1]: 메인 화면과 100% 일치시킨 오프라인 고급 전시실 그레이(#242629) 배경 매핑
    <main className="min-h-screen bg-[#242629] text-white p-8 relative">
      
      {/* 은은한 상단 엠비언트 스포트라이트 조명 레이어 */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle at top center, rgba(255, 254, 240, 0.12) 0%, transparent 70%)"
        }}
      ></div>

      <button 
        onClick={() => router.back()} 
        className="mb-6 text-neutral-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-1 relative z-10 cursor-pointer"
      >
        ← 갤러리로 돌아가기
      </button>

      {/* 🎯 [개편 2]: 컨테이너 배경을 묵직한 전시실 다크 차콜(#1a1b1d)로 변경하여 고급스러운 명도 대비 구축 */}
      <div className="max-w-6xl mx-auto bg-[#1a1b1d] border border-neutral-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row backdrop-blur-sm relative z-10">
        
        {/* 왼쪽 명화 이미지 쇼케이스 영역 */}
        <div className="md:w-1/2 bg-black flex items-center justify-center p-8 border-r border-neutral-800">
          <img 
            src={art.imageUrl || art.image} 
            alt={art.titleEn || art.title} 
            className="max-h-[520px] object-contain shadow-2xl rounded-sm border-4 border-[#2a2b2d]"
          />
        </div>

        {/* 오른쪽 텍스트 정보 및 제미나이 컨트롤 스페이스 */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center bg-[#1e1f22]">
          
          <div className="flex justify-between items-center mb-4">
            {/* 🎯 [개편 3]: 장르 뱃지를 차가운 블루에서 메인화면 아이디 링크 톤과 일치하는 소프트 골드 조합으로 튜닝 */}
            <div className="text-xs font-bold text-amber-400/90 uppercase tracking-widest bg-amber-950/30 border border-amber-900/40 px-3 py-1 rounded-sm">
              {art.style || "European Paintings"}
            </div>
            
            {/* 🎯 [개편 4]: 로그인창 스타일을 이식한 은은한 다크 그레이/골드 포인트 북마크 스위치 */}
            <button
              onClick={handleToggleBookmark}
              disabled={bookmarkLoading}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-md cursor-pointer ${
                isBookmarked 
                  ? "bg-amber-600/20 text-amber-400 border-amber-500/40 hover:bg-amber-600/30" 
                  : "bg-neutral-800/80 text-neutral-300 border-neutral-700/50 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              <span>{isBookmarked ? "💛" : "🤍"}</span>
              <span>{isBookmarked ? "북마크 취소하기" : "내 컬렉션에 추가"}</span>
            </button>
          </div>
          
          <h1 className="text-4xl font-black mb-1 tracking-tight text-white font-sans">
            {art.titleEn || art.title || "Untitled Masterpiece"}
          </h1>
          
          {art.titleKo && art.titleKo !== "작품명 번역 중" && art.titleKo !== art.titleEn && (
            <h2 className="text-sm font-semibold text-amber-500/80 mb-5 tracking-wide">
              국내 한글 통칭: {art.titleKo}
            </h2>
          )}
          
          <p className="text-md text-neutral-400 mb-6 border-b border-neutral-800 pb-5 font-medium font-serif italic">
            {art.artist || "Unknown Artist"}, <span className="text-neutral-500 font-sans not-italic">{art.year}</span>
          </p>
          
          {/* 가이드 스크립트 박스 */}
          <div className="bg-[#151618] p-6 rounded-xl border border-neutral-800 shadow-inner">
            <h3 className="text-xs font-black mb-3 flex items-center tracking-wider text-neutral-400">
              <span className="bg-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded-sm mr-2 tracking-normal">AI DOCENT</span>
              AUDIO GUIDE SCRIPT
            </h3>
            <p className={`leading-relaxed text-sm ${isDefaultStory ? "text-neutral-600 italic" : "text-neutral-200 font-normal"}`}>
              {art.docentStory}
            </p>
            
            {/* 🎯 [개편 5]: 하단 연산 버튼들을 전부 메인화면 로그인/카메라 버튼 양식인 고급 차 차콜-그라데이션 입체 스킨으로 교체 */}
            {isDefaultStory ? (
              <button 
                onClick={handleGenerateDocent}
                disabled={isGenerating}
                className="mt-6 w-full px-6 py-3.5 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-amber-700 hover:to-amber-800 text-white rounded-full border border-neutral-700 font-bold text-xs tracking-wide shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-40 cursor-pointer"
              >
                {isGenerating ? "✨ 제미나이가 예술적 해설을 정밀 작성 중..." : "✨ AI 도슨트 오디오 가이드 생성"}
              </button>
            ) : (
              <div className="flex flex-col gap-2 mt-6">
                {!isSpeaking || isPaused ? (
                  <button 
                    onClick={handlePlayTTS}
                    className="w-full px-6 py-3.5 bg-gradient-to-r from-neutral-100 to-neutral-200 hover:from-white hover:to-white text-neutral-900 rounded-full font-black text-xs tracking-wide shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isPaused ? "▶️ 도슨트 이어서 청취하기" : "🔊 오디오 가이드 재생"}
                  </button>
                ) : (
                  <button 
                    onClick={handlePauseTTS}
                    className="w-full px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-full font-bold text-xs tracking-wide shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    ⏸️ 오디오 가이드 일시정지
                  </button>
                )}

                {(isSpeaking || isPaused) && (
                  <button 
                    onClick={handleStopTTS}
                    className="text-[11px] text-neutral-500 hover:text-rose-400 transition-all underline mt-3 text-center cursor-pointer tracking-tight"
                  >
                    ⏹️ 해설 처음부터 다시 듣기 (정지)
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