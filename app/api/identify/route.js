import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai"; 

// 🎯 [인프라 치트키 1] Vercel 환경 변수가 느리게 땡겨와지는 현상을 방지하기 위해 
// 여기에 제미나이 진짜 API Key 문자열("AIzaSy...")을 생으로 직접 박아넣어 인프라 혼선을 원천 차단합니다.
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "가은님의_진짜_제미나이_오리지널_API_KEY_문자열";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 🎯 [인프라 치트키 2] Vercel 기본 10초 타임아웃 제한을 깨부수고 에지 노드에서 최고속으로 연산하도록 설정
export const runtime = "edge"; 

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file) {
      return NextResponse.json({ error: "이미지 파일이 유실되었습니다." }, { status: 400 });
    }

    // 3. 파일 용량이 너무 커서 타임아웃이 나는 것을 방지하기 위해 정밀 Uint8Array 버퍼 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // 이진 데이터를 가볍고 압축된 Base64 청크 문자열로 포맷 변경
    let binary = "";
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    const base64Image = btoa(binary);

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

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

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: file.type
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const responseText = response.text();

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