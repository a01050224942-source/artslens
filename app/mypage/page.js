"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MyPage() {
  const [user, setUser] = useState(null);
  const [bookmarkedArtworks, setBookmarkedArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        alert("로그인이 필요한 페이지입니다.");
        router.push("/login");
        return;
      }
      setUser(currentUser);

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const bookmarks = userData.bookmarks || [];

          if (bookmarks.length > 0) {
            const artCollection = collection(db, "artworks");
            const artSnapshot = await getDocs(artCollection);
            const allArtworks = artSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            const filtered = allArtworks.filter(art => bookmarks.includes(art.id));
            setBookmarkedArtworks(filtered);
          }
        }
      } catch (error) {
        console.error("북마크 목록 로드 오류:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("로그아웃 되었습니다.");
      router.push("/");
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#242629] flex items-center justify-center text-white font-medium">개인 수장고 확인 중...</div>;

  return (
    <div className="bg-[#242629] min-h-screen text-white font-sans scroll-smooth p-8 relative overflow-x-hidden">
      
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* 상단 통합 제어 헤더 스페이스 */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-800 pb-6 mb-12 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent font-sans">
              My Masterpiece Collection
            </h1>
            <p className="text-[#a38752] text-sm mt-2 font-medium tracking-wide">
              👤 <span className="text-[#e2c184] font-bold underline underline-offset-4 decoration-[#8a6d3b]">{user?.email?.split("@")[0]}</span>님이 선별한 {bookmarkedArtworks.length}점의 마스터피스 수장고
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/">
              <button className="px-5 py-2.5 bg-gradient-to-r from-[#2c2214] to-[#1c150c] hover:from-[#87672a] hover:to-[#6b501f] text-[#e2c184] font-bold text-xs rounded-full border border-[#a38752]/60 transition-all shadow-md cursor-pointer flex items-center gap-1">
                🏛️ 갤러리 홈
              </button>
            </Link>
            <button 
              onClick={handleLogout} 
              className="px-5 py-2.5 bg-[#1a1b1d] hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-full border border-neutral-700 transition-all font-bold text-xs cursor-pointer"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* 보관함 그리드 구역 */}
        {bookmarkedArtworks.length === 0 ? (
          <div className="text-center py-32 bg-[#1a1b1d] border-2 border-dashed border-neutral-800 p-8 rounded-none">
            <p className="text-neutral-500 font-medium text-sm">아직 수장고에 보관된 명화가 없습니다.</p>
            <p className="text-[#a38752] text-xs font-serif italic mt-2">Explore the exhibition and select your masterpieces.</p>
            <Link href="/">
              <button className="mt-6 px-6 py-2.5 bg-gradient-to-r from-[#2c2214] to-[#1c150c] text-[#e2c184] border border-[#a38752]/40 text-xs font-bold rounded-none hover:from-[#87672a] cursor-pointer">
                작품 보러가기 →
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {bookmarkedArtworks.map((art) => (
              <Link href={`/artwork/${art.id}`} key={`bookmark-${art.id}`}>
                <div 
                  className="group bg-[#1a1b1d] border-2 rounded-none overflow-hidden transition-all shadow-xl hover:shadow-[0_25px_50px_rgba(0,0,0,0.6)] hover:-translate-y-1.5 duration-300"
                  style={{ borderImage: "linear-gradient(to right, #e5c483, #87672a) 1" }}
                >
                  {/* 🎯 [패치 포인트 3]: 마이페이지 보관함 그리드 이미지 영역도 가로세로 어떤 비율이든 꽉 들어차게 피팅 연동 */}
                  <div className="h-52 overflow-hidden bg-black">
                    <img 
                      src={art.imageUrl} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      alt={art.titleEn} 
                    />
                  </div>

                  {/* 하단 네임 플레이트 */}
                  <div className="p-5 bg-gradient-to-b from-[#241c10] to-[#17120a] border-t border-[#46391e]">
                    <div className="text-[10px] font-black text-[#a38752] uppercase tracking-widest mb-1.5 font-sans block">
                      {art.style || "European Paintings"}
                    </div>
                    <h3 className="font-extrabold text-[#e2c184] truncate text-base font-sans tracking-tight">
                      {art.titleEn}
                    </h3>
                    <p className="text-[#a38752] font-serif italic text-xs mt-1 truncate">
                      by {art.artist}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>

      <footer className="py-16 text-center text-neutral-600 border-t border-neutral-800 text-[10px] font-mono mt-20">
        <p>© 2026 ArtLens Project. MET Museum Open Access API.</p>
      </footer>
    </div>
  );
}