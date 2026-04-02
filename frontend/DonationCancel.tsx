import React from 'react';

export default function DonationCancel() {
  return (
    <div className="min-h-screen bg-[#0A0F0D] flex items-center justify-center p-4">
      <div className="bg-[#1A0A0A] border border-red-500/30 p-8 rounded-3xl w-full max-w-md text-center">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>Payment Cancelled</h1>
        <p className="text-red-400 font-semibold mb-6">Your transaction was not completed.</p>
        <button onClick={() => window.location.href = '/'} className="mt-6 px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 font-bold w-full transition-all">Back to Home</button>
      </div>
    </div>
  );
}
