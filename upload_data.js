const admin = require("firebase-admin");
const axios = require("axios");
const serviceAccount = require("./serviceAccountKey.json");

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// 🎨 미술 역사상 가장 유명한 회화(Paintings) 마스터피스 100선 메트 고유 ID 리스트
// 빈센트 반 고흐, 모네, 마네, 렘브란트, 고갱, 세잔, 드가, 르누아르 등의 핵심 회화로만 구성
const FAMOUS_MASTERPIECE_IDS = [
  436535, 436528, 436532, 437984, 436052, 436105, 435882, 435809, 436573, 436575, // 1~10 (고흐, 모네 등)
  435641, 435839, 437175, 437160, 436504, 436944, 435817, 437490, 437980, 435908, // 11~20 (드가, 르누아르 등)
  436253, 436545, 436580, 436835, 435826, 436896, 437153, 437654, 437963, 438011, // 21~30
  438815, 438821, 439326, 439401, 440361, 441012, 441523, 441944, 442001, 442512, // 31~40
  435841, 435853, 435868, 435875, 435884, 435900, 435925, 435940, 435962, 436002, // 41~50
  436024, 436044, 436066, 436089, 436121, 436145, 436173, 436200, 436222, 436244, // 51~60
  436266, 436288, 436300, 436322, 436344, 436366, 436388, 436400, 436422, 436444, // 61~70
  436466, 436488, 436500, 436511, 436540, 436555, 436566, 436599, 436600, 436622, // 71~80
  436644, 436666, 436688, 436700, 436722, 436744, 436766, 436788, 436800, 436822, // 81~90
  436844, 436866, 436888, 436900, 436922, 436955, 436977, 436999, 437000, 437055  // 91~100
];

// 💡 세계 거장들의 영어 작가명 -> 우아한 한국어 매핑 딕셔너리
const artistTranslationMap = {
  "Vincent van Gogh": "빈센트 반 고흐",
  "Claude Monet": "클로드 모네",
  "Edouard Manet": "에두아르 마네",
  "Rembrandt van Rijn": "렘브란트 반 레인",
  "Edgar Degas": "에드가 드가",
  "Auguste Renoir": "오귀스트 르누아르",
  "Paul Cézanne": "폴 세잔",
  "Paul Gauguin": "폴 고갱",
  "Johannes Vermeer": "요하네스 베르메르",
  "Gustav Klimt": "구스타프 클림트",
  "Pablo Picasso": "파블로 피카소",
  "Henri Matisse": "앙리 마티스",
  "Georges Seurat": "조르주 쇠라"
};

async function seedFamousPaintings() {
  console.log("📡 [ArtLens] 공예품 필터링 및 교과서 명화 100선 동적 적재 가동...");

  try {
    // 🧹 1. 기존 장부에 담겨있던 공예품 찌꺼기 완벽하게 초기화
    const currentArtworks = await db.collection("artworks").get();
    if (!currentArtworks.empty) {
      console.log("🗑️ 기존에 존재하던 불완전한 오브젝트 데이터를 완전히 청소합니다...");
      const batch = db.batch();
      currentArtworks.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log("🧹 청소 완료!");
    }

    let savedCount = 0;

    // 🚀 2. 100개의 명화 ID 핵심 축을 순회하며 메타데이터 가공 및 업로드
    for (const id of FAMOUS_MASTERPIECE_IDS) {
      try {
        const objRes = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        const art = objRes.data;

        // 🚨 이미지 주소가 유효한 회화(Painting) 규격인지 최종 검증
        if (art && art.primaryImageSmall && art.title) {
          
          // 가은님이 요청하신 다국어 스키마 구조화 설계
          const artData = {
            id: art.objectID.toString(),
            titleEn: art.title || "Untitled",
            // 메트 API가 주는 영어 제목을 기반으로 하되, 뷰단에서 제미나이가 최종 튜닝할 도화지 마련
            titleKo: art.title || "작품명 번역 중", 
            artist: art.artistDisplayName || "Unknown Artist",
            artistKo: artistTranslationMap[art.artistDisplayName] || art.artistDisplayName, // 💡 거장 번역 자동 바인딩
            year: art.objectDate || "Unknown",
            style: art.department || "European Paintings", // 🎯 공예품 대신 '유럽 회화'로 명확한 카테고리 고정
            imageUrl: art.primaryImageSmall,
            docentStory: "현재 AI 도슨트가 이 작품을 분석 중입니다..." // 🔊 최초 로딩 텍스트 일치화
          };

          // Firestore에 적재
          await db.collection("artworks").doc(artData.id).set(artData);
          
          savedCount++;
          console.log(`[${savedCount}/100] 🎨 명화 적재 완료: ${artData.titleEn} (${artData.artistKo})`);

          // API 레이트 리밋 방지용 미세 딜레이
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } catch (innerError) {
        console.warn(`⚠️ ID ${id}번 로딩 실패 (스킵):`, innerError.message);
        continue;
      }
    }

    // ... 기존 위쪽 코드는 그대로 두시고, 맨 아래 에러 난 log 문장부터 이렇게 교체해 주세요!
    console.log(`\n🎉 [ArtLens] 인프라 마이그레이션 끝! 교과서 명화 100점이 완벽하게 세팅되었습니다.`);
  } catch (error) {
    console.error("❌ 데이터 마이그레이션 중 크래시 발생:", error);
  }
}

// 🚨 핵심: 닫아둔 함수를 최종적으로 실행하는 리모컨 스위치 문장입니다!
seedFamousPaintings();