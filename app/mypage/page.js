"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function MyPage() {
  const [user, setUser] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarkedArtworks, setBookmarkedArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        // 로그인 안 한 유저는 로그인 페이지로 강제 압송
        router.push("/login");
        return;
      }
      setUser(currentUser);

      try {
        // 1. 내 유저 문서에서 북마크 ID 리스트(배열) 땡겨오기
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const bookmarkIds = userDocSnap.data().bookmarks || [];
          setBookmarks(bookmarkIds);

          // 2. [핵심 로직] 북마크된 각 ID를 가지고 작품 상세 정보 병렬로 다 긁어오기
          if (bookmarkIds.length > 0) {
            const artworkPromises = bookmarkIds.map(async (id) => {
              const artRef = doc(db, "artworks", id);
              const artSnap = await getDoc(artRef);
              return artSnap.exists() ? artSnap.data() : null;
            });

            const results = await Promise.all(artworkPromises);
            // 유효한 데이터만 필터링해서 상태에 저장
            setBookmarkedArtworks(results.filter((art) => art !== null));
          }
        }
      } catch (error) {
        console.error("마이페이지 로딩 에러:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">컬렉션을 불러오는 중...</div>;

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      {/* 상단 헤더 영역 */}
      <div className="max-w-7xl mx-auto flex justify-between items-end mb-12 border-b border-gray-800 pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">My Masterpiece Collection</h1>
<p className="text-gray-400 font-medium">
  <span className="text-blue-400">
    {user?.displayName || user?.email?.split("@")[0] || "User"}
  </span>{" "}
  님이 선별한 {bookmarkedArtworks.length}점의 마스터피스
</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => router.push("/")} className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm font-bold transition-all">🏠 갤러리 홈</button>
          <button onClick={handleLogout} className="px-5 py-2 bg-rose-900/30 text-rose-400 border border-rose-900/50 hover:bg-rose-900/50 rounded-full text-sm font-bold transition-all">로그아웃</button>
        </div>
      </div>

      {/* 북마크 리스트 그리드 영역 */}
      <div className="max-w-7xl mx-auto">
        {bookmarkedArtworks.length === 0 ? (
          <div className="text-center py-40 bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-700">
            <div className="text-6xl mb-6 text-gray-600">🤍</div>
            <h2 className="text-2xl font-bold text-gray-400 mb-4">아직 보관함이 비어있습니다.</h2>
            <button 
              onClick={() => router.push("/")}
              className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-500 transition-all"
            >
              명화 구경하러 가기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {bookmarkedArtworks.map((art) => (
              <div 
                key={art.id} 
                onClick={() => router.push(`/artwork/${art.id}`)}
                className="group cursor-pointer bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 hover:border-blue-500 transition-all duration-500 hover:-translate-y-2 shadow-xl"
              >
                <div className="h-64 overflow-hidden bg-black">
                  <img 
                    src={art.imageUrl} 
                    alt={art.titleEn} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="p-6">
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">{art.style}</div>
                  <h3 className="font-black text-lg leading-tight mb-1 truncate">{art.titleEn}</h3>
                  <p className="text-gray-400 text-sm italic font-serif">{art.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}