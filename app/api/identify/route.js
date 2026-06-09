import { NextResponse } from "next/server";
// 🎯 교정 완료: require 문법을 원자 단위로 박멸하고 최신 ESM import 표준으로 교정
import { GoogleGenerativeAI } from "@google/generative-ai"; 

// Vercel 인프라 환경 변수 장부에서 제미나이 열쇠를 안전하게 땡겨옵니다.
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST(request) {
  try {
    // 1. 프론트엔드가 카메라 셔터로 쏘아 올린 폼 데이터 덩어리 수신
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file) {
      return NextResponse.json({ error: "이미지 파일이 유실되었습니다." }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      console.error("❌ 인프라 경고: 제미나이 API 환경 변수가 유실되었습니다.");
      return NextResponse.json({ error: "Gemini API Key Missing" }, { status: 500 });
    }

    // 2. 바이너리 이미지 파일을 제미나이가 읽을 수 있는 가상 메모리 버퍼 버츠(ArrayBuffer)로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. 시각 인식을 담당할 가장 똑똑한 멀티모달 추론 모델 지정
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // 4. 제미나이 시각 신경망 가이드라인 프롬프트 주입
    const prompt = `
      당신은 전 세계의 고전 명화 및 현대 미술품을 스캔하고 판독하는 아트렌즈(ArtLens) 전용 AI 시각 인식 엔진입니다.
      제공된 이미지 데이터를 정밀 분석하여 어떤 명화 작품인지 매칭해 주세요.

      [판독 규격 가이드라인]
      1. 분석된 작품의 영어 오리지널 타이틀(정확한 스펠링)을 'title'에 넣으세요.
      2. 작가 이름을 'artist'에 넣으세요.
      
      [출력 JSON 포맷 규칙]
      {
        "title": "The Starry Night",
        "artist": "Vincent van Gogh"
      }
    `;

    // 5. 멀티모달 파트 구조체 데이터 바인딩
    const imagePart = {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: file.type
      }
    };

    // 6. 이미지 분석 슛 및 리턴 스트링 JSON 파싱
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const data = JSON.parse(response.text());

    // 7. 정합성 검증 완료 후 프론트엔드로 통과 계약 방출
    return NextResponse.json({
      title: data.title || "Unknown Title",
      artist: data.artist || "Unknown Artist"
    }, { status: 200 });

  } catch (error) {
    console.error("❌ 이미지 분석 라우터 크래시 사유:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}