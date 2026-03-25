"use client";
import { useState, useEffect, useRef } from "react";
import StatusIndicator from "@/components/StatusIndicator";
import Marker from "@/components/Marker";

export default function Dashboard() {
    // 1. Oyuncunun GERÇEK konumu (Unity'den gelen)
    const [playerPos, setPlayerPos] = useState({ x: 0, z: 0, yaw: 0, pitch: 0 });
    
    // 2. Oyuncunun HEDEF konumu (Web'den gönderdiğimiz nokta)
    const [targetPos, setTargetPos] = useState({ x: null, z: null });
    const [activeControl, setActiveControl] = useState(null); // 'move' veya 'rotate'

    const [rotSens, setRotSens] = useState({ x: 1, y: 1 });
    const [isConnected, setIsConnected] = useState(false);
    const [mapImage, setMapImage] = useState(null);

    const [mapConfig, setMapConfig] = useState({
        width: 0, height: 0, left: 0, right: 0, bottom: 0, top: 0,
    });

    const lastSent = useRef({ x: 0, z: 0, yaw: 0 });
    const socketRef = useRef(null);
    const padRef = useRef(null);
    const [rect, setRect] = useState(null);
    const lastTouch = useRef({ x: null, y: null });
    const longPressTimer = useRef(null);
    const isMovingMode = useRef(false);
    

    // Pad referansının boyutlarını al
    useEffect(() => {
        if (padRef.current) {
            setRect(padRef.current.getBoundingClientRect());
        }
    }, [padRef, mapImage]);

    // WebSocket Bağlantısı
    useEffect(() => {
        if (typeof window === "undefined") return;

        const socketUrl = `ws://localhost:3001`; // IP adresini kontrol et
        const socket = new WebSocket(socketUrl);
        socket.binaryType = "arraybuffer";

        socket.onopen = () => setIsConnected(true);
        socket.onclose = () => setIsConnected(false);

         socket.onmessage = (event) => {
            const dataView = new DataView(event.data);
            const type = dataView.getUint8(0); if (type === 1) { 
                console.log("Harita Config Geldi:", mapConfig); 
            }

            if (type === 1) { // Harita verisi ve görseli
                const leftX = dataView.getFloat32(1, true);
                const rightX = dataView.getFloat32(5, true);
                const bottomZ = dataView.getFloat32(9, true);
                const topZ = dataView.getFloat32(13, true);

                setMapConfig({
                    width: rightX - leftX,
                    height: topZ - bottomZ,
                    left: leftX,
                    right: rightX,
                    bottom: bottomZ,
                    top: topZ,
                });

                const uint8Array = new Uint8Array(event.data);
                const imageBlob = new Blob([uint8Array.slice(17)], { type: "image/jpeg" });
                setMapImage((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(imageBlob);
                });
            } else if (type === 0) { // Oyuncu konum verisi
                const posX = dataView.getFloat32(1, true);
                const posZ = dataView.getFloat32(5, true);
                const rot = dataView.getFloat32(9, true);

                setPlayerPos((prev) => {
                    let delta = (rot - prev.yaw) % 360;
                    if (delta > 180) delta -= 360;
                    else if (delta < -180) delta += 360;
                    return { ...prev, x: posX, z: posZ, yaw: prev.yaw + delta };
                });
                
                setTargetPos((prev) => (prev.x === null ? { x: posX, z: posZ } : prev));
            }
        };

        socketRef.current = socket;
        return () => {
            socket.close();
            if (mapImage) URL.revokeObjectURL(mapImage);
        };
    }, []);

    // Unity'ye veri gönderme
    const sendToUnity = (unityX, unityZ, yaw, pitch) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const buffer = new Float32Array([unityX, unityZ, yaw, pitch]);
            socketRef.current.send(buffer);
        }
    };

    // Kontrol Başlatma (Move veya Rotate)
    const handleControlStart = (mode, e) => {
        e.stopPropagation();
        setActiveControl(mode);
        isMovingMode.current = true;
        if (navigator.vibrate) navigator.vibrate(50);
    };

    const handleMapTouchStart = (e) => {
        const touch = e.touches[0];
        lastTouch.current = { x: touch.clientX, y: touch.clientY };
        isMovingMode.current = false;
        setActiveControl(null);
    };

    // --- YENİ HİBRİT KONTROL MERKEZİ ---
    const handlePointerMove = (clientX, clientY) => {
    if (!isMovingMode.current || !rect) return;

    if (activeControl === 'move') {
        const percentX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const percentY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

        const newTargetX = mapConfig.left + (percentX * mapConfig.width);
        const newTargetZ = mapConfig.bottom + ((1 - percentY) * mapConfig.height);

        // --- OTOMATİK YÖNELME (Kırmızı Okun Dönmesi) ---
        // Karakterin şu anki konumu (playerPos) ile hedef (newTarget) arasındaki fark
        const dx = newTargetX - playerPos.x;
        const dz = newTargetZ - playerPos.z;

        // Karakterin titrememesi için sadece belirli bir mesafeden fazla hareket varsa yönü değiştir
        let autoYaw = playerPos.yaw;
        if (Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05) {
            // Matematiksel olarak yönü (Yaw) hesaplıyoruz
            // atan2 bize radyan verir, * (180/Math.PI) ile dereceye çeviririz
            // Unity ve harita uyumu için +180 veya +90 gerekebilir, test edip ayarlarız
            autoYaw = Math.atan2(dx, dz) * (180 / Math.PI);
        }

        setTargetPos({ x: newTargetX, z: newTargetZ });
        const dX = Math.abs(newTargetX - lastSent.current.x);
        const dZ = Math.abs(newTargetZ - lastSent.current.z);
        const dYaw = Math.abs(autoYaw - lastSent.current.yaw);
        if (dX > 0.02 || dZ > 0.02 || dYaw > 0.5) {
        lastSent.current = { x: newTargetX, z: newTargetZ, yaw: autoYaw };
    
        sendToUnity(newTargetX, newTargetZ, autoYaw, playerPos.pitch);
        } 
        
    }
    
    else if (activeControl === 'rotate') {
        // BURASI AYNI KALIYOR: Kırmızı oku tutup çevirdiğinde manuel kontrol hala aktif!
        const markerX = ((markerPixelX + 1) / 2) * rect.width + rect.left;
        const markerY = ((1 - markerPixelY) / 2) * rect.height + rect.top;

        const dx = clientX - markerX;
        const dy = clientY - markerY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

        sendToUnity(playerPos.x, playerPos.z, angle, playerPos.pitch);
    }
};

