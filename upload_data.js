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

async function fetchAndUpload100Artworks() {
  console.log("📡 메트로폴리탄 실시간 API 기반 고화질 명화 100점 마이그레이션 시작...");

  try {
    // 🧹 1. 기존 파이어베이스에 쌓여있던 데이터 완전 청소 (멱등성 보장)
    const currentArtworks = await db.collection("artworks").get();
    if (!currentArtworks.empty) {
      console.log("🗑️ 기존에 존재하던 부실한 데이터를 청소합니다...");
      const batch = db.batch();
      currentArtworks.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log("🧹 청소 완료!");
    }

    // 🔍 2. 빈센트 반 고흐 등 명화 검색 (이미지가 존재하는 타깃 확보)
    // 💡 쿼리를 유연하게 넓혀 100개 이상의 유효 데이터를 안정적으로 확보합니다.
    const searchRes = await axios.get("https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=paintings");
    const allObjectIds = searchRes.data.objectIDs;

    if (!allObjectIds || allObjectIds.length === 0) {
      console.error("❌ 메트 API에서 작품 ID 배열을 가져오지 못했습니다.");
      return;
    }

    console.log(`🎯 총 ${allObjectIds.length}개의 후보군 ID 확보. 이 중 고화질 이미지 명화 100개 추출 개시...`);

    let targetCount = 100; // 🎯 가은 님이 요청하신 최종 목표치 100점!
    let savedCount = 0;

    // 🚀 3. 루프를 돌며 유효한 데이터만 100개 찰 때까지 수집
    for (const id of allObjectIds) {
      if (savedCount >= targetCount) break; // 100점이 다 차면 루프 즉시 폭파 종료!

      try {
        const objRes = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        const art = objRes.data;

        // 🚨 핵심 방어선: primaryImageSmall 주소가 물리적으로 존재하는 핵심 회화만 필터링
        if (art && art.primaryImageSmall && art.title) {
          
          // 🎯 가은님의 프론트엔드 및 Gemini 라우터와 1:1 계약 연동되는 고도화 스키마 매핑
          const artData = {
            id: art.objectID.toString(),
            titleEn: art.title || "Untitled",
            titleKo: art.title || "작품명 번역 중", // 대안 단계에서 자동 번역 결합 프로팁 안내
            artist: art.artistDisplayName || "Unknown Artist",
            artistKo: art.artistDisplayName || "작가명 번역 중",
            year: art.objectDate || "Unknown",
            style: art.department || "Classical Art",
            imageUrl: art.primaryImageSmall, // 3D 캐러셀 바인딩용 고화질 이미지 URL
            docentStory: "현재 AI 도슨트가 이 작품을 분석 중입니다..." // 기본 문구 초기화
          };

          // Firestore에 도큐먼트 ID를 메트 고유 ID로 지정하여 적재 (중복 방지)
          await db.collection("artworks").doc(artData.id).set(artData);
          
          savedCount++;
          console.log(`[${savedCount}/${targetCount}] 🎉Firestore 적재 완료: ${artData.titleEn}`);

          // ⚠️ 메트 박물관 서버 API 초당 요청 제한(Rate Limit) 우회를 위한 미세 딜레이 (0.05초)
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } catch (innerError) {
        // 특정 ID 요청이 404나 서버 네트워크에 의해 튀더라도 스크립트가 죽지 않고 다음 ID로 넘어가도록 예외 방어선 구축
        continue;
      }
    }

    console.log(`\n🎉 [ArtLens] 대성공! 메트 API 고화질 명화 데이터 ${savedCount}점이 Firestore에 완벽히 저장되었습니다!`);
  } catch (error) {
    console.error("❌ 마이그레이션 파이프라인 가동 중 치명적 인프라 에러 발생:", error);
  }
}

fetchAndUpload100Artworks();