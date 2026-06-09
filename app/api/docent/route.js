import { NextResponse } from "next/server";
// 🎯 교정 완료: require 문법을 걷어내고 Next.js 서버리스 컨테이너 표준 import 문법으로 전면 전향
import { GoogleGenerativeAI } from "@google/generative-ai"; 

// 🎯 인프라 자격 증명: Vercel 환경 변수 장부에 심어둔 열쇠를 시스템 에지 단에서 다이렉트로 추적
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST(request) {
  try {
    // 1. 프론트엔드 상세 페이지 아키텍처 계약 정보 수신 및 구조 분해 할당
    const { titleKo, titleEn, artist, year, style } = await request.json();
    
    // 환경 변수가 정상적으로 바인딩되었는지 백엔드 터미널 내부 로그로 최종 방어선 구축
    if (!GEMINI_API_KEY) {
      console.error("❌ 인프라 경고: Vercel 환경 변수(NEXT_PUBLIC_GEMINI_API_KEY)가 등록되지 않았거나 유실되었습니다.");
      return NextResponse.json({ error: "API Key Missing in Vercel Environment" }, { status: 500 });
    }

    // 2. 제미나이 2.5 플래시 초고속 모델 인스턴스 생성 및 JSON 구조화 응답 스펙 선포
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // 3. 지능형 문맥 번역 및 도슨트 스토리텔링 융합 프롬프트 아키텍처 조립
    const prompt = `
      당신은 미술 갤러리 '아트렌즈(ArtLens)'의 수석 도슨트입니다.
      제공된 작품 정보를 바탕으로 하단의 출력 JSON 포맷에 정확히 맞춰 한국어로 전문적인 해설을 생성해 주세요.

      [입력된 작품 정보]
      - 기존 한글 제목 임시안: ${titleKo || "없음"}
      - 공식 영어 제목: ${titleEn}
      - 작가명: ${artist}
      - 제작 연도: ${year}
      - 화풍/스타일: ${style}

      [미션 및 페르소나 가이드라인]
      1. 만약 '기존 한글 제목 임시안'이 없거나 "작품명 번역 중" 혹은 영어와 똑같이 적혀 있다면, 공식 영어 제목(${titleEn})을 토대로 국내 서양미술사 학계 및 전시회에서 가장 표준적으로 통용되는 우아한 한글 제목으로 정밀 번역하여 'titleKo'에 넣으세요. 이미 명확한 한글 제목이 입력되어 있다면 그 이름을 그대로 사용하세요.
      2. 영어 작가명(${artist})을 국립국어원 외래어 표기법 및 미술계 관례에 맞게 자연스러운 한글 작가명으로 변환하여 'artistKo'에 넣으세요. (예: Vincent van Gogh -> 빈센트 반 고흐)
      3. 오디오 가이드용 도슨트 해설('story')을 '친절하고 교양 있는 한국어 존댓말 구어체(~체, ~입니다)' 스타일로 3문장 내외로 작성하세요. 작품의 숨겨진 비화, 화풍의 특징, 혹은 관람객이 주목해야 할 시각적 포인트를 짚어주어 지루하지 않고 흡입력 있게 스토리텔링해야 합니다.

      [출력 JSON 포맷 규칙]
      {
        "titleKo": "최종 확정된 한국어 작품 제목",
        "artistKo": "최종 확정된 한국어 작가명",
        "story": "안녕하세요, 아트렌즈 도슨트입니다. 이 작품은..."
      }
    `;

    // 4. 제미나이 가상 신경망 추론 엔진 가동 및 리턴 스트링 파싱
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text();

    const data = JSON.parse(jsonText);

    // 5. 컴포넌트 데이터 인터페이스 규격과 1:1로 일치시켜 JSON 응답 방출
    return NextResponse.json({ 
      titleKo: data.titleKo || titleKo, 
      artistKo: data.artistKo || artist, 
      story: data.story 
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Gemini API 서버사이드 런타임 크래시:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}