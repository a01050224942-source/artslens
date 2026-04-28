const admin = require("firebase-admin");
const axios = require("axios");
const serviceAccount = require("./serviceAccountKey.json");

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function fetchAndUploadArtworks() {
  console.log("메트로폴리탄 API에서 데이터 수집을 시작합니다...");

  try {
    // 1. 고흐 그림(Paintings) ID 검색 (2차 발표용으로 20개만 먼저 가져옵니다)
    const searchRes = await axios.get("https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=Vincent van Gogh");
    const objectIds = searchRes.data.objectIDs.slice(0, 20); 
    
    let count = 0;
    for (const id of objectIds) {
      // 2. 각 ID별 상세 데이터 가져오기
      const objRes = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
      const art = objRes.data;

      if (art.primaryImageSmall) {
        const artData = {
          id: art.objectID.toString(),
          title: art.title || "제목 미상",
          artist: art.artistDisplayName || "작자 미상",
          year: art.objectDate || "연도 미상",
          style: art.department || "분류 미상",
          imageUrl: art.primaryImageSmall,
          docentStory: "현재 AI 도슨트가 이 작품을 분석 중입니다..." 
        };

        // 3. Firestore에 저장
        await db.collection("artworks").doc(artData.id).set(artData);
        console.log(`[${++count}] 저장 완료: ${artData.title}`);
      }
    }
    console.log("🎉 명화 데이터 적재가 완료되었습니다! Firebase 콘솔을 확인해보세요.");
  } catch (error) {
    console.error("오류 발생:", error);
  }
}

fetchAndUploadArtworks();