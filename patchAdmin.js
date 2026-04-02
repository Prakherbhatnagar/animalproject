const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('c:/Users/prakh/OneDrive/Desktop/animal project/frontend/AdminDashboard.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const targetLine = `    <div className="h-screen flex flex-col bg-[#060E09] overflow-hidden">`;

const startIndex = content.indexOf(targetLine);
const endIndex = content.lastIndexOf(`  );`); // Assuming the last return

const newContent = `    <div className="h-screen flex bg-[#030906] overflow-hidden text-white font-sans">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      
      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-[#0A1A0E] border border-emerald-500/30 p-8 rounded-[2rem] flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold tracking-wide">Transmitting Rescue Data</p>
              <p className="text-emerald-400/60 text-xs mt-1.5 font-bold uppercase tracking-widest">Encrypting Payload...</p>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR (Mission Control) ── */}
      <aside className="w-[280px] flex-shrink-0 bg-[#060E09]/95 backdrop-blur-2xl border-r border-white/5 hidden md:flex flex-col z-40 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
        
        {/* Brand */}
        <div className="p-6 border-b border-white/5 flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-800 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.3)] shadow-emerald-500/20 border border-emerald-400/20">
            <PawPrint className="text-white w-6 h-6" />
          </div>
          <div>
            <p className="font-black text-lg tracking-wide text-white" style={{ fontFamily: "'Sora', sans-serif" }}>PawRescue</p>
            <p className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,1)]" /> SysAdmin
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 relative z-10 scrollbar-hide">
          <p className="px-4 text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Core Modules</p>
          {VIEW_MODES.map(mode => (
             <button
               key={mode.id}
               onClick={() => setViewMode(mode.id)}
               className={\`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all duration-300 \${
                 viewMode === mode.id ? 'bg-gradient-to-r from-emerald-500/15 to-transparent text-emerald-400 border-l-2 border-emerald-400' : 'text-white/40 hover:text-white/80 hover:bg-white/5 border-l-2 border-transparent'
               }\`}
             >
               <span className={\`flex items-center justify-center w-8 h-8 rounded-xl \${viewMode === mode.id ? 'bg-emerald-500/20 shadow-inner border border-emerald-500/30' : 'bg-white/5 border border-white/10'}\`}>
                  {mode.icon}
               </span>
               {mode.label}
             </button>
          ))}
        </div>

        {/* User Block */}
        <div className="p-4 m-4 rounded-[1.5rem] bg-gradient-to-br from-white/5 to-white/2 border border-white/10 flex items-center justify-between backdrop-blur-xl group relative z-10">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-lg text-white shadow-inner border border-emerald-400/20">{user?.name?.charAt(0) || "A"}</div>
             <div className="min-w-0">
               <p className="text-white text-sm font-bold truncate tracking-wide">{user?.name?.split(" ")[0]}</p>
               <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase">Operator</p>
             </div>
           </div>
           <button onClick={() => { setUser(null); setPage("landing"); }} className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all group-hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"><LogOut className="w-4 h-4" /></button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
        
        {/* Header HUD */}
        <header className="h-[72px] border-b border-white/5 flex items-center justify-between px-6 md:px-8 flex-shrink-0 bg-[#060E09]/80 backdrop-blur-2xl relative">
          <div className="absolute top-0 right-1/4 w-96 h-10 bg-emerald-500/10 blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4 flex-1">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center"><PawPrint className="text-white w-4 h-4" /></div>
              <p className="font-bold text-sm tracking-wide text-white uppercase" style={{ fontFamily: "'Sora', sans-serif" }}>PawRescue</p>
            </div>
            <div className="hidden md:flex flex-1">
              <AdminStatsBar reports={reports} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all relative">
              <Bell className="w-4.5 h-4.5" />
              {reports.filter(r => r.status === "pending").length > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,1)] animate-pulse" />}
            </button>
            <div className="md:hidden w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white shadow-sm border border-emerald-400/20">{user?.name?.charAt(0) || "A"}</div>
          </div>
        </header>

        {/* Mobile View Toggle */}
        <div className="md:hidden border-b border-white/5 px-4 py-3 flex gap-2 overflow-x-auto bg-[#0A120E] scrollbar-hide">
          {VIEW_MODES.map((mode) => (
            <button key={mode.id} onClick={() => setViewMode(mode.id)} className={\`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold border transition-all \${viewMode === mode.id ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/10 text-white/40"}\`}>
              {mode.icon} {mode.label}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        {viewMode !== "analytics" && (
          <div className="flex-shrink-0 bg-[#0A120E]/50 border-b border-white/5 px-6 md:px-8 py-4 flex items-center gap-4 backdrop-blur-xl">
            <div className="relative flex-1 max-w-[320px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search ID, Location..." className="w-full bg-[#030906] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-white placeholder:text-white/20 text-xs font-medium focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/40 transition-all shadow-inner" />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mask-edges">
              {FILTER_OPTIONS.map((f) => (
                <button key={f.key} onClick={() => setFilterStatus(f.key)} className={\`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 \${filterStatus === f.key ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10"}\`}>{f.label}</button>
              ))}
            </div>
            <button onClick={() => setSortBy(s => s === "time" ? "priority" : "time")} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#030906] border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-white/5">
              <TrendingUp className="w-3.5 h-3.5" /> Sort: {sortBy === "priority" ? "Priority" : "Newest"}
            </button>
          </div>
        )}

        {/* Dynamic Content */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {viewMode === "analytics" && <AnalyticsPanel reports={reports} />}

          {(viewMode === "split" || viewMode === "list") && (
            <div className={\`flex flex-col border-r border-white/5 \${viewMode === "split" ? "w-full md:w-[460px] lg:w-[500px]" : "w-full"} overflow-hidden flex-shrink-0 bg-[#030906]/50\`}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
                {filteredReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center mb-5 shadow-inner">
                      <Filter className="w-8 h-8 text-white/20" />
                    </div>
                    <p className="text-white/50 text-sm font-bold tracking-wide">No Incident Found.</p>
                  </div>
                ) : (
                  filteredReports.map((report) => <ReportCard key={report.id} report={report} isSelected={selectedId === report.id} onSelect={() => setSelectedId(report.id)} onStatusChange={handleStatusRequest} />)
                )}
              </div>
              <div className="flex-shrink-0 border-t border-white/5 bg-[#060E09] px-6 py-3 flex items-center justify-between backdrop-blur-md">
                <span className="text-white/30 text-[10px] uppercase font-bold tracking-widest">{filteredReports.length} of {reports.length} Records</span>
                <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] uppercase font-black tracking-widest"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry</span>
              </div>
            </div>
          )}

          {(viewMode === "split" || viewMode === "map") && viewMode !== "analytics" && (
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#0A120E] relative">
              <AdminMap reports={filteredReports} selectedId={selectedId} onSelect={setSelectedId} />

              {selectedReport && viewMode === "split" && (
                <div className="absolute bottom-6 left-6 right-6 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-2xl bg-[#06100A]/95 backdrop-blur-2xl border border-emerald-500/20 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] shadow-emerald-500/5 overflow-hidden z-20 flex flex-col max-h-[45vh] lg:max-h-[35vh]">
                  <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-emerald-500/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span className="text-white text-xs font-black tracking-widest uppercase">Target Locked: {selectedReport.id}</span>
                      <div className="ml-2 scale-90 origin-left"><StatusBadge status={selectedReport.status} /></div>
                    </div>
                    <button onClick={() => setSelectedId(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-5 scrollbar-thin">
                    <div className="flex items-start gap-5">
                      {selectedReport.imageDataUrl && <img src={selectedReport.imageDataUrl} alt="animal" className="w-24 h-24 rounded-2xl object-cover border border-white/10 shadow-lg" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-lg tracking-wide mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>{selectedReport.animalType} — {selectedReport.animalCondition}</p>
                        <p className="text-white/60 text-xs leading-relaxed mb-3">{selectedReport.description}</p>
                        <p className="text-emerald-400 text-xs flex items-center gap-1.5 font-bold"><MapPin className="w-3.5 h-3.5" /> {selectedReport.location?.address}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_ACTIONS.map((action) => (
                        <button key={action.status} onClick={() => handleStatusRequest(selectedReport.id, action.status)} disabled={selectedReport.status === action.status} className={\`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] uppercase tracking-widest font-black border transition-all disabled:opacity-30 \${action.color} \${action.bg}\`}>
                          {action.icon} {action.label}
                        </button>
                      ))}
                    </div>
                    {selectedReport.treatedImageUrl && selectedReport.imageDataUrl && <BeforeAfterSlider beforeSrc={selectedReport.imageDataUrl} afterSrc={selectedReport.treatedImageUrl} animalName={\`\${selectedReport.animalType} #\${selectedReport.id}\`} />}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>`;

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newContent + content.substring(endIndex);
  fs.writeFileSync(targetFile, content);
  console.log("Successfully replaced Admin UI content");
} else {
  console.log("Could not find start or end index. start:", startIndex, "end:", endIndex);
}
