import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, MapPin, AlertCircle } from 'lucide-react';

// Fix default Leaflet icon paths in Vite bundles
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerProps {
  initialCoordinates?: [number, number]; // [lat, lng]
  onLocationChange: (coords: { latitude: number; longitude: number; source: 'device' | 'exif' | 'manual' }) => void;
  discrepancyWarning?: string | null;
}

// Sub-component to pan the map programmatically
const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// Sub-component to capture map click events
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialCoordinates = [12.9716, 77.5946], // Default center
  onLocationChange,
  discrepancyWarning,
}) => {
  const [position, setPosition] = useState<[number, number]>(initialCoordinates);
  const [locationSource, setLocationSource] = useState<'device' | 'exif' | 'manual'>('manual');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCoordinates) {
      setPosition(initialCoordinates);
    }
  }, [initialCoordinates[0], initialCoordinates[1]]);

  const handlePositionUpdate = (lat: number, lng: number, source: 'device' | 'exif' | 'manual') => {
    const updated: [number, number] = [Number(lat.toFixed(6)), Number(lng.toFixed(6))];
    setPosition(updated);
    setLocationSource(source);
    onLocationChange({
      latitude: updated[0],
      longitude: updated[1],
      source,
    });
  };

  const handleDetectDeviceLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        handlePositionUpdate(pos.coords.latitude, pos.coords.longitude, 'device');
      },
      (err) => {
        setIsLocating(false);
        setLocationError(`Unable to retrieve GPS: ${err.message}. Please place pin manually.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const markerEventHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const marker = e.target;
        if (marker != null) {
          const latLng = marker.getLatLng();
          handlePositionUpdate(latLng.lat, latLng.lng, 'manual');
        }
      },
    }),
    []
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <label className="text-sm font-semibold text-civic-navy flex items-center">
            <MapPin className="w-4 h-4 mr-1 text-civic-saffron" />
            Confirmed Incident Location
          </label>
          <p className="text-xs text-slate-500">
            Drag the pin or click on the map to mark the exact spot
          </p>
        </div>

        <button
          type="button"
          onClick={handleDetectDeviceLocation}
          disabled={isLocating}
          className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <Crosshair className={`w-3.5 h-3.5 mr-1 text-blue-600 ${isLocating ? 'animate-spin' : ''}`} />
          {isLocating ? 'Detecting GPS...' : 'Use My Current Location'}
        </button>
      </div>

      {locationError && (
        <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start">
          <AlertCircle className="w-4 h-4 mr-1.5 shrink-0 text-amber-600 mt-0.5" />
          <span>{locationError}</span>
        </div>
      )}

      {discrepancyWarning && (
        <div className="p-2.5 rounded bg-yellow-50 border border-yellow-300 text-xs text-yellow-900 flex items-start">
          <AlertCircle className="w-4 h-4 mr-1.5 shrink-0 text-yellow-700 mt-0.5" />
          <span>{discrepancyWarning}</span>
        </div>
      )}

      {/* Map View */}
      <div className="h-64 sm:h-72 w-full rounded-lg overflow-hidden border border-slate-300 shadow-inner relative z-0">
        <MapContainer
          center={position}
          zoom={15}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={position} />
          <MapClickHandler
            onMapClick={(lat, lng) => handlePositionUpdate(lat, lng, 'manual')}
          />
          <Marker
            position={position}
            draggable={true}
            eventHandlers={markerEventHandlers}
          />
        </MapContainer>
      </div>

      {/* Coordinate & Source Information Pill */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-slate-100 p-2.5 rounded border border-slate-200">
        <div className="flex items-center space-x-3">
          <span>
            <strong className="text-slate-800">Lat:</strong> {position[0].toFixed(6)}
          </span>
          <span>
            <strong className="text-slate-800">Lng:</strong> {position[1].toFixed(6)}
          </span>
        </div>
        <span className="capitalize px-2 py-0.5 bg-white rounded border border-slate-300 text-[11px] text-slate-700 font-medium">
          Source: {locationSource}
        </span>
      </div>
    </div>
  );
};
