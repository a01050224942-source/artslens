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

  // 👤 로그인 유저 및 🔖 북마크 상태 추가
  const [user, setUser] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    // 1. 작품 상세 정보 땡겨오기
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

    // 2. 👤 인증 상태 및 실시간 유저 북마크 장부 매핑 스캔
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && params.id) {
        // users 컬렉션에서 내 이메일(또는 uid)로 된 문서 개방
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          // 내가 가진 북마크 배열 내에 현재 작품 ID가 포인팅되어 있는지 검증
          const bookmarks = userData.bookmarks || [];
          setIsBookmarked(bookmarks.includes(params.id));
        }
      }
    });

    return () => unsubscribe();
  }, [params.id]);

  // 🔊 이탈 시 TTS 취소 안전장치
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 🔖 [핵심 추가]: 북마크 클릭 핸들러 리모컨 함수
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
        // 🗑️ 이미 북마크된 상태라면 내 장부 배열에서 원자 단위 삭제
        await updateDoc(userDocRef, {
          bookmarks: arrayRemove(params.id)
        });
        setIsBookmarked(false);
        alert("🔖 북마크가 해제되었습니다.");
      } else {
        // ➕ 북마크가 안 된 상태라면 내 장부 배열에 신규 추가 (기존 장부가 없으면 자동으로 문서 생성 병합)
        await updateDoc(userDocRef, {
          bookmarks: arrayUnion(params.id)
        }).catch(async (err) => {
          // 만약 유저 도큐먼트 자체가 아예 존재하지 않는 신규 유저일 때를 대비한 방어선 폴백
          if (err.code === "not-found") {
            const { setDoc } = await import("firebase/firestore");
            await setDoc(userDocRef, { bookmarks: [params.id] });
          } else {
            throw err;
          }
        });
        setIsBookmarked(true);
        alert("💛 맘에 드는 작품으로 북마크되었습니다! 마이페이지에서 확인 가능합니다.");
      }
    } catch (error) {
      console.error("북마크 연동 오류:", error);
      alert("북마크 처리 중 에러가 발생했습니다.");
    } finally {
      setBookmarkLoading(false);
    }
  };

  // 🛠️ 제미나이 도슨트 대본 생성 라우터 링킹 함수
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

  // 🔊 TTS: 프리미엄 구글 한국어 성우 재생 로직 보존
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

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">작품 정보를 불러오는 중입니다...</div>;
  if (!art) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">작품을 찾을 수 없습니다.</div>;

  const isDefaultStory = !art.docentStory || art.docentStory === "현재 AI 도슨트가 이 작품을 분석 중입니다...";

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <button 
        onClick={() => router.back()} 
        className="mb-6 text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-1"
      >
        ← 갤러리로 돌아가기
      </button>

      <div className="max-w-6xl mx-auto bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row backdrop-blur-sm">
        {/* 왼쪽: 고화질 명화 이미지 렌더링 영역 */}
        <div className="md:w-1/2 bg-black flex items-center justify-center p-8 border-r border-gray-700/50 relative group">
          <img 
            src={art.imageUrl || art.image} 
            alt={art.titleEn || art.title} 
            className="max-h-[550px] object-contain shadow-2xl rounded-lg transition-transform duration-300 group-hover:scale-[1.01]"
          />
          
          {/* 🎯 [인터페이스 이식]: 이미지 좌측 상단에 떠 있는 모던 디자인 북마크 하트 버튼 플로팅 */}
          <button
            onClick={handleToggleBookmark}
            disabled={bookmarkLoading}
            className="absolute top-12 left-12 p-3.5 bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-full hover:scale-110 active:scale-95 text-xl shadow-2xl transition-all duration-300"
          >
            {isBookmarked ? "💛" : "🤍"}
          </button>
        </div>

        {/* 오른쪽: 명화 정보 및 오디오 텍스트 레이아웃 영역 */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center">
          {/* 상단 장르 뱃지와 북마크 텍스트 링크 정렬 */}
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest">{art.style || "European Paintings"}</div>
            <button 
              onClick={handleToggleBookmark} 
              className="text-xs font-semibold text-gray-400 hover:text-white transition-colors underline cursor-pointer"
            >
              {isBookmarked ? "🔖 북마크 취소하기" : "🔖 내 컬렉션에 추가"}
            </button>
          </div>
          
          <h1 className="text-4xl font-black mb-2 tracking-tight text-white font-sans">
            {art.titleEn || art.title || "Untitled Masterpiece"}
          </h1>
          
          {art.titleKo && art.titleKo !== "작품명 번역 중" && art.titleKo !== art.titleEn && (
            <h2 className="text-sm font-medium text-indigo-400 mb-6 tracking-wide">
              국내 한글 통칭: {art.titleKo}
            </h2>
          )}
          
          <p className="text-md text-gray-400 mb-8 border-b border-gray-700 pb-6 font-medium font-serif italic">
            {art.artist || "Unknown Artist"}, <span className="text-gray-500 font-sans not-italic">{art.year}</span>
          </p>
          
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 shadow-inner">
            <h3 className="text-sm font-black mb-3 flex items-center tracking-wider text-gray-300">
              <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded mr-2 tracking-normal">AI DOCENT</span>
              AUDIO GUIDE SCRIPT
            </h3>
            <p className={`leading-relaxed text-sm ${isDefaultStory ? "text-gray-500 italic" : "text-gray-200 font-normal"}`}>
              {art.docentStory}
            </p>
            
            {isDefaultStory ? (
              <button 
                onClick={handleGenerateDocent}
                disabled={isGenerating}
                className="mt-6 bg-blue-600 text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-wide hover:bg-blue-500 disabled:bg-gray-700 transition-all w-full shadow-lg"
              >
                {isGenerating ? "✨ 제미나이가 예술적 분석을 정밀 수행 중..." : "✨ AI 도슨트 오디오 가이드 생성"}
              </button>
            ) : (
              <div className="flex flex-col gap-2 mt-6">
                {!isSpeaking || isPaused ? (
                  <button 
                    onClick={handlePlayTTS}
                    className="bg-white text-black px-8 py-3.5 rounded-full font-bold text-sm tracking-wide hover:bg-gray-100 transition-all w-full shadow-lg flex items-center justify-center gap-2"
                  >
                    {isPaused ? "▶️ 도슨트 이어서 청취하기" : "🔊 오디오 가이드 재생"}
                  </button>
                ) : (
                  <button 
                    onClick={handlePauseTTS}
                    className="bg-amber-500 text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-wide hover:bg-amber-600 transition-all w-full shadow-lg"
                  >
                    ⏸️ 오디오 가이드 일시정지
                  </button>
                )}

                {(isSpeaking || isPaused) && (
                  <button 
                    onClick={handleStopTTS}
                    className="text-xs text-gray-500 hover:text-rose-400 transition-all underline mt-3 text-center cursor-pointer tracking-tight"
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