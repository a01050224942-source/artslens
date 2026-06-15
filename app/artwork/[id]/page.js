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

  if (loading) return <div className="min-h-screen bg-[#242629] flex items-center justify-center text-white font-medium">작품 정보를 불러오는 중입니다...</div>;
  if (!art) return <div className="min-h-screen bg-[#242629] flex items-center justify-center text-white">작품을 찾을 수 없습니다.</div>;

  const isDefaultStory = !art.docentStory || art.docentStory === "현재 AI 도슨트가 이 작품을 분석 중입니다...";

  return (
    <main className="min-h-screen bg-[#242629] text-white p-8 relative flex flex-col items-center justify-center overflow-x-hidden">
      
      {/* 뒤로가기 버튼 */}
      <div className="w-full max-w-6xl flex justify-start mb-4 relative z-10">
        <button 
          onClick={() => router.back()} 
          className="text-neutral-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-1 cursor-pointer"
        >
          ← 갤러리로 돌아가기
        </button>
      </div>

      {/* 메인 컴포넌트 프레임 레이아웃 */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row items-stretch justify-center gap-12 relative z-10">
        
        {/* 🖼️ 왼쪽 명화 전용 구역 (relative 속성을 주어 하위 조명의 부모 기준점으로 락인) */}
        <div className="md:w-1/2 flex flex-col items-center justify-center p-2 relative">
          
          {/* 🎯 [핵심 교정 패치 1]: 원뿔형 스포트라이트를 액자 주머니 '바로 위 자식'으로 전격 배치!! */}
          {/* 이제 화면 창 크기가 변해도, 조명의 정중앙과 액자의 정중앙이 단 1픽셀의 오차도 없이 일치합니다. */}
          <div 
            className="absolute pointer-events-none z-10 opacity-95 transition-all duration-500"
            style={{
              // 액자 바로 윗단(top-[-120px] 부근)에서 시작하여 아래로 웅장하게 번지도록 기하학 설계
              top: "-150px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "550px",
              height: "750px",
              backgroundImage: "linear-gradient(to bottom, rgba(255, 253, 220, 0.25) 0%, rgba(255, 253, 220, 0.05) 55%, transparent 100%)",
              clipPath: "polygon(43% 0, 57% 0, 100% 100%, 0 100%)"
            }}
          ></div>

          {/* 앤틱 골드 베벨 액자 하드웨어 */}
          <div 
            className="bg-[#1a1b1d] rounded-none overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.85),inset_0_0_15px_rgba(0,0,0,0.5)] transition-all duration-300 relative z-20"
            style={{
              borderImage: "linear-gradient(to bottom right, #dfba73 0%, #cfa862 25%, #927437 50%, #c5a059 75%, #f5dfa3 100%) 14",
              borderWidth: "14px",
              borderStyle: "solid",
            }}
          >
            <img 
              src={art.imageUrl || art.image} 
              alt={art.titleEn || art.title} 
              // 🎯 [핵심 교정 패치 2]: 메인/마이페이지 공백 쳐내기 공식과 동일하게 w-full h-full object-cover를 이식하여 
              // 상세페이지 액자 틀 내부에서도 불규칙한 데이터 여백선을 완전 박멸 처리
              className="max-h-[550px] w-full object-cover"
              draggable="false"
            />
          </div>
        </div>

        {/* 📄 오른쪽: 미술관 정품 화이트 설명 패널 스페이스 */}
        <div className="md:w-1/2 bg-[#fdfcf8] text-[#1c1d1f] p-10 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col justify-between border border-[#e5dfcc] relative z-20">
          
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
            
            <div className="bg-[#f7f5ed] p-6 rounded-lg border border-[#e5dfcc] shadow-inner">
              <h3 className="text-[10px] font-black mb-3 flex items-center tracking-widest text-[#706652]">
                <span className="bg-[#8a6d3b] text-white text-[9px] font-black px-2 py-0.5 rounded-sm mr-2 tracking-normal">AI DOCENT</span>
                AUDIO GUIDE SCRIPT
              </h3>
              <p className={`leading-relaxed text-sm font-sans ${isDefaultStory ? "text-neutral-400 italic" : "text-[#2e2b24] font-normal"}`}>
                {art.docentStory}
              </p>
            </div>
          </div>

          <div className="mt-8">
            {isDefaultStory ? (
              <button 
                onClick={handleGenerateDocent}
                disabled={isGenerating}
                className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-[#2a2b2d] to-[#151617] hover:from-[#8a6d3b] hover:to-[#735a2f] text-white rounded-md font-extrabold text-xs tracking-wider shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-40 cursor-pointer uppercase"
              >
                {isGenerating ? "✨ 제미나이가 예술 해설을 엄선 작성 중..." : "✨ AI 도슨트 스크립트 도록 생성"}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                {!isSpeaking || isPaused ? (
                  <button 
                    onClick={handlePlayTTS}
                    className="w-full px-6 py-4 bg-gradient-to-r from-[#8a6d3b] to-[#735a2f] hover:from-[#9c7d46] hover:to-[#856a39] text-white rounded-md font-black text-xs tracking-wider shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5 uppercase"
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