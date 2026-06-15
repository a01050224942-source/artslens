import { NextResponse } from "next/server";

// 🎯 [인프라 치트키 1] Vercel 환경 변수가 느리게 땡겨와질 때를 대비한 2중 방어선
// 링킹 꼬임이 의심된다면 따옴표 안에 새로 발급받으신 진짜 그록 새 API 키(gsk_...)를 생으로 적으셔도 됩니다!
const GROQ_API_KEY = process.env.GROQ_API_KEY || "가은님의_진짜_그록_새_API_KEY_문자열";

// 🎯 [인프라 치트키 2] Vercel 기본 10초 타임아웃 제한을 완벽하게 해제하고 버저비터 프리패스로 뚫어버리는 선언
export const runtime = "edge";

export async function POST(request) {
  try {
    // 1. 프론트엔드가 상세페이지에서 쏘아 올린 명화 정보 및 '선택된 관점 키워드들' 수신
    const body = await request.json();
    const { titleEn, titleKo, artist, year, style, selectedKeywords } = body;

    if (!GROQ_API_KEY) {
      console.error("❌ 인프라 패닉: 그록 API 자격 증명이 유실되었습니다.");
      return NextResponse.json({ error: "Groq API Key Missing" }, { status: 500 });
    }

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

    // 4. 그록(Groq) 초고속 추론 엔진 가동 및 응답 수신
    // 원본의 JSON 강제 옵션을 충족하기 위해 response_format 구조를 확실하게 바인딩했습니다.
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }, // 🎯 JSON 파싱 에러 완벽 원천 차단
        temperature: 0.6
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Groq 인프라 통신 실패");
    }

    const groqData = await response.json();
    const responseText = groqData.choices[0].message.content;

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