import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai"; 

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST(request) {
  try {
    // 1. 프론트엔드가 보낸 폼 데이터 스트림 수신
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file) {
      return NextResponse.json({ error: "이미지 파일이 유실되었습니다." }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      console.error("❌ 인프라 패닉: Vercel 환경 변수에 GEMINI API Key가 등록되지 않았습니다.");
      return NextResponse.json({ error: "Gemini API Key Missing" }, { status: 500 });
    }

    // 2. 🎯 [서버리스 버퍼 패닉 방어]: file.arrayBuffer()를 완벽하게 호환되는 Uint8Array 배열 바이트로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Uint8Array 구조체를 제미나이가 가동할 수 있는 Base64 아키텍처 문자열로 안전하게 인코딩
    const base64Image = Buffer.from(buffer).toString("base64");

    // 3. 가장 지능적이고 빠른 최신형 멀티모달 시각 엔진 인스턴스 소환
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // 4. 명화 매칭 데이터 정밀 저격을 위한 페르소나 프롬프트 조립
    const prompt = `
      당신은 미술 갤러리 '아트렌즈(ArtLens)'의 고전 명화 스캔 전용 AI 분석 엔진입니다.
      제공된 이미지 데이터를 분석하여 어떤 회화 작품인지 판독해 주세요.

      [판독 가이드라인]
      1. 분석된 작품의 영어 오리지널 타이틀(정확한 스펠링)을 'title' 필드에 넣으세요.
      2. 해당 작품을 그린 거장의 영어 이름을 'artist' 필드에 넣으세요.
      
      [출력 JSON 포맷 규칙]
      {
        "title": "The Starry Night",
        "artist": "Vincent van Gogh"
      }
    `;

    // 5. 제미나이 멀티모달 규격 양식으로 이미지 데이터 패키징
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: file.type
      }
    };

    // 6. 제미나이 가상 인공신경망 추론 엔진 가동 및 리턴 데이터 흡수
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const responseText = response.text();

    // 7. 파싱 결과 계약 승인 후 프론트엔드로 안전하게 반환
    const data = JSON.parse(responseText);
    return NextResponse.json({
      title: data.title || "Unknown Title",
      artist: data.artist || "Unknown Artist"
    }, { status: 200 });

  } catch (error) {
    console.error("❌ 이미지 분석 백엔드 최종 크래시 로그:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}