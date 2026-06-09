import { NextResponse } from "next/server";
const { GoogleGenerativeAI } = require("@google/generative-ai");

const YOUR_ACTUAL_API_KEY = "AIzaSyCBBrIT-zyByewmOmhpL9-Xm5kBkM9TolI";
const genAI = new GoogleGenerativeAI(YOUR_ACTUAL_API_KEY);

export async function POST(request) {
  try {
    // 1. 프론트엔드에서 보낸 폼데이터(이미지 파일) 꺼내기
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file) {
      return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
    }

    // 2. Next.js 환경에서 파일을 바이너리 버퍼 및 Base64로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    // 3. 시각 지능(Vision)을 지원하는 Gemini 모델 설정 및 JSON 모드 활성화
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", 
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      당신은 미술품 식별 전문가입니다. 제공된 이미지 속 미술 작품을 분석하여 정확한 영어 제목과 작가명을 맞춰주세요.
      반드시 아래 제시된 JSON 포맷으로만 답변해야 합니다.

      [출력 JSON 포맷]
      {
        "title": "정확한 영어 작품 제목 (예: The Starry Night)",
        "artist": "정확한 영어 작가명 (예: Vincent van Gogh)"
      }
    `;

    // 4. 텍스트 프롬프트와 이미지 데이터를 함께 Gemini에게 전달
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: file.type
        }
      }
    ]);

    const response = await result.response;
    const jsonText = response.text();
    const data = JSON.parse(jsonText);

    // 5. 인식된 영어 제목과 작가명을 프론트엔드로 반환
    return NextResponse.json({
      title: data.title,
      artist: data.artist
    }, { status: 200 });

  } catch (error) {
    console.error("Image Identification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}