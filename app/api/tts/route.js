import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { text } = await request.json();

    // 💡 ElevenLabs에서 발급받은 가은님의 API Key를 대피시킵니다.
    const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "가은님의_일레븐랩스_키";
    
    // 한국어에 가장 최적화된 우아한 여성 성우 보이스 ID (Rachel 오디오 노드)
    const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 

    console.log("🔊 ElevenLabs 신경망 엔진에 오디오 합성 요청 생성...");

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2", // 다국어 지원 최신 인공지능 모델
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("ElevenLabs API 통신 오류 발생");
    }

    // 외부 서버가 뱉어준 정식 mp3 바이너리 바이츠(ArrayBuffer)를 그대로 흡수
    const audioBuffer = await response.arrayBuffer();

    // 프론트엔드 브라우저 오디오 객체가 다이렉트로 재생할 수 있게 정식 mp3 헤더 스펙으로 방출
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });

  } catch (error) {
    console.error("❌ TTS 백엔드 런타임 에러:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}