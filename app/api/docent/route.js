import { NextResponse } from "next/server";
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 가은 님의 키를 직접 넣으세요
const YOUR_ACTUAL_API_KEY = "AIzaSyD_TnswokTb4lvrs_JRX8_KrcLTtSiVod4"; 
const genAI = new GoogleGenerativeAI(YOUR_ACTUAL_API_KEY);

export async function POST(request) {
  try {
    const { title, artist, year, style } = await request.json();
    
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `당신은 도슨트입니다. 다음 작품을 3문장으로 설명하세요. 제목:${title}, 작가:${artist}`;

    // 복잡한 옵션 없이 가장 기본형으로 호출합니다.
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const story = response.text();

    return NextResponse.json({ story: story }, { status: 200 });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}