// components/Marker.js
export default function Marker({ x, y, rotation, onMoveStart, onRotateStart, activeControl }) {
  const leftPercent = ((x + 1) / 2) * 100;
  const topPercent = ((1 - y) / 2) * 100;

  // Seçili olan kısım için sarı parlama efekti (drop-shadow)
  const glowStyle = "drop-shadow(0 0 10px rgba(255, 255, 0, 0.9))";

  return (
    <div
      className="absolute w-[35px] h-[35px] z-20 flex items-center justify-center transition-all duration-75"
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    >
      {/* YEŞİL YUVARLAK (HAREKET) */}
      <div 
        // DÜZELTME: Hem Fare hem Dokunma desteği eklendi.
        //stopPropagation() sayesinde haritadaki sıfırlama kodu tetiklenmez.
        onMouseDown={(e) => { e.stopPropagation(); onMoveStart(e); }}
        onTouchStart={(e) => { e.stopPropagation(); onMoveStart(e); }}
        className="w-full h-full bg-[#00ffcc] rounded-full flex items-center justify-center transition-opacity duration-200"
        style={{
          opacity: activeControl === 'rotate' ? 0.3 : 1,
          filter: activeControl === 'move' ? glowStyle : "none",
          boxShadow: "0 0 20px rgba(0,255,204,0.4)"
        }}
      />

      {/* KIRMIZI ÜÇGEN (DÖNÜŞ) */}
      <div
        // DÜZELTME: Hem Fare hem Dokunma desteği eklendi.
        //stopPropagation() sayesinde haritadaki sıfırlama kodu tetiklenmez.
        onMouseDown={(e) => { e.stopPropagation(); onRotateStart(e); }}
        onTouchStart={(e) => { e.stopPropagation(); onRotateStart(e); }}
        className="absolute transition-all duration-200"
        style={{
          top: "-35px",
          width: "0",
          height: "0",
          borderLeft: "12px solid transparent",
          borderRight: "12px solid transparent",
          borderBottom: "25px solid #ff0055",
          opacity: activeControl === 'move' ? 0.3 : 1,
          filter: activeControl === 'rotate' ? glowStyle : "drop-shadow(0 0 5px #ff0055)",
          cursor: "pointer"
        }}
      />
    </div>
  );
}