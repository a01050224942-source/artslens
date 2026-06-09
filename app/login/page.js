"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase"; // 기존에 설정한 firebase.js 경로 확인
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false); // 가입/로그인 모드 전환
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // 회원가입 실행
        await createUserWithEmailAndPassword(auth, email, password);
        alert("회원가입 성공! 환영합니다.");
      } else {
        // 로그인 실행
        await signInWithEmailAndPassword(auth, email, password);
        alert("로그인 성공!");
      }
      router.push("/"); // 성공 시 메인 페이지로 이동
    } catch (error) {
      console.error("Auth Error:", error.code);
      // 에러 핸들링
      if (error.code === "auth/email-already-in-use") alert("이미 사용 중인 이메일입니다.");
      else if (error.code === "auth/invalid-credential") alert("이메일 또는 비밀번호가 틀렸습니다.");
      else if (error.code === "auth/weak-password") alert("비밀번호는 6자리 이상이어야 합니다.");
      else alert("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-sans p-6">
      {/* 배경 장식 (Glow 효과) */}
      <div className="absolute w-[500px] h-[500px] bg-indigo-900/20 blur-[120px] rounded-full -top-20 -left-20"></div>
      
      <div className="relative w-full max-w-md bg-gray-900/50 backdrop-blur-xl border border-gray-800 p-10 rounded-3xl shadow-2xl">
        <header className="text-center mb-10">
          <Link href="/" className="text-2xl font-black tracking-tighter text-white hover:text-indigo-400 transition-colors">
            ArtLens
          </Link>
          <h2 className="text-3xl font-bold text-white mt-6">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            {isSignUp ? "시각 지능 미학의 세계에 합류하세요" : "로그인하여 명화 인식을 시작하세요"}
          </p>
        </header>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white px-5 py-3.5 rounded-2xl focus:outline-none focus:border-indigo-500 transition-all text-sm mt-1"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-400 ml-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white px-5 py-3.5 rounded-2xl focus:outline-none focus:border-indigo-500 transition-all text-sm mt-1"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 mt-4"
          >
            {loading ? "Processing..." : isSignUp ? "가입하기" : "로그인"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            {isSignUp ? "이미 계정이 있으신가요? 로그인" : "처음이신가요? 회원가입하기"}
          </button>
        </div>
      </div>
    </div>
  );
}