"use comprehension";
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function ArtworkDetail() {
  const params = useParams();
  const router = useRouter();
  const [art, setArt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false); // 로딩 상태 관리

  // 🔊 TTS 오디오 관련 상태 및 가상 오디오 플레이어 레프(ref) 추가
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef(null); // 🎯 ElevenLabs mp3 바이너리 버퍼를 핸들링할 코어 주소 저장소

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

  // 🔊 페이지를 이탈할 때 오디오 가이드가 계속 흘러나오는 현상 방지 (메모리 누수 원천 차단)
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
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
          titleKo: art.titleKo || "",                  // 한글 해설 생성을 위해 백엔드에는 자산 토스
          titleEn: art.titleEn || art.title || "",     // 원본 영어 원제 매핑
          artist: art.artist || "Unknown Artist",
          year: art.year || "Unknown",
          style: art.style || "European Paintings",
        }),
      });

      const data = await response.json();

      // 제미나이가 리턴해준 최종 확정 오디오 대본과 번역 자산을 상태 및 DB에 동시 업데이트
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

  // 🔊 100% 교정 완료: 구형 기계음을 파괴하고 백엔드 /api/tts 스트림을 받아와 재생하는 함수
  const handlePlayTTS = async () => {
    if (!art?.docentStory) return;

    // 일시정지 상태였다면 처음부터 다시 땡겨오지 않고 그 자리에서 이어서 재생 (컨테이너 세이빙)
    if (isPaused && audioRef.current) {
      audioRef.current.play();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    try {
      setIsSpeaking(true);
      
      // 📡 내 Next.js 백엔드 라우터로 제미나이 도슨트 대본을 쏘아 보냅니다.
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: art.docentStory }),
      });

      if (!response.ok) throw new Error("ElevenLabs mp3 바이너리 획득 실패");

      // 리턴된 순수 mp3 데이터 바이츠를 브라우저 가상 메모리 blob URL로 변환
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      // 기존에 혹시 돌고 있던 플레이어가 있다면 즉시 강제 정지 처리
      if (audioRef.current) audioRef.current.pause();
      
      // HTML5 표준 오디오 인스턴스 생성 후 바인딩
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // 오디오 스트리밍이 완전히 종료되었을 때 프론트엔드 버튼 컨트롤 상태 초기화
      audio.onended = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      audio.play();

    } catch (error) {
      console.error("오디오 가이드 ElevenLabs 연동 실패:", error);
      alert("인공지능 도슨트 고급 음성을 불러오지 못했습니다. 백엔드 라우터를 점검해 주세요.");
      setIsSpeaking(false);
    }
  };

  // 🔊 TTS: 오디오 일시정지 함수 교정
  const handlePauseTTS = () => {
    if (audioRef.current && isSpeaking) {
      audioRef.current.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  };

  // 🔊 TTS: 오디오 완전 정지 함수 교정
  const handleStopTTS = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // 오디오 재생 바 포인터를 맨 앞으로 강제 리셋
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
        <div className="md:w-1/2 bg-black flex items-center justify-center p-8 border-r border-gray-700/50">
          <img 
            src={art.imageUrl || art.image} 
            alt={art.titleEn || art.title} 
            className="max-h-[550px] object-contain shadow-2xl rounded-lg transition-transform duration-300 hover:scale-[1.01]"
          />
        </div>

        {/* 오른쪽: 최고급 명화 정보 및 오디오 텍스트 디스플레이 레이아웃 영역 */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center">
          <div className="mb-3 text-xs font-bold text-blue-400 uppercase tracking-widest">{art.style || "European Paintings"}</div>
          
          {/* 메인 화면과 완벽 매칭되도록 1순위 제목을 "영어 원제"로 굳건히 고정 */}
          <h1 className="text-4xl font-black mb-2 tracking-tight text-white font-sans">
            {art.titleEn || art.title || "Untitled Masterpiece"}
          </h1>
          
          {/* 기존 한글 제목은 메인에서 숨기는 대신, 영문 제목 아래에 세련된 서브 캡션 형태로 배치 */}
          {art.titleKo && art.titleKo !== "작품명 번역 중" && art.titleKo !== art.titleEn && (
            <h2 className="text-sm font-medium text-indigo-400 mb-6 tracking-wide">
              국내 한글 통칭: {art.titleKo}
            </h2>
          )}
          
          {/* 작가명 역시 메인 화면 톤앤매너와 맞춰 원본 영어 이름으로 일관성 있게 출력 */}
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
              /* 🔊 최첨단 하이엔드 AI 성우 오디오 플레이어 컨트롤러 인터페이스 */
              <div className="flex flex-col gap-2 mt-6">
                {!isSpeaking || isPaused ? (
                  <button 
                    onClick={handlePlayTTS}
                    className="bg-white text-black px-8 py-3.5 rounded-full font-bold text-sm tracking-wide hover:bg-gray-100 transition-all w-full shadow-lg flex items-center justify-center gap-2"
                  >
                    {isPaused ? "▶️ 도슨트 이어서 청취하기" : "🔊 오디오 가이드 고급 재생"}
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