"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 🔐 이메일 로그인/회원가입 처리
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        // 회원가입
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Firestore에 유저 문서 초기화 (북마크 배열 포함)
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          createdAt: new Date().toISOString(),
          bookmarks: []
        });

        alert("🏛️ ArtLens 미술관 회원가입이 완료되었습니다!");
      } else {
        // 로그인
        await signInWithEmailAndPassword(auth, email, password);
        alert("🔑 성공적으로 로그인되었습니다. 관람을 시작합니다.");
      }
      router.push("/");
    } catch (error) {
      console.error("인증 에러:", error);
      if (error.code === "auth/email-already-in-use") {
        alert("이미 사용 중인 이메일입니다.");
      } else if (error.code === "auth/weak-password") {
        alert("비밀번호는 6자리 이상이어야 합니다.");
      } else if (error.code === "auth/invalid-credential") {
        alert("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else {
        alert("인증 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 🌐 구글 소셜 로그인 처리
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // 기존 유저 문서가 있는지 확인 후 없으면 생성
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          createdAt: new Date().toISOString(),
          bookmarks: []
        });
      }

      alert(`👋 반갑습니다, ${user.displayName || "관람객"}님!`);
      router.push("/");
    } catch (error) {
      console.error("구글 로그인 에러:", error);
      alert("구글 로그인 중 오류가 발생했습니다.");
    }
  };

  return (
    // 🎯 [개편 1]: 메인/상세화면과 100% 일치시킨 오프라인 고급 미술관 그레이(#242629) 마스터 배경
    <main className="min-h-screen bg-[#242629] text-white flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* 상세페이지와 싱크를 맞춘 부드러운 광폭 원뿔형 프리미엄 스포트라이트 조명 오버레이 */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[550px] pointer-events-none z-0 opacity-80"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(255, 253, 220, 0.2) 0%, rgba(255, 253, 220, 0.04) 60%, transparent 100%)",
          clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)"
        }}
      ></div>

      {/* 🎯 [개편 2]: 로그인 카드 배경을 중후한 전시실 내부 다크 차콜(#1a1b1d) 및 금색 테두리로 직사각형 매핑 */}
      <div 
        className="w-full max-w-md bg-[#1a1b1d] rounded-none p-10 shadow-[0_30px_70px_rgba(0,0,0,0.85)] border-4 relative z-10"
        style={{
          borderImage: "linear-gradient(to bottom right, #e5c483 0%, #cfa862 30%, #87672a 60%, #bc954f 100%) 1"
        }}
      >
        {/* 서비스 타이틀 로고 헤더 */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent font-sans">
            ArtLens
          </h2>
          <p className="text-[#a38752] text-xs font-medium tracking-wide mt-1.5 font-serif italic">
            {isRegister ? "Create Guest Account" : "Access Personal Gallery"}
          </p>
        </div>

        {/* 메인 이메일 폼 */}
        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="artlens@example.com"
              className="w-full px-4 py-3 bg-[#111112] border border-neutral-700 focus:border-[#cfa862] text-white rounded-none text-sm outline-none transition-colors font-sans"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#111112] border border-neutral-700 focus:border-[#cfa862] text-white rounded-none text-sm outline-none transition-colors font-sans"
              required
            />
          </div>

          {/* 🎯 [개편 3]: 메인 로그인/회원가입 메인 버튼 - 앤틱 차콜 월넛 그라데이션 및 황동 골드 레터링 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-6 py-3.5 bg-gradient-to-r from-[#2c2214] to-[#1c150c] hover:from-[#87672a] hover:to-[#6b501f] text-[#e2c184] border border-[#a38752]/60 rounded-none font-black text-xs tracking-wider shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 cursor-pointer uppercase"
          >
            {loading ? "Authenticating..." : isRegister ? "🏛️ 미술관 계정 생성하기" : "🔑 도슨트 룸 입장하기"}
          </button>
        </form>

        {/* 구분선 스트립 */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute w-full border-t border-neutral-800"></div>
          <span className="relative bg-[#1a1b1d] px-3 text-[10px] text-neutral-500 uppercase tracking-widest font-mono">
            OR
          </span>
        </div>

        {/* 🎯 [개편 4]: 구글 로그인 버튼 - 은은한 다크 원목 스킨에 은은한 골드 프레임 테두리 매칭 */}
        <button
          onClick={handleGoogleLogin}
          className="w-full px-6 py-3 bg-[#151618] hover:bg-[#201a11] text-neutral-300 hover:text-[#e2c184] border border-neutral-700 hover:border-[#a38752]/50 rounded-none font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
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

        {/* 🎯 [개편 5]: 하단 모드 전환 앵커 텍스트 - 주황색을 배제하고 소프트 앤틱 골드 톤으로 정렬 */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-neutral-400 hover:text-[#e2c184] transition-colors font-medium underline underline-offset-4 decoration-neutral-600 hover:decoration-[#a38752] cursor-pointer"
          >
            {isRegister ? "이미 계정이 있으신가요? 로그인하기" : "처음 오셨나요? ArtLens 무료 가입하기"}
          </button>
        </div>

      </div>
    </main>
  );
}