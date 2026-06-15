import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🎯 [인프라 치트키 1] Vercel 환경 변수가 느리게 땡겨와질 때를 대비한 2중 방어선
// 링킹 꼬임이 의심된다면 따옴표 안에 새로 발급받으신 진짜 제미나이 새 API 키(AIzaSy...)를 생으로 적으셔도 됩니다!
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "가은님의_진짜_제미나이_새_API_KEY_문자열";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 🎯 [인프라 치트키 2] Vercel 기본 10초 타임아웃 제한을 완벽하게 해제하고 버저비터 프리패스로 뚫어버리는 선언
export const runtime = "edge";

export async function POST(request) {
  try {
    // 1. 프론트엔드가 상세페이지에서 쏘아 올린 명화 정보 및 '선택된 관점 키워드들' 수신
    const body = await request.json();
    const { titleEn, titleKo, artist, year, style, selectedKeywords } = body;

    if (!GEMINI_API_KEY) {
      console.error("❌ 인프라 패닉: 제미나이 API 자격 증명이 유실되었습니다.");
      return NextResponse.json({ error: "Gemini API Key Missing" }, { status: 500 });
    }

    // 2. 가장 똑똑하고 텍스트 생성 전송률이 높은 최신형 추론 인스턴스 호출
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // 🎯 [핵심 패치]: 사용자가 선택한 키워드가 있으면 지시사항으로 조립하고, 없으면 종합 해설로 대체하는 동적 텍스트 설계
    const keywordsInstructions = selectedKeywords && selectedKeywords.length > 0
      ? `특히 관람객이 선택한 다음의 핵심 관점들을 심층적으로 분석하고, 유기적으로 결합하여 풍성한 스토리텔링을 조립해 주세요: [${selectedKeywords.join(", ")}]`
      : "작품에 대한 전반적인 정보, 거장의 생애, 시대적 사회 배경, 그리고 미술사적 의의를 종합적으로 아우르는 깊이 있는 명품 해설을 작성해 주세요.";

    // 3. 캡스톤 디자인 심사위원 교수님들의 감탄을 자아낼 키워드 맞춤형 도슨트 페르소나 주입
    const prompt = `
      당신은 전 세계의 고전 명화를 정밀 분석하고 관람객에게 깊이 있는 감동을 전하는 전문 AI 오디오 도슨트 가이드, 'ArtLens'입니다.
      제공된 명화 메타데이터와 관람객이 선택한 맞춤 관심사 가이드를 기반으로 단 하나뿐인 스토리텔링 형식의 오디오 해설 스크립트를 작성해 주세요.

      [작품 기본 정보]
      - 오리지널 영문 제목: ${titleEn || "Unknown"}
      - 기존 한국어 통칭: ${titleKo || "Unknown"}
      - 거장 이름: ${artist || "Unknown Artist"}
      - 제작 연도: ${year || "Unknown"}
      - 사조/카테고리: ${style || "European Paintings"}

      [💡 이번 해설의 맞춤 포커싱 지시사항]
      ${keywordsInstructions}

      [작성 수칙]
      1. 반드시 우아하고 지적이면서도 친근함이 느껴지는 한국어 경어체("-입니다", "-해보세요", "-어떨까요?")로 작성하세요.
      2. 단순 사실 나열이 아니라, 지시사항에 기술된 키워드들에 초점을 맞춰 한 편의 수려한 미술 에세이처럼 흐름을 이어가세요.
      3. 오디오 TTS 재생용이므로 특수문자(*, #, -, _)는 절대로 섞지 마세요. 가독성을 위해 문단 구분을 줄바꿈으로만 처리하세요.
      4. 한국어 대중에게 가장 친숙하게 번역된 한국어 작품명과 작가명을 새로 추론하여 'titleKo'와 'artistKo'에 각각 매핑하세요.

      [출력 JSON 포맷 규칙]
      {
        "titleKo": "가장 자연스럽고 통용되는 한글 작품명",
        "artistKo": "가장 자연스럽고 통용되는 한글 작가명",
        "story": "여기에 수백 자 분량의 감동적이고 깊이 있는 커스텀 도슨트 해설 텍스트를 담으세요."
      }
    `;

    // 4. 제미나이 신경망 연산 가동 및 응답 수신
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // 5. 정합성 파싱 완료 후 프론트엔드로 통과 계약 방출
    const data = JSON.parse(responseText);
    return NextResponse.json({
      titleKo: data.titleKo || titleKo,
      artistKo: data.artistKo || artist,
      story: data.story || "해설을 생성하는 도중 공백이 발생했습니다."
    }, { status: 200 });

  } catch (error) {
    console.error("❌ 도슨트 백엔드 크래시 사유:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}