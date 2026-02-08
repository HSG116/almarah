import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';

// Fix for default marker icon in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
    location: { lat: number; lng: number } | null;
    onLocationSelect: (lat: number, lng: number) => void;
}

// Component to handle map clicks
function LocationMarker({ location, onLocationSelect }: MapPickerProps) {
    const map = useMap();

    useEffect(() => {
        if (location) {
            map.flyTo([location.lat, location.lng], map.getZoom());
        }
    }, [location, map]);

    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    return location === null ? null : (
        <Marker position={[location.lat, location.lng]} />
    );
}

export function MapPicker({ location, onLocationSelect }: MapPickerProps) {
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(location);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    useEffect(() => {
        setPosition(location);
    }, [location]);

    const handleLocateMe = () => {
        setIsLoadingLocation(true);
        if (!navigator.geolocation) {
            alert("الوصول للموقع غير مدعوم في متصفحك");
            setIsLoadingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                onLocationSelect(latitude, longitude);
                setIsLoadingLocation(false);
            },
            (err) => {
                console.error(err);
                alert("تعذر تحديد موقعك. يرجى السماح بالوصول للموقع.");
                setIsLoadingLocation(false);
            }
        );
    };

    const defaultCenter = position || { lat: 24.7136, lng: 46.6753 }; // Riyadh default

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">حدد موقعك على الخريطة</label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLocateMe}
                    disabled={isLoadingLocation}
                    className="h-8 gap-2"
                >
                    <Navigation className={`h-3 w-3 ${isLoadingLocation ? 'animate-spin' : ''}`} />
                    حدد موقعي تلقائياً
                </Button>
            </div>

            <div className="h-[300px] w-full rounded-xl overflow-hidden border relative z-0">
                <MapContainer
                    center={[defaultCenter.lat, defaultCenter.lng]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker location={position} onLocationSelect={onLocationSelect} />
                </MapContainer>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
                اضغط على الخريطة لتحديد موقع المنزل بدقة
            </p>
        </div>
    );
}
