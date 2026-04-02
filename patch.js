const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('c:/Users/prakh/OneDrive/Desktop/animal project/frontend/App.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const targetLine = `<div className="max-w-2xl mx-auto px-5 py-6 space-y-6">`;

const startIndex = content.indexOf(targetLine);
const endIndex = content.indexOf(`  );`, startIndex);

const newContent = `      <div className="max-w-7xl mx-auto px-6 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ────── LEFT COLUMN (Main Actions & Activity) ────── */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Hero & Coins Row */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Quick Action Hero */}
              <div
                className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500/20 via-emerald-900/30 to-[#0A0F0D] border border-emerald-500/20 p-6 cursor-pointer hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all group backdrop-blur-3xl"
                onClick={() => setPage("report-form")}
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-400/30 transition-all" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative h-full flex flex-col justify-between min-h-[160px]">
                  <div>
                    <h2 className="text-white text-2xl font-black mb-2 shadow-sm" style={{ fontFamily: "'Sora', sans-serif" }}>Report an Animal</h2>
                    <p className="text-emerald-100/60 text-sm font-medium">Spotted an animal in distress? Act fast and save a life today.</p>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">Urgent Rescue</span>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40 group-hover:scale-110 group-hover:-rotate-12 transition-transform flex-shrink-0">
                      <ArrowRight className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Coins Banner */}
              <div
                className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500/15 via-orange-900/20 to-[#0A0F0D] border border-amber-500/25 p-6 cursor-pointer hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/10 transition-all group backdrop-blur-3xl"
                onClick={() => setPage("rewards")}
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/15 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-400/25 transition-all" />
                <div className="relative h-full flex flex-col justify-between min-h-[160px]">
                  <div>
                    <p className="text-amber-400/80 text-xs font-bold uppercase tracking-widest mb-1 shadow-sm">Your Rewards</p>
                    <h2 className="text-amber-400 text-4xl font-black mb-0 drop-shadow-md" style={{ fontFamily: "'Sora', sans-serif" }}>{coinBalance} <span className="text-2xl ml-1">🪙</span></h2>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-white/50 text-sm font-medium max-w-[140px]">Exchange coins for verified NGO merchandise.</p>
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                      View Catalog <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Nav Cards */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: "Lost & Found", desc: "AI Visual Match", icon: "🔍", page: "discover", theme: "blue" },
                { label: "Adoption", desc: "Find a friend", icon: "🐾", page: "discover", theme: "pink" },
                { label: "Donate", desc: "Fund a rescue", icon: "❤️", page: "ngo", theme: "orange" },
              ].map((card) => {
                const colors = {
                  blue: { bg: "from-sky-500/10 to-sky-900/5", border: "border-sky-500/20", hover: "hover:border-sky-500/40 hover:shadow-sky-500/10", text: "text-sky-400" },
                  pink: { bg: "from-pink-500/10 to-pink-900/5", border: "border-pink-500/20", hover: "hover:border-pink-500/40 hover:shadow-pink-500/10", text: "text-pink-400" },
                  orange: { bg: "from-orange-500/10 to-orange-900/5", border: "border-orange-500/20", hover: "hover:border-orange-500/40 hover:shadow-orange-500/10", text: "text-orange-400" },
                }[card.theme];
                return (
                  <button
                    key={card.label}
                    onClick={() => setPage(card.page)}
                    className={\`bg-gradient-to-tr \${colors.bg} border \${colors.border} rounded-[1.5rem] p-5 text-left transition-all hover:-translate-y-1 hover:shadow-xl \${colors.hover} group backdrop-blur-xl relative overflow-hidden\`}
                  >
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/5 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform" />
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl mb-4 border border-white/10 shadow-sm">{card.icon}</div>
                    <p className={\`text-[11px] font-bold uppercase tracking-widest \${colors.text} mb-1 drop-shadow-sm\`}>{card.label}</p>
                    <p className="text-white/40 text-[10px] font-semibold">{card.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* My Reports */}
            <div className="bg-[#0A150D]/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden flex-1 min-h-[300px]">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none mix-blend-screen" />
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-white text-lg font-bold flex items-center gap-2" style={{ fontFamily: "'Sora', sans-serif" }}>
                  <Activity className="w-5 h-5 text-emerald-400" /> Active Rescue Missions
                </h3>
                <span className="text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-xs font-bold shadow-sm">{recentReports.length} Reports</span>
              </div>

              {recentReports.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-[1.5rem] px-8 py-12 text-center relative z-10">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-4">🐾</div>
                  <p className="text-white text-base font-bold drop-shadow-md">No missions logged yet</p>
                  <p className="text-white/40 text-sm mt-2 mb-6 max-w-sm mx-auto">Step up and make your first report. Every action brings us closer to a safer world for strays.</p>
                  <button onClick={() => setPage("report-form")} className="px-6 py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all">Submit A Report →</button>
                </div>
              ) : (
                <div className="space-y-4 relative z-10">
                  {recentReports.map((report) => {
                    const stepIdx = getStepIndex(report.status);
                    return (
                      <div key={report.id} className={\`bg-[#060A08]/80 backdrop-blur-md border rounded-[1.5rem] overflow-hidden transition-all hover:bg-white/5 \${report.isFlagged ? "border-red-500/30 shadow-inner shadow-red-500/5" : "border-white/10 shadow-sm"}\`}>
                        <div className="p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-4">
                            <div className="flex items-center gap-4">
                              {report.imageDataUrl ? (
                                <img src={report.imageDataUrl} alt="animal" className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-md" />
                              ) : (
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-xl">🐾</div>
                              )}
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-white font-bold text-sm tracking-wide">{report.animalType} — {report.animalCondition}</p>
                                  {report.isFlagged && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest shadow-md border-red-400">Flagged</span>}
                                </div>
                                <p className="text-white/40 text-xs flex items-center gap-1.5 font-medium"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> {report.location?.address}</p>
                              </div>
                            </div>
                            <StatusBadge status={report.status} />
                          </div>

                          {report.status !== "fake" && (
                            <div className="flex items-center pt-1 px-2">
                              {timelineSteps.map((step, i) => {
                                const done = i <= stepIdx;
                                const active = i === stepIdx;
                                return (
                                  <React.Fragment key={step.key}>
                                    <div className="flex flex-col items-center">
                                      <div className={\`w-8 h-8 rounded-full flex items-center justify-center border transition-all text-xs \${done ? active ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/50 scale-110" : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/10 text-white/20"}\`}>
                                        {step.icon}
                                      </div>
                                      <p className={\`text-[10px] mt-2 font-bold tracking-wide \${done ? active ? "text-emerald-400" : "text-emerald-500/70" : "text-white/20"}\`}>{step.label}</p>
                                    </div>
                                    {i < timelineSteps.length - 1 && (
                                      <div className={\`flex-1 h-0.5 mb-5 mx-2 rounded-full transition-all \${done && i < stepIdx ? "bg-gradient-to-r from-emerald-500 to-emerald-500/40 shadow-sm" : "bg-white/10"}\`} />
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          )}
                          {report.status === "fake" && (
                            <div className="flex items-center gap-2 bg-red-500/10 rounded-xl p-3 border border-red-500/20 text-red-400 text-xs font-semibold shadow-inner shadow-red-500/5">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                              This report failed verification and has been marked as invalid by an Admin.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ────── RIGHT COLUMN (Sidebar Layout) ────── */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* KPI Stats Box */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Submitted", value: userReports.length, color: "text-white", bg: "from-white/5 to-white/2", border: "border-white/10" },
                { label: "Active Pursuits", value: userReports.filter((r) => r.status === "in_progress").length, color: "text-violet-400", bg: "from-violet-500/10 to-violet-900/10", border: "border-violet-500/20" },
                { label: "Lives Saved", value: userReports.filter((r) => r.status === "completed").length, color: "text-emerald-400", bg: "from-emerald-500/10 to-emerald-900/10", border: "border-emerald-500/20" },
                { label: "Flagged", value: userReports.filter((r) => r.status === "fake").length, color: "text-red-400", bg: "from-red-500/10 to-red-900/10", border: "border-red-500/20" },
              ].map((s) => (
                <div key={s.label} className={\`bg-gradient-to-b \${s.bg} border \${s.border} rounded-3xl p-5 backdrop-blur-xl flex flex-col items-center justify-center text-center shadow-lg\`}>
                  <p className={\`text-3xl font-black \${s.color} drop-shadow-md\`} style={{ fontFamily: "'Sora', sans-serif" }}>{s.value}</p>
                  <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest mt-1.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Nearby NGOs Widget */}
            <div className="bg-[#0A150D]/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl flex-1 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-lg font-bold flex items-center gap-2" style={{ fontFamily: "'Sora', sans-serif" }}>
                  <Building2 className="w-5 h-5 text-emerald-400" /> Ground Units
                </h3>
                <button onClick={() => setPage("ngo")} className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">Directory</button>
              </div>

              <div className="space-y-4 flex-1">
                {[
                  { name: "Delhi Rescue Trust", dist: "1.2 km", rating: 4.8, status: "Available", reports: 142, icon: "🏥" },
                  { name: "Paws & Claws Found.", dist: "2.7 km", rating: 4.6, status: "Available", reports: 89, icon: "🐶" },
                  { name: "Stray Help Network", dist: "4.1 km", rating: 4.9, status: "Busy", reports: 210, icon: "🚙" },
                  { name: "Hope Animal Aid", dist: "5.5 km", rating: 4.4, status: "Available", reports: 64, icon: "🛡️" },
                ].map((ngo) => (
                  <div key={ngo.name} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-[1.2rem] p-3 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer shadow-sm group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-xl group-hover:scale-110 transition-transform shadow-inner">
                      {ngo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate tracking-wide">{ngo.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-emerald-400/80 text-[10px] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{ngo.dist}</span>
                        <span className="text-amber-400 text-[10px] font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">★ {ngo.rating}</span>
                      </div>
                    </div>
                    <span className={\`w-3 h-3 rounded-full flex-shrink-0 shadow-sm \${ngo.status === "Available" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"}\`} title={ngo.status} />
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-white/10 text-center">
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-500/80" /> 100% Verified Partners</p>
              </div>
            </div>
          </div>
        </div>
      </div>
`;

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newContent + content.substring(endIndex);
  fs.writeFileSync(targetFile, content);
  console.log("Successfully replaced UI content");
} else {
  console.log("Could not find start or end index. start:", startIndex, "end:", endIndex);
}
