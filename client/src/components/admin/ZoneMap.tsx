
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Trash2, Check, MousePointer2, RotateCcw, Crosshair,
    Circle as CircleIcon, Square, Hexagon, ZoomIn, ZoomOut,
    Search, MapPin, Loader2, X, Globe, Layers, Navigation
} from 'lucide-react';

declare global {
    interface Window {
        maptilersdk: any;
    }
}

interface ZoneMapProps {
    initialCoordinates?: [number, number][];
    onChange: (coords: [number, number][] | null) => void;
    existingZones?: Array<{
        id: number;
        name: string;
        coordinates: any;
    }>;
    editingZoneId?: number;
}

const SA_CITIES = [
    { name: "الرياض", center: [46.6753, 24.7136] },
    { name: "جدة", center: [39.1925, 21.4858] },
    { name: "مكة المكرمة", center: [39.8173, 21.4225] },
    { name: "المدينة المنورة", center: [39.6122, 24.4672] },
    { name: "الدمام", center: [50.1033, 26.4312] },
    { name: "الخبر", center: [50.2081, 26.2764] },
    { name: "أبها", center: [42.5033, 18.2164] },
    { name: "تبوك", center: [36.5715, 28.3835] },
    { name: "حائل", center: [41.6908, 27.5219] },
    { name: "جازان", center: [42.5511, 16.8892] },
    { name: "نجران", center: [44.1277, 17.4933] },
    { name: "الأحساء", center: [49.5883, 25.3281] },
    { name: "القصيم", center: [43.9749, 26.3260] },
    { name: "الطائف", center: [40.4158, 21.2841] },
    { name: "الجبيل", center: [49.6581, 27.0112] },
    { name: "الخرج", center: [47.3113, 24.1500] },
    { name: "ينبع", center: [38.0633, 24.0891] }
];

const MAPTILER_KEY = "9oAkrxTWJrl3BLAkM7Vv";

