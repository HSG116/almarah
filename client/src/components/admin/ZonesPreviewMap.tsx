
import { MapContainer, TileLayer, Polygon, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, DollarSign, ShieldCheck, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface DeliveryZone {
    id: number;
    name: string;
    fee: string | number;
    minOrder: string | number;
    coordinates: any;
    isActive: boolean;
}

interface ZonesPreviewMapProps {
    zones: DeliveryZone[];
}

export default function ZonesPreviewMap({ zones }: ZonesPreviewMapProps) {
    const center: [number, number] = [24.7136, 46.6753];

    const parseCoords = (coords: any): [number, number][] => {
        if (!coords) return [];
        try {
            const parsed = typeof coords === 'string' ? JSON.parse(coords) : coords;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    };

    return (
        <div className="h-full w-full relative z-0 group">
            {/* Ultra-Premium HUD for Zones Only */}
            <div className="absolute inset-x-0 top-0 z-[1000] p-6 pointer-events-none">
                <div className="flex justify-between items-start">
                    <div className="bg-slate-950/80 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Navigation className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white leading-none mb-1">مناطق التوصيل الفعال</h3>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">System Delivery Grid</p>
                        </div>
                    </div>

                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black px-4 py-1.5 rounded-full backdrop-blur-md pointer-events-auto">
                        خريطة نشطة 🟢
                    </Badge>
                </div>
            </div>

            {/* Price/Fee Legend - Bottom Center */}
            <div className="absolute inset-x-0 bottom-8 z-[1000] p-6 flex justify-center pointer-events-none">
                <div className="bg-slate-950/90 backdrop-blur-3xl px-8 py-4 rounded-full border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] pointer-events-auto flex items-center gap-8 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_#6366f1]" />
                        <span className="text-xs font-black text-white">منطقة تغطية شاملة</span>
                    </div>
                    <div className="w-[1px] h-4 bg-white/10" />
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                        <span className="text-xs font-black text-white">رسوم مخفضة</span>
                    </div>
                    <div className="w-[1px] h-4 bg-white/10" />
                    <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-black text-slate-400">{zones.length} منطقة متاحة</span>
                    </div>
                </div>
            </div>

            <MapContainer
                center={center}
                zoom={11}
                style={{ height: '100%', width: '100%', background: '#020617' }}
                zoomControl={false}
                attributionControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {zones.map((zone) => {
                    const poly = parseCoords(zone.coordinates);
                    if (poly.length === 0) return null;

                    const feeValue = parseFloat(zone.fee.toString()) || 0;
                    const isLowFee = feeValue <= 10;

                    return (
                        <Polygon
                            key={zone.id}
                            positions={poly}
                            pathOptions={{
                                fillColor: isLowFee ? '#10b981' : '#6366f1',
                                color: isLowFee ? '#34d399' : '#818cf8',
                                weight: 2,
                                fillOpacity: 0.2,
                            }}
                            eventHandlers={{
                                mouseover: (e) => {
                                    const layer = e.target;
                                    layer.setStyle({ fillOpacity: 0.45, weight: 4 });
                                },
                                mouseout: (e) => {
                                    const layer = e.target;
                                    layer.setStyle({ fillOpacity: 0.2, weight: 2 });
                                }
                            }}
                        >
                            <Tooltip
                                permanent
                                direction="center"
                                className="custom-zone-tooltip"
                                opacity={0.9}
                            >
                                <div className="bg-slate-950/95 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl flex flex-col items-center gap-1 min-w-[100px] pointer-events-none transform transition-transform group-hover:scale-110">
                                    <span className="text-[11px] font-black text-white whitespace-nowrap mb-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-indigo-400" /> {zone.name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="px-2 py-1 bg-indigo-500/20 rounded-lg border border-indigo-500/30 flex items-center gap-1">
                                            <span className="text-[12px] font-black text-indigo-400">{zone.fee}</span>
                                            <span className="text-[8px] font-bold text-indigo-400/80">﷼</span>
                                        </div>
                                        <div className="px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                                            <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
                                            <span className="text-[10px] font-black text-emerald-400">سعر التوصيل</span>
                                        </div>
                                    </div>
                                    <div className="mt-1 flex items-center gap-1 opacity-60">
                                        <ShieldCheck className="w-2.5 h-2.5 text-slate-400" />
                                        <span className="text-[8px] font-bold text-slate-500 uppercase">Secure Zone Verified</span>
                                    </div>
                                </div>
                            </Tooltip>
                        </Polygon>
                    );
                })}
            </MapContainer>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-zone-tooltip {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                .custom-zone-tooltip::before {
                    display: none !important;
                }
                .leaflet-container {
                    background: #020617 !important;
                }
            ` }} />
        </div>
    );
}
