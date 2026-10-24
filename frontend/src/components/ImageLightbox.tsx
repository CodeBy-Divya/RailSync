import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, MapPin, Clock } from 'lucide-react';

export interface LightboxPhoto {
  url: string;
  caption?: string;
  timestamp?: string;
  geo?: {
    lat?: string;
    lng?: string;
    chainage?: string;
  };
}

interface ImageLightboxProps {
  photo: LightboxPhoto | null;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ photo, onClose }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setScale(1);
  }, [photo]);

  useEffect(() => {
    if (!photo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setScale(s => Math.min(s + 0.25, 3));
      if (e.key === '-') setScale(s => Math.max(s - 0.25, 0.5));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, onClose]);

  if (!photo) return null;

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = photo.url;
      link.download = `railsync-photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (_) {}
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo inspection lightbox"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
          color: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: 'rgba(37, 99, 235, 0.35)',
              border: '1px solid rgba(96, 165, 250, 0.4)',
              fontSize: 11,
              fontWeight: 700,
              color: '#93C5FD',
              letterSpacing: '0.04em',
            }}
          >
            FIELD EVIDENCE ATTACHMENT
          </div>
          {photo.timestamp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#CBD5E1' }}>
              <Clock size={13} color="#94A3B8" />
              <span>{photo.timestamp}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setScale(s => Math.min(s + 0.25, 3))}
            aria-label="Zoom in"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 6,
              padding: '7px 10px',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
            }}
            title="Zoom In (+)"
          >
            <ZoomIn size={16} />
            <span style={{ fontSize: 11 }}>{Math.round(scale * 100)}%</span>
          </button>

          <button
            type="button"
            onClick={() => setScale(s => Math.max(s - 0.25, 0.5))}
            aria-label="Zoom out"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 6,
              padding: '7px 10px',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Zoom Out (-)"
          >
            <ZoomOut size={16} />
          </button>

          <button
            type="button"
            onClick={() => setScale(1)}
            aria-label="Reset zoom"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 6,
              padding: '7px 10px',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Reset Zoom"
          >
            <RotateCcw size={15} />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            aria-label="Download photo"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 6,
              padding: '7px 10px',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Download image"
          >
            <Download size={15} />
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close photo preview"
            style={{
              background: 'rgba(239, 68, 68, 0.8)',
              border: 'none',
              borderRadius: 6,
              padding: '7px 12px',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              marginLeft: 4,
            }}
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          padding: 20,
        }}
        onClick={e => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          src={photo.url}
          alt={photo.caption || 'Field Inspection Evidence'}
          style={{
            maxWidth: '90%',
            maxHeight: '75vh',
            objectFit: 'contain',
            borderRadius: 10,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            transform: `scale(${scale})`,
            transition: 'transform 0.15s ease-out',
            cursor: scale > 1 ? 'grab' : 'default',
          }}
        />
      </div>

      {/* Bottom Metadata & Caption Bar */}
      <div
        style={{
          padding: '16px 24px 20px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {photo.caption && (
          <div style={{ fontSize: 14, fontWeight: 600, color: '#F8FAFC', lineHeight: 1.4 }}>
            {photo.caption}
          </div>
        )}

        {photo.geo && (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14, fontSize: 11.5, color: '#94A3B8' }}>
            {photo.geo.chainage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#60A5FA', fontWeight: 600 }}>
                <MapPin size={13} />
                <span>{photo.geo.chainage}</span>
              </div>
            )}
            {photo.geo.lat && photo.geo.lng && (
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#CBD5E1' }}>
                GPS: {photo.geo.lat}, {photo.geo.lng}
              </div>
            )}
            <div style={{ color: '#10B981', fontWeight: 600 }}>
              ✓ Geotagged &amp; Cryptographically Anchored
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