// MOUSE İÇİN:
const handleMouseMove = (e) => {
    handlePointerMove(e.clientX, e.clientY);
};

// PARMAK İÇİN (Eski handleTouch'ın yeni hali):
const handleTouchMove = (e) => {
    if (!isMovingMode.current || !rect) return;
    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
};

    const handleTouchEnd = () => {
        isMovingMode.current = false;
        setActiveControl(null);
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    // Koordinat dönüşümleri
    // mapConfig?.width diyerek "varsa bak, yoksa hata verme" diyoruz.
    const markerPixelX = (mapConfig?.width > 0) 
    ? ((playerPos.x - mapConfig.left) / mapConfig.width) * 2 - 1 
    : 0;
    
    const markerPixelY = (mapConfig?.height > 0) // "heigth" değil "height" olmasına dikkat!
    ? ((playerPos.z - mapConfig.bottom) / mapConfig.height) * 2 - 1 
    : 0;
    
    return (
        <main className="h-screen w-full bg-[#121212] text-[#eee] flex flex-col items-center justify-center overflow-hidden relative select-none touch-none">
            <StatusIndicator isConnected={isConnected} />

            {/* Debug Penceresi */}
            <div className="absolute top-2 left-2 text-xs text-[#00ffcc] font-mono z-10 bg-black/60 p-1 rounded select-none touch-none">
                <div>Unity: x={playerPos.x?.toFixed(2)} z={playerPos.z?.toFixed(2)}</div>
                <div>Config: W={mapConfig.width?.toFixed(2)} H={mapConfig.height?.toFixed(2)}</div>
                <div>Control: {activeControl || "Idle"}</div>
            </div>

            {/* Harita Alanı */}
            <div
                ref={padRef}
                onTouchStart={handleMapTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseMove={handleMouseMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                className="w-[95vw] h-[95vw] max-w-[1000px] max-h-[1000px] border-2 border-[#00ffcc]/30 rounded-3xl relative overflow-hidden bg-black select-none touch-none"
                style={{
                    backgroundImage: mapImage ? `url(${mapImage})` : `radial-gradient(#333 1px, transparent 1px)`,
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                }}
            >
                <Marker
                    x={markerPixelX}
                    y={markerPixelY}
                    rotation={playerPos.yaw}
                    activeControl={activeControl}
                    onMoveStart={(e) => handleControlStart('move', e)}
                    onRotateStart={(e) => handleControlStart('rotate', e)}
                />
            </div>
        </main>
    );
}