export default function ZoneMap({ initialCoordinates, onChange, existingZones = [], editingZoneId }: ZoneMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<any>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);

    // Help identify [lat, lng] vs [lng, lat]
    const normalizeLngLat = (p: any): [number, number] => {
        if (!Array.isArray(p)) return [0, 0];
        const v1 = Number(p[0]);
        const v2 = Number(p[1]);
        // Saudi boundaries: Lat 16-32, Lng 34-55
        // If v1 is longitude-like and v2 is latitude-like
        if (v1 > 34 && v1 < 56 && v2 > 15 && v2 < 33) return [v1, v2];
        // If v2 is longitude-like and v1 is latitude-like
        if (v2 > 34 && v2 < 56 && v1 > 15 && v1 < 33) return [v2, v1];
        return [v1, v2];
    };

    const parseCoordinates = (val: any): [number, number][] => {
        if (!val) return [];
        try {
            const arr = typeof val === 'string' ? JSON.parse(val) : val;
            const finalArr = Array.isArray(arr) ? arr : (typeof arr === 'string' ? JSON.parse(arr) : []);
            return finalArr.map(normalizeLngLat);
        } catch (e) { return []; }
    };

    const [points, setPoints] = useState<[number, number][]>(parseCoordinates(initialCoordinates));
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingMode, setDrawingMode] = useState<'polygon' | 'circle' | 'rectangle'>('polygon');
    const [dragStart, setDragStart] = useState<[number, number] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Map Initialization
    useEffect(() => {
        if (map.current || !mapContainer.current) return;
        const sdk = window.maptilersdk;
        if (!sdk) return;

        sdk.config.apiKey = MAPTILER_KEY;
        map.current = new sdk.Map({
            container: mapContainer.current,
            style: sdk.MapStyle.STREETS,
            center: [46.6753, 24.7136],
            zoom: 11,
            attributionControl: false,
        });

        const updateMousePosition = (e: any) => {
            const rect = mapContainer.current?.getBoundingClientRect();
            if (rect) {
                setMousePos({
                    x: e.originalEvent.clientX - rect.left,
                    y: e.originalEvent.clientY - rect.top
                });
            }
        };

        map.current.on('load', () => {
            setIsMapLoaded(true);

            // Add Sources
            map.current.addSource('current-zone', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });

            map.current.addLayer({
                id: 'current-zone-fill',
                type: 'fill',
                source: 'current-zone',
                paint: { 'fill-color': '#6366f1', 'fill-opacity': 0.3 }
            });

            map.current.addLayer({
                id: 'current-zone-outline',
                type: 'line',
                source: 'current-zone',
                paint: { 'line-color': '#4338ca', 'line-width': 3 }
            });

            map.current.addSource('existing-zones', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });

            map.current.addLayer({
                id: 'existing-zones-fill',
                type: 'fill',
                source: 'existing-zones',
                paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.1 }
            });

            syncLayers();
            if (points.length > 0) fitBounds(points);
        });

        // Event Handlers
        map.current.on('click', (e: any) => {
            if (!isDrawing) return;
            const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

            setPoints(prev => {
                let next;
                if (drawingMode === 'polygon') {
                    next = [...prev, lngLat];
                } else {
                    if (!dragStart) {
                        setDragStart(lngLat);
                        return prev;
                    } else {
                        next = drawingMode === 'circle' ? generateCircle(dragStart, lngLat) : generateRect(dragStart, lngLat);
                        setDragStart(null);
                        setIsDrawing(false);
                    }
                }
                onChange(next.map(p => [p[1], p[0]]));
                return next;
            });
        });

        map.current.on('mousemove', (e: any) => {
            updateMousePosition(e);
            if (isDrawing && dragStart && drawingMode !== 'polygon') {
                const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
                const draft = drawingMode === 'circle' ? generateCircle(dragStart, lngLat) : generateRect(dragStart, lngLat);
                if (map.current.getSource('current-zone')) {
                    map.current.getSource('current-zone').setData({
                        type: 'Feature',
                        geometry: { type: 'Polygon', coordinates: [draft] }
                    });
                }
            }
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [isDrawing, drawingMode, dragStart]);

    const syncLayers = () => {
        if (!map.current || !isMapLoaded) return;

        // Sync Current Zone
        if (map.current.getSource('current-zone')) {
            const ring = points.length >= 3 ? [[...points, points[0]]] : [];
            map.current.getSource('current-zone').setData({
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: ring }
            });
        }

        // Sync Existing Zones
        if (map.current.getSource('existing-zones')) {
            const features = existingZones
                .filter(z => z.id !== editingZoneId)
                .map(z => {
                    const coords = parseCoordinates(z.coordinates);
                    if (coords.length < 3) return null;
                    return {
                        type: 'Feature',
                        geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]]] }
                    };
                })
                .filter(Boolean);
            map.current.getSource('existing-zones').setData({ type: 'FeatureCollection', features });
        }
    };

    useEffect(() => { syncLayers(); }, [points, existingZones, isMapLoaded]);

    // Geometry Generators
    const generateCircle = (center: [number, number], edge: [number, number]): [number, number][] => {
        const latScale = Math.cos(center[1] * Math.PI / 180);
        const r = Math.sqrt(Math.pow((edge[0] - center[0]) * latScale, 2) + Math.pow(edge[1] - center[1], 2));
        const pts: [number, number][] = [];
        for (let i = 0; i <= 64; i++) {
            const a = (i / 64) * Math.PI * 2;
            pts.push([center[0] + (r / latScale) * Math.cos(a), center[1] + r * Math.sin(a)]);
        }
        return pts;
    };

    const generateRect = (s: [number, number], e: [number, number]): [number, number][] => [
        [s[0], s[1]], [e[0], s[1]], [e[0], e[1]], [s[0], e[1]], [s[0], s[1]]
    ];

    const fitBounds = (pts: [number, number][]) => {
        if (!map.current || pts.length === 0) return;
        const lngs = pts.map(p => p[0]);
        const lats = pts.map(p => p[1]);
        map.current.fitBounds([
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)]
        ], { padding: 50, duration: 1000 });
    };

    // Search Logic
    const handleSearch = async (query: string = searchQuery) => {
        if (!query.trim()) return;
        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=sa&polygon_geojson=1`);
            const data = await res.json();
            setSuggestions(data);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => { if (searchQuery.length > 2) handleSearch(); }, 500);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const applyLocation = (loc: any) => {
        setSuggestions([]);
        setSearchQuery(loc.display_name.split(',')[0]);
        let coords: [number, number][] = [];
        if (loc.geojson?.type === 'Polygon') coords = loc.geojson.coordinates[0];
        else if (loc.geojson?.type === 'MultiPolygon') coords = loc.geojson.coordinates[0][0];

        if (coords.length < 3 && loc.boundingbox) {
            const [s, n, w, e] = loc.boundingbox.map(Number);
            coords = [[w, s], [e, s], [e, n], [w, n], [w, s]];
        }

        if (coords.length >= 3) {
            const final: [number, number][] = coords.map(c => [Number(c[0]), Number(c[1])] as [number, number]);
            setPoints(final);
            onChange(final.map(p => [p[1], p[0]] as [number, number]));
            setIsDrawing(false);
            fitBounds(final);
        } else {
            map.current?.flyTo({ center: [Number(loc.lon), Number(loc.lat)], zoom: 14 });
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4 p-4 bg-slate-50/50">
            {/* Header / Search Area */}
            <div className="flex flex-col lg:flex-row gap-3 z-[2000]">
                <div className="w-full lg:w-64 bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200 shadow-xl">
                    <Select onValueChange={(v) => handleSearch(v)}>
                        <SelectTrigger className="h-11 border-none bg-transparent font-black text-slate-900 focus:ring-0">
                            <MapPin className="w-4 h-4 text-indigo-600 ml-2" />
                            <SelectValue placeholder="اختر مدينة سريعة..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl border-slate-100">
                            {SA_CITIES.map(c => <SelectItem key={c.name} value={c.name} className="font-bold">{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="relative flex-1 group">
                    <div className="flex gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-xl ring-offset-4 ring-indigo-500/10 focus-within:ring-2 transition-all">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="ابحث عن حي، شارع، أو مدينة..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="h-10 pr-10 border-none bg-transparent font-bold focus-visible:ring-0"
                            />
                            {isSearching && <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-500" />}
                        </div>
                    </div>

                    {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden z-[3000] animate-in fade-in slide-in-from-top-2">
                            {suggestions.map((s, i) => (
                                <div key={i} onClick={() => applyLocation(s)} className="p-4 hover:bg-slate-50 cursor-pointer border-b last:border-0 transition-colors">
                                    <p className="font-black text-slate-900 text-sm">{s.display_name.split(',')[0]}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{s.display_name}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Map Content */}
            <div
                className={`flex-1 w-full rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl relative bg-slate-200 group transition-all ${isDrawing ? 'cursor-none' : ''}`}
            >
                <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

                {/* Precision Crosshairs UI */}
                {isDrawing && isMapLoaded && (
                    <div className="absolute inset-0 pointer-events-none z-[1002] overflow-hidden">
                        {/* Horizontal Line */}
                        <div
                            className="absolute left-0 right-0 h-[1.5px] bg-indigo-500/40 backdrop-blur-[1px]"
                            style={{ top: mousePos.y }}
                        />
                        {/* Vertical Line */}
                        <div
                            className="absolute top-0 bottom-0 w-[1.5px] bg-indigo-500/40 backdrop-blur-[1px]"
                            style={{ left: mousePos.x }}
                        />
                        {/* Center Target Box */}
                        <div
                            className="absolute w-6 h-6 border-2 border-indigo-600 rounded-lg -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-indigo-500/10"
                            style={{ left: mousePos.x, top: mousePos.y }}
                        >
                            <div className="w-1 h-1 bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.8)]" />
                        </div>
                    </div>
                )}

                {!isMapLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md z-[1003]">
                        <div className="relative">
                            <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />
                            <Globe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-400" />
                        </div>
                        <p className="mt-6 font-black text-slate-900 text-lg">جاري تجهيز محرك الخرائط الذكي</p>
                        <p className="text-sm text-slate-400 font-bold">بتقنية Vector GL المتطورة</p>
                    </div>
                )}

                {/* Left Floating Controls - Draw Modes */}
                <div className="absolute top-6 left-6 z-[1001] flex flex-col gap-2">
                    <div className="bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-white flex flex-col gap-2 transition-all">
                        <Button
                            variant={(drawingMode === 'polygon' && isDrawing) ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => {
                                if (drawingMode === 'polygon' && isDrawing) {
                                    setIsDrawing(false);
                                } else {
                                    setDrawingMode('polygon');
                                    setDragStart(null);
                                    setIsDrawing(true);
                                }
                            }}
                            className={`h-12 w-12 rounded-xl transition-all ${drawingMode === 'polygon' && isDrawing ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' : 'hover:bg-indigo-50 text-slate-600'}`}
                            title="وضع المضلع (رسم نقطة بنقطة)"
                        >
                            <Hexagon className="w-6 h-6" />
                        </Button>
                        <Button
                            variant={(drawingMode === 'circle' && isDrawing) ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => {
                                if (drawingMode === 'circle' && isDrawing) {
                                    setIsDrawing(false);
                                } else {
                                    setDrawingMode('circle');
                                    setDragStart(null);
                                    setIsDrawing(true);
                                }
                            }}
                            className={`h-12 w-12 rounded-xl transition-all ${drawingMode === 'circle' && isDrawing ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' : 'hover:bg-indigo-50 text-slate-600'}`}
                            title="وضع الدائرة (مركز وسحب)"
                        >
                            <CircleIcon className="w-6 h-6" />
                        </Button>
                        <Button
                            variant={(drawingMode === 'rectangle' && isDrawing) ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => {
                                if (drawingMode === 'rectangle' && isDrawing) {
                                    setIsDrawing(false);
                                } else {
                                    setDrawingMode('rectangle');
                                    setDragStart(null);
                                    setIsDrawing(true);
                                }
                            }}
                            className={`h-12 w-12 rounded-xl transition-all ${drawingMode === 'rectangle' && isDrawing ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' : 'hover:bg-indigo-50 text-slate-600'}`}
                            title="وضع المستطيل (زاوية لزاوية)"
                        >
                            <Square className="w-6 h-6" />
                        </Button>

                        <div className="h-[1px] bg-slate-100 my-1 mx-2" />

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (!map.current) return;
                                const center = map.current.getCenter();
                                const d = 0.01;
                                const quickPoints: [number, number][] = [
                                    [center.lng - d, center.lat - d] as [number, number],
                                    [center.lng + d, center.lat - d] as [number, number],
                                    [center.lng + d, center.lat + d] as [number, number],
                                    [center.lng - d, center.lat + d] as [number, number]
                                ];
                                setPoints(quickPoints);
                                onChange(quickPoints.map(p => [p[1], p[0]] as [number, number]));
                                setIsDrawing(false);
                            }}
                            className="h-12 w-12 rounded-xl hover:bg-indigo-50 text-indigo-600"
                            title="إضافة منطقة سريعة في المنتصف"
                        >
                            <Layers className="w-6 h-6" />
                        </Button>

                        {isDrawing && (
                            <>
                                <div className="h-[1px] bg-slate-100 my-1 mx-2" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { setIsDrawing(false); setDragStart(null); }}
                                    className="h-12 w-12 rounded-xl hover:bg-red-50 text-red-500 animate-in fade-in zoom-in"
                                    title="إلغاء الرسم"
                                >
                                    <X className="w-6 h-6" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Floating Controls - Navigation */}
                <div className="absolute top-6 right-6 z-[1001] flex flex-col gap-3">
                    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white">
                        <Button variant="ghost" size="icon" className="h-12 w-12 border-b" onClick={() => map.current?.zoomIn()}><ZoomIn className="w-5 h-5" /></Button>
                        <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => map.current?.zoomOut()}><ZoomOut className="w-5 h-5" /></Button>
                    </div>
                </div>

                {/* Bottom Center - Stats / Reset */}
                {points.length > 0 && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4">
                        <div className="px-4 py-1.5 border-l border-white/10 flex flex-col items-center">
                            <span className="text-white font-black text-lg leading-tight">{points.length}</span>
                            <span className="text-[8px] text-white/50 font-bold uppercase tracking-widest">نقطة تحديد</span>
                        </div>
                        <div className="flex gap-1.5 px-2">
                            <Button
                                onClick={() => {
                                    const next = points.slice(0, -1);
                                    setPoints(next);
                                    onChange(next.length > 0 ? next.map(p => [p[1], p[0]]) : null);
                                }}
                                size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button
                                onClick={() => { setPoints([]); onChange(null); }}
                                size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Instruction Tooltip */}
                {isDrawing && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000]">
                        <div className="bg-indigo-600 text-white px-6 py-2.5 rounded-full shadow-2xl text-xs font-black flex items-center gap-2 border border-white/20">
                            <Navigation className="w-4 h-4 animate-bounce" />
                            {drawingMode === 'polygon' ? 'وضع المضلع: استخدم الخطوط المتقاطعة للتحديد' : 'وضع الشكل: انقر للمركز ثم وسع النطاق'}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 group transition-all hover:border-indigo-100">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 transition-transform group-hover:scale-110"><Navigation className="w-5 h-5" /></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">نظام التعيين</span>
                        <span className="text-sm font-black text-slate-900">Precision Crosshair</span>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 group transition-all hover:border-emerald-100">
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 transition-transform group-hover:scale-110"><Check className="w-5 h-5" /></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">حالة النظام</span>
                        <span className="text-sm font-black text-slate-900">{isMapLoaded ? 'متصل ونشط' : 'جاري الربط...'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
