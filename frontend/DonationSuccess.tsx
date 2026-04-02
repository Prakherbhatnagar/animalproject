import React, { useEffect, useState } from 'react';

export default function DonationSuccess() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = '/';
    }
  }, [countdown]);

  return (
    <div className="min-h-screen bg-[#0A0F0D] flex items-center justify-center p-4">
      <div className="bg-[#0A1A0E] border border-emerald-500/30 p-8 rounded-3xl w-full max-w-md text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>Payment Successful!</h1>
        <p className="text-emerald-400 font-semibold mb-6">Thank you for saving a life today.</p>
        <p className="text-white/50 text-sm">Redirecting to dashboard in {countdown} seconds...</p>
        <button onClick={() => window.location.href = '/'} className="mt-6 px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold w-full">Return Now</button>
      </div>
    </div>
  );
}
