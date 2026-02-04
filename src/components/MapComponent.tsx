import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

// Fix for default marker icon in react-leaflet
// delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom colored icons
const getIcon = (color: string) => {
    // Using colored marker images from a CDN or custom SVG could be better, 
    // but for now we'll use CSS filters or different URLs if available.
    // A simple way is to use a custom divIcon or image URL.
    // For simplicity MVP:

    let iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
    if (color === 'red') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
    if (color === 'orange') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png';
    if (color === 'yellow') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png';

    return new Icon({
        iconUrl,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
};

interface MarkerData {
    id: string;
    lat: number;
    lng: number;
    title: string;
    description?: string;
    statusColor: 'green' | 'yellow' | 'orange' | 'red';
    onWhatsAppClick?: () => void;
    hasPhone?: boolean;
}

interface MapComponentProps {
    markers: MarkerData[];
    center?: [number, number]; // [lat, lng]
    zoom?: number;
}

export default function MapComponent({ markers, center = [-23.5505, -46.6333], zoom = 13 }: MapComponentProps) {
    return (
        <div className="h-[500px] w-full rounded-lg overflow-hidden border border-border">
            <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {markers.map((marker) => (
                    <Marker
                        key={marker.id}
                        position={[marker.lat, marker.lng]}
                        icon={getIcon(marker.statusColor)}
                    >
                        <Popup>
                            <div className="p-1 min-w-[200px]">
                                <h3 className="font-bold text-sm mb-1">{marker.title}</h3>
                                {marker.description && <p className="text-xs text-muted-foreground mb-2">{marker.description}</p>}

                                {marker.onWhatsAppClick && (
                                    <Button
                                        size="sm"
                                        className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white h-8"
                                        onClick={marker.onWhatsAppClick}
                                        disabled={!marker.hasPhone}
                                    >
                                        <MessageSquare className="mr-2 h-3 w-3" />
                                        WhatsApp
                                    </Button>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
