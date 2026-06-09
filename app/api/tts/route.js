import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { text } = await request.json();

    // 🎯 [인프라 방어선]: Vercel 대시보드 환경변수 대신 가은님의 새 부계정 API Key를 여기에 생으로 직접 박아넣어 인프라 캐시 오류를 완벽히 우회합니다.
    const ELEVENLABS_API_KEY = "여기에_새로_판_부계정의_진짜_sk_로_시작하는_API키를_넣으세요"; 
    
    // 한국어 차분한 여성 성우 보이스 ID (Rachel)
    const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 

    console.log("🔊 ElevenLabs 신경망 엔진에 직접 주입된 키로 오디오 합성 요청 생성...");

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2", // 다국어 지원 엔진 모델 고정
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    // 🚨 백엔드 에러 원인 정밀 로깅 추적선
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ ElevenLabs 서버 거부 사유 상세 로그:", JSON.stringify(errorData));
      throw new Error(`ElevenLabs API 응답 실패 (Status: ${response.status})`);
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });

  } catch (error) {
    console.error("❌ TTS 백엔드 런타임 크래시:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}