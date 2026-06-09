'use client';

import { useState, useEffect } from 'react';

export default function DocentTTS({ text }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [synth, setSynth] = useState(null);

  // 브라우저 환경(window)에서 SpeechSynthesis 객체 가져오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSynth(window.speechSynthesis);
    }
  }, []);

  // 재생 및 이어듣기
  const handlePlay = () => {
    if (!synth) return;

    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    // 새로운 음성을 실행하기 전에 기존에 재생 중이던 음성은 취소
    synth.cancel();

    // 읽을 텍스트와 언어 설정
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR'; // 한국어 설정
    utterance.rate = 1.0;     // 말하기 속도 (0.5 ~ 2)

    // 재생이 끝났을 때 상태 초기화
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

  // 일시정지
  const handlePause = () => {
    if (synth && isSpeaking) {
      synth.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  };

  // 정지
  const handleStop = () => {
    if (synth) {
      synth.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  // 사용자가 페이지를 나갈 때 음성 안내를 강제로 종료 (메모리 누수 방지)
  useEffect(() => {
    return () => {
      if (synth) synth.cancel();
    };
  }, [synth]);

  return (
    <div className="flex items-center gap-3 my-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
      <span className="text-sm font-medium text-gray-600">🎧 오디오 도슨트:</span>
      
      {!isSpeaking || isPaused ? (
        <button
          onClick={handlePlay}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPaused ? '이어듣기' : '해설 듣기'}
        </button>
      ) : (
        <button
          onClick={handlePause}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          일시정지
        </button>
      )}

      {(isSpeaking || isPaused) && (
        <button
          onClick={handleStop}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          정지
        </button>
      )}
    </div>
  );
}