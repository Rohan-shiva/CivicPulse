import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { IIncidentMapFeature } from '../types';

interface IncidentMapProps {
  features: IIncidentMapFeature[];
  onSelectIncident?: (incidentId: string) => void;
  selectedIncidentId?: string | null;
}

// Custom colored SVG pin markers for priorities
const createPriorityIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 8px; height: 8px; border-radius: 50%; background-color: white;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
};

const MapBoundsUpdater: React.FC<{ features: IIncidentMapFeature[] }> = ({ features }) => {
  const map = useMap();

  useEffect(() => {
    if (features.length === 0) return;

    const bounds = L.latLngBounds(
      features.map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]])
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [features, map]);

  return null;
};

export const IncidentMap: React.FC<IncidentMapProps> = ({
  features,
  onSelectIncident,
}) => {
  const defaultCenter: [number, number] = [12.9716, 77.5946];

  return (
    <div className="h-[420px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsUpdater features={features} />

        {features.map((feat) => {
          const lat = feat.geometry.coordinates[1];
          const lng = feat.geometry.coordinates[0];
          const icon = createPriorityIcon(feat.properties.color);

          return (
            <Marker key={feat.properties.incidentId} position={[lat, lng]} icon={icon}>
              <Popup>
                <div className="p-1 space-y-2 min-w-[200px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {feat.properties.incidentId}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase"
                      style={{ backgroundColor: feat.properties.color }}
                    >
                      {feat.properties.priority}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-900 leading-snug">
                    {feat.properties.title}
                  </p>

                  {feat.properties.address && (
                    <p className="text-[11px] text-slate-500 truncate">
                      📍 {feat.properties.address}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <span>Reports: <strong>{feat.properties.reportCount}</strong></span>
                    <span>Status: <strong>{feat.properties.status}</strong></span>
                  </div>

                  {onSelectIncident && (
                    <button
                      onClick={() => onSelectIncident(feat.properties.incidentId)}
                      className="w-full mt-2 py-1 px-2 text-xs font-semibold bg-civic-navy text-white rounded hover:bg-slate-800 transition"
                    >
                      View & Manage Incident
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend overlay */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200 shadow-md text-xs space-y-1">
        <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">Priority Legend</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
            <span>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-600"></span>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span>
            <span>Low</span>
          </div>
        </div>
      </div>
    </div>
  );
};
