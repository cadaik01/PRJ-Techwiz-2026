import { useEffect, useRef } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';

import type { MarketSummary } from '@/types';
import { cn } from '@/lib/cn';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import './MarketsMap.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const sync = () => {
      map.invalidateSize();
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function FitBounds({
  markets,
  userLat,
  userLng,
}: {
  markets: MarketSummary[];
  userLat?: number | null;
  userLng?: number | null;
}) {
  const map = useMap();
  useEffect(() => {
    const points: L.LatLngExpression[] = markets.map((m) => [m.latitude, m.longitude]);
    if (userLat != null && userLng != null) {
      points.push([userLat, userLng]);
    }
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, markets, userLat, userLng]);
  return null;
}

function ClusterLayer({
  markets,
  highlightedId,
  onHover,
}: {
  markets: MarketSummary[];
  highlightedId: number | null;
  onHover: (id: number | null) => void;
}) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
    });
    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();

    for (const market of markets) {
      const isHi = market.id === highlightedId;
      const marker = L.marker([market.latitude, market.longitude], {
        opacity: isHi ? 1 : 0.85,
        zIndexOffset: isHi ? 1000 : 0,
      });
      const distance =
        market.distance_km !== null ? `<br/>${market.distance_km.toFixed(1)} km` : '';
      marker.bindPopup(
        `<div style="min-width:160px"><strong>${market.name}</strong><br/><span style="font-size:12px;color:#64748b">${market.address}</span>${distance}<br/><a href="/markets/${market.id}">Xem chi tiết →</a></div>`,
      );
      marker.on('mouseover', () => onHover(market.id));
      marker.on('mouseout', () => onHover(null));
      if (isHi) {
        marker.openPopup();
      }
      group.addLayer(marker);
    }
  }, [markets, highlightedId, onHover]);

  return null;
}

export function MarketsMap({
  markets,
  highlightedId,
  onHover,
  userLat,
  userLng,
  className,
}: {
  markets: MarketSummary[];
  highlightedId: number | null;
  onHover: (id: number | null) => void;
  userLat?: number | null;
  userLng?: number | null;
  className?: string;
}) {
  const center: [number, number] =
    userLat != null && userLng != null
      ? [userLat, userLng]
      : markets[0]
        ? [markets[0].latitude, markets[0].longitude]
        : [10.7769, 106.7009];

  return (
    <div className={cn('markets-map', className)}>
      <MapContainer
        center={center}
        zoom={12}
        className="markets-map__leaflet"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds markets={markets} userLat={userLat} userLng={userLng} />
        <InvalidateSize />
        <ClusterLayer markets={markets} highlightedId={highlightedId} onHover={onHover} />
        {userLat != null && userLng != null ? (
          <CircleMarker
            center={[userLat, userLng]}
            radius={8}
            pathOptions={{
              color: '#2563EB',
              fillColor: '#3B82F6',
              fillOpacity: 0.9,
            }}
          >
            <Popup>Vị trí của bạn</Popup>
          </CircleMarker>
        ) : null}
      </MapContainer>
    </div>
  );
}

export function MiniMap({
  latitude,
  longitude,
  label,
  className,
}: {
  latitude: number;
  longitude: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        className="mini-map__leaflet"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          {label ? <Popup>{label}</Popup> : null}
        </Marker>
      </MapContainer>
    </div>
  );
}
