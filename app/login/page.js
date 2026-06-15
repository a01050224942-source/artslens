"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("🔒 도슨트 룸에 안전하게 입장하셨습니다.");
      router.push("/");
    } catch (error) {
      console.error("이메일 로그인 에러:", error);
      alert("이메일 또는 비밀번호를 다시 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 🎯 [구글 로그인 트래킹 엔진 보정]
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    // 구글 팝업창이 뜨기 전 기기별 계정 선택 세션을 강제로 초기화하여 인증 정합성 확보
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          bookmarks: []
        });
      }

      alert("💛 Google 계정으로 원클릭 관람을 시작합니다.");
      router.push("/");
    } catch (error) {
      console.error("❌ 구글 로그인 인프라 크래시 사유:", error);
      
      // 가은님이 브라우저에서 즉시 원인을 진단할 수 있도록 상세 경고 바인딩
      if (error.code === "auth/unauthorized-domain") {
        alert("🚨 [도메인 차단 에러]\n현재 Vercel 배포 주소가 파이어베이스 '승인된 도메인' 리스트에 등록되지 않았습니다. 콘솔 설정을 확인해 주세요!");
      } else if (error.code === "auth/popup-closed-by-user") {
        alert("💡 구글 로그인 팝업 창이 인증이 끝나기 전에 닫혔습니다.");
      } else {
        alert(`인증 오류 발생: ${error.message}\n(에러코드: ${error.code})`);
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#242629] text-white flex flex-col items-center justify-center p-6 relative overflow-x-hidden">
      
      {/* 메인 홈 이동 탈출 버튼 */}
      <div className="absolute top-8 left-8 z-30">
        <button 
          onClick={() => router.push("/")} 
          className="text-neutral-400 hover:text-[#e2c184] transition-colors text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> 
          <span>메인 미술관 갤러리로 돌아가기</span>
        </button>
      </div>

      {/* 프리미엄 백그라운드 스포트라이트 조명 광원 유지 */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[550px] pointer-events-none z-10 opacity-90"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(255, 253, 220, 0.18) 0%, rgba(255, 253, 220, 0.04) 60%, transparent 100%)",
          clipPath: "polygon(38% 0, 62% 0, 100% 100%, 0 100%)"
        }}
      ></div>

      {/* 프레임 패널 컨테이너 */}
      <div 
        className="w-full max-w-md bg-[#1a1b1d] rounded-none p-8 sm:p-10 shadow-[0_30px_70px_rgba(0,0,0,0.85),inset_0_0_15px_rgba(0,0,0,0.5)] relative z-20 transition-all duration-300"
        style={{
          borderImage: "linear-gradient(to bottom right, #dfba73 0%, #cfa862 25%, #927437 50%, #c5a059 75%, #f5dfa3 100%) 14",
          borderWidth: "10px",
          borderStyle: "solid",
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tighter mb-1 bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent font-sans">
            ArtLens
          </h1>
          <p className="text-[#a38752] font-serif italic text-xs tracking-wide">
            Access Personal Gallery
          </p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-neutral-400 tracking-widest uppercase mb-2">
              Email Address
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="artlens@example.com"
              className="w-full px-4 py-3 bg-[#111112] border border-neutral-800 rounded-none text-sm text-white focus:outline-none focus:border-[#8a6d3b] transition-colors shadow-inner"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-neutral-400 tracking-widest uppercase mb-2">
              Password
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#111112] border border-neutral-800 rounded-none text-sm text-white focus:outline-none focus:border-[#8a6d3b] transition-colors shadow-inner"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-[#2c2214] to-[#1c150c] hover:from-[#87672a] hover:to-[#6b501f] text-[#e2c184] font-bold text-xs rounded-none border border-[#a38752]/40 shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
          >
            🔑 {loading ? "입장 잠금 해제 중..." : "도슨트 룸 입장하기"}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute w-full border-t border-neutral-900"></div>
          <span className="relative z-10 px-3 bg-[#1a1b1d] text-[9px] font-black text-neutral-500 tracking-widest uppercase">
            or
          </span>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full py-3.5 bg-[#111112] hover:bg-neutral-900 text-neutral-300 font-bold text-xs rounded-none border border-neutral-800 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer tracking-wide"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Google 계정으로 원클릭 관람
        </button>

        <div className="text-center mt-6">
          <Link href="/register" className="text-[11px] text-neutral-500 hover:text-white underline underline-offset-4 transition-colors font-medium">
            처음 오셨나요? ArtLens 가입하기
          </Link>
        </div>

      </div>
    </main>
  );
}