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

  // 바로 이 함수가 Gemini를 호출하는 핵심 리모컨입니다!
  const handleGenerateDocent = async () => {
    if (!art) return;
    setIsGenerating(true);

    try {
      const response = await fetch("/api/docent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: art.title,
          artist: art.artist,
          year: art.year,
          style: art.style,
        }),
      });

      const data = await response.json();

      if (data.story) {
        // 화면 텍스트 업데이트
        setArt((prev) => ({ ...prev, docentStory: data.story }));

        // Firebase DB에 해설 저장 (다음에 또 돈 안 들게!)
        const docRef = doc(db, "artworks", params.id);
        await updateDoc(docRef, {
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

  // 기본 문구인지 확인 (이미 해설이 있으면 버튼을 안 보여주기 위해)
  const isDefaultStory = art.docentStory === "현재 AI 도슨트가 이 작품을 분석 중입니다...";

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <button 
        onClick={() => router.back()} 
        className="mb-6 text-gray-400 hover:text-white transition-colors"
      >
        ← 갤러리로 돌아가기
      </button>

      <div className="max-w-6xl mx-auto bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* 왼쪽: 이미지 영역 */}
        <div className="md:w-1/2 bg-black flex items-center justify-center p-8">
          <img 
            src={art.imageUrl} 
            alt={art.title} 
            className="max-h-[600px] object-contain shadow-2xl"
          />
        </div>

        {/* 오른쪽: 정보 및 도슨트 영역 */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center">
          <div className="mb-2 text-xs font-bold text-blue-400 uppercase tracking-widest">{art.style}</div>
          <h1 className="text-4xl font-bold mb-4">{art.title}</h1>
          <p className="text-xl text-gray-400 mb-8 border-b border-gray-700 pb-6">{art.artist}, {art.year}</p>
          
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-bold mb-3 flex items-center">
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded mr-2">AI 도슨트</span>
              해설
            </h3>
            <p className={`leading-relaxed ${isDefaultStory ? "text-gray-500 italic" : "text-gray-200"}`}>
              {art.docentStory}
            </p>
            
            {/* 해설이 없을 때만 생성 버튼이 나타납니다 */}
            {isDefaultStory ? (
              <button 
                onClick={handleGenerateDocent}
                disabled={isGenerating}
                className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-500 disabled:bg-gray-600 transition-all w-full"
              >
                {isGenerating ? "✨ 해설 작성 중..." : "✨ AI 도슨트 해설 생성하기"}
              </button>
            ) : (
              /* 🔊 오디오 플레이어 컨트롤러 영역으로 교체 */
              <div className="flex flex-col gap-2 mt-6">
                {!isSpeaking || isPaused ? (
                  <button 
                    onClick={handlePlayTTS}
                    className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-all w-full shadow-md"
                  >
                    {isPaused ? "▶️ 오디오 가이드 이어듣기" : "🔊 오디오 가이드 재생"}
                  </button>
                ) : (
                  <button 
                    onClick={handlePauseTTS}
                    className="bg-amber-500 text-white px-8 py-3 rounded-full font-bold hover:bg-amber-600 transition-all w-full shadow-md"
                  >
                    ⏸️ 오디오 가이드 일시정지
                  </button>
                )}

                {/* 재생 중이거나 일시정지 상태일 때만 '처음부터 다시 듣기' 버튼 활성화 */}
                {(isSpeaking || isPaused) && (
                  <button 
                    onClick={handleStopTTS}
                    className="text-xs text-gray-400 hover:text-rose-400 transition-all underline mt-2 text-center cursor-pointer"
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