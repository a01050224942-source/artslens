"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function ArtworkDetail() {
  const params = useParams();
  const router = useRouter();
  const [art, setArt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false); // 로딩 상태 관리

  // 🔊 TTS 오디오 관련 상태 추가
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

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
  }, [params.id]);

  // 🔊 페이지를 이탈할 때 오디오 가이드가 계속 나오는 현상 방지 (메모리 누수 차단)
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 🛠️ 제미나이 백엔드 API와 한/영 다국어 스키마 계약을 연동하는 리모컨 함수
  const handleGenerateDocent = async () => {
    if (!art) return;
    setIsGenerating(true);

    try {
      const response = await fetch("/api/docent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleKo: art.titleKo || "",                  // 🎯 한글 제목 패키징
          titleEn: art.titleEn || art.title || "",     // 🎯 영어 원제 매핑
          artist: art.artist || "Unknown Artist",
          year: art.year || "Unknown",
          style: art.style || "European Paintings",
        }),
      });

      const data = await response.json();

      // 제미나이가 리턴해준 최종 확정 한글 정보들과 오디오 대본을 상태 및 DB에 동시 업데이트
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

  // 🔊 TTS: 오디오 재생 및 이어듣기 함수
  const handlePlayTTS = () => {
    if (typeof window === "undefined" || !window.speechSynthesis || !art?.docentStory) return;
    const synth = window.speechSynthesis;

    // 일시정지 상태였다면 이어서 재생
    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    // 완전히 처음부터 재생할 때는 기존에 나오던 음성을 먼저 취소
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(art.docentStory);
    utterance.lang = "ko-KR"; // 한국어 지원 설정
    utterance.rate = 1.0;     // 말하기 속도 (1.0이 기본)

    // 재생 완료 시 상태 초기화
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

  // 🔊 TTS: 오디오 일시정지 함수
  const handlePauseTTS = () => {
    if (typeof window !== "undefined" && window.speechSynthesis && isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  };

  // 🔊 TTS: 오디오 완전 정지 함수
  const handleStopTTS = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">작품 정보를 불러오는 중입니다...</div>;
  if (!art) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">작품을 찾을 수 없습니다.</div>;

  // 기본 문구이거나 데이터가 유실되었을 때 생성 유도 트리거 작동
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
        <div className="md:w-1/2 bg-black flex items-center justify-center p-8 border-r border-gray-700/50">
          <img 
            src={art.imageUrl || art.image} 
            alt={art.titleKo || art.titleEn || art.title} 
            className="max-h-[550px] object-contain shadow-2xl rounded-lg transition-transform duration-300 hover:scale-[1.01]"
          />
        </div>

        {/* 오른쪽: 최고급 명화 정보 및 오디오 텍스트 디스플레이 레이아웃 영역 */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center">
          <div className="mb-3 text-xs font-bold text-blue-400 uppercase tracking-widest">{art.style || "European Paintings"}</div>
          
          {/* 🎯 개선 사항: 한글 작품명 레이어 선행 배치 및 하이브리드 폴백 처리 */}
          <h1 className="text-4xl font-black mb-1 tracking-tight text-white">
            {art.titleKo && art.titleKo !== "작품명 번역 중" ? art.titleKo : (art.titleEn || art.title)}
          </h1>
          
          {/* 🎯 개선 사항: 세련된 서체의 영어 원제목 서브 배치 */}
          <h2 className="text-md italic font-serif text-gray-400 mb-6 tracking-wide">
            {art.titleEn && art.titleKo !== art.titleEn ? art.titleEn : ""}
          </h2>
          
          {/* 🎯 개선 사항: 한글 작가명이 있다면 우선 바인딩 */}
          <p className="text-md text-gray-400 mb-8 border-b border-gray-700 pb-6 font-medium">
            {art.artistKo || art.artist}, <span className="text-gray-500">{art.year}</span>
          </p>
          
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 shadow-inner">
            <h3 className="text-sm font-black mb-3 flex items-center tracking-wider text-gray-300">
              <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded mr-2 tracking-normal">AI DOCENT</span>
              AUDIO GUIDE SCRIPT
            </h3>
            <p className={`leading-relaxed text-sm ${isDefaultStory ? "text-gray-500 italic" : "text-gray-200 font-normal"}`}>
              {art.docentStory}
            </p>
            
            {/* 해설이 없을 때만 생성 버튼이 나타납니다 */}
            {isDefaultStory ? (
              <button 
                onClick={handleGenerateDocent}
                disabled={isGenerating}
                className="mt-6 bg-blue-600 text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-wide hover:bg-blue-500 disabled:bg-gray-700 transition-all w-full shadow-lg"
              >
                {isGenerating ? "✨ 제미나이가 예술적 분석을 정밀 수행 중..." : "✨ AI 도슨트 오디오 가이드 생성"}
              </button>
            ) : (
              /* 🔊 오디오 플레이어 컨트롤러 인터페이스 리액터 영역 */
              <div className="flex flex-col gap-2 mt-6">
                {!isSpeaking || isPaused ? (
                  <button 
                    onClick={handlePlayTTS}
                    className="bg-white text-black px-8 py-3.5 rounded-full font-bold text-sm tracking-wide hover:bg-gray-100 transition-all w-full shadow-lg flex items-center justify-center gap-2"
                  >
                    {isPaused ? "▶️ 오디오 가이드 이어듣기" : "🔊 오디오 가이드 재생"}
                  </button>
                ) : (
                  <button 
                    onClick={handlePauseTTS}
                    className="bg-amber-500 text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-wide hover:bg-amber-600 transition-all w-full shadow-lg"
                  >
                    ⏸️ 오디오 가이드 일시정지
                  </button>
                )}

                {/* 재생 중이거나 일시정지 상태일 때만 '처음부터 다시 듣기' 버튼 활성화 */}
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