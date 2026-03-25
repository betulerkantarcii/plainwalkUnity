export default function StatusIndicator({ isConnected }) {
  return (
    <div className="absolute top-5 right-5 px-5 py-2.5 rounded-full bg-black/50 border border-[#333] text-sm font-bold flex items-center gap-2.5 z-50 select-none touch-none">
      <div
        className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-[#00ffcc] shadow-[0_0_10px_#00ffcc]" : "bg-[#ff4444] shadow-[0_0_10px_#ff4444]"}`}
      />
      <span>SUNUCU: {isConnected ? "BAĞLANDI" : "ÇEVRİMDIŞI"}</span>
    </div>
  );
}
