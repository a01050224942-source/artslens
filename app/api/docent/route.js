import { NextResponse } from "next/server";
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 가은 님의 진짜 API 키를 넣어주세요 (또는 process.env.NEXT_PUBLIC_GEMINI_API_KEY 사용)
const YOUR_ACTUAL_API_KEY = "AIzaSyCBBrIT-zyByewmOmhpL9-Xm5kBkM9TolI"; 
const genAI = new GoogleGenerativeAI(YOUR_ACTUAL_API_KEY);

export async function POST(request) {
  try {
    const { title, artist, year, style } = await request.json();
    
    // 아까 성공했던 주소 그대로 사용하되, JSON 형태로만 응답하도록 설정(responseMimeType)을 추가합니다.
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      당신은 미술 갤러리 '아트렌즈(ArtLens)'의 전문 도슨트입니다.
      다음 제공된 영어 작품 정보를 바탕으로 아래의 JSON 형식에 정확히 맞춰 답변해주세요.

      [작품 정보]
      - 영어 제목: ${title}
      - 영어 작가명: ${artist}
      - 제작 연도: ${year}
      - 화풍/스타일: ${style}

      [요구사항]
      1. 영어 제목(title)을 한국어로 가장 자연스럽고 미술계에서 널리 알려진 이름으로 번역하여 'titleKo'에 넣으세요.
      2. 영어 작가명(artist)을 외래어 표기법에 맞게 한국어로 번역하여 'artistKo'에 넣으세요.
      3. 작품에 대한 도슨트 해설을 3문장 내외로 재미있고 흥미롭게 작성하여 'story'에 넣으세요.

      [출력 JSON 포맷]
      {
        "titleKo": "한국어 작품 제목",
        "artistKo": "한국어 작가명",
        "story": "도슨트 해설 내용..."
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text();

    // AI가 준 JSON 문자열을 자바스크립트 객체로 파싱합니다.
    const data = JSON.parse(jsonText);

    // 프론트엔드(상세 페이지)로 한글 제목, 한글 작가명, 해설을 한방에 리턴합니다.
    return NextResponse.json({ 
      titleKo: data.titleKo, 
      artistKo: data.artistKo, 
      story: data.story 
    }, { status: 200 });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}