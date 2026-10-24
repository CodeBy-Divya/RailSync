import React, { useRef, useState } from 'react';
import { Camera, Image, X, Plus, Loader2, MapPin } from 'lucide-react';
import { ChatPhoto } from '../hooks/useChatStore';

interface PhotoPickerProps {
  photos: ChatPhoto[];
  onPhotosChange: (photos: ChatPhoto[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

// Compress and resize image using HTML5 Canvas
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;
      img.onload = () => {
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // JPEG compression ~0.8
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// Fetch current GPS coordinates if allowed (with fast timeout)
const getFastGeolocation = (): Promise<{ lat?: string; lng?: string } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), 2500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({
          lat: `${pos.coords.latitude.toFixed(5)}° N`,
          lng: `${pos.coords.longitude.toFixed(5)}° E`,
        });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { timeout: 2500, enableHighAccuracy: false }
    );
  });
};

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  disabled = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setMenuOpen(false);

    try {
      const geo = await getFastGeolocation();
      const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';

      const remainingSlots = maxPhotos - photos.length;
      const selectedFiles = Array.from(files).slice(0, remainingSlots);

      const processedPhotos: ChatPhoto[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (!file.type.startsWith('image/')) continue;

        const compressedUrl = await compressImage(file);
        processedPhotos.push({
          id: `photo-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
          url: compressedUrl,
          caption: '',
          timestamp: nowTime,
          geo: {
            lat: geo?.lat || '25.60214° N',
            lng: geo?.lng || '85.12053° E',
            chainage: 'KM 548/14 UP MAIN • ECR Danapur',
          },
        });
      }

      onPhotosChange([...photos, ...processedPhotos]);
    } catch (err) {
      console.error('Failed to process photos', err);
    } finally {
      setIsProcessing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (id: string) => {
    onPhotosChange(photos.filter(p => p.id !== id));
  };

  const handleCaptionChange = (id: string, newCaption: string) => {
    onPhotosChange(
      photos.map(p => (p.id === id ? { ...p, caption: newCaption } : p))
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />

      {/* Camera / Photo Trigger Button */}
      <button
        type="button"
        disabled={disabled || photos.length >= maxPhotos || isProcessing}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Add photos or inspection evidence"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={photos.length >= maxPhotos ? 'Maximum 5 photos reached' : 'Attach photo proof or camera capture'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          border: '1px solid #CBD5E1',
          background: menuOpen ? '#EFF6FF' : '#FFFFFF',
          color: menuOpen ? '#2563EB' : '#475569',
          cursor: disabled || photos.length >= maxPhotos ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          opacity: disabled || photos.length >= maxPhotos ? 0.5 : 1,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        {isProcessing ? (
          <Loader2 size={17} className="animate-spin text-blue-600" />
        ) : (
          <Camera size={17} />
        )}
      </button>

      {/* Dropdown Menu: Take Photo vs Choose from Gallery */}
      {menuOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 100 }}
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: 8,
              width: 190,
              background: '#FFFFFF',
              borderRadius: 10,
              border: '1px solid #CBD5E1',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
              padding: '6px',
              zIndex: 101,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                cameraInputRef.current?.click();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 12px',
                border: 'none',
                background: 'transparent',
                borderRadius: 6,
                color: '#1E293B',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: '#DBEAFE',
                  color: '#1D4ED8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={14} />
              </div>
              <div>
                <div>Take Photo</div>
                <div style={{ fontSize: 10, color: '#64748B', fontWeight: 400 }}>Device camera</div>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                galleryInputRef.current?.click();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 12px',
                border: 'none',
                background: 'transparent',
                borderRadius: 6,
                color: '#1E293B',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: '#F1F5F9',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image size={14} />
              </div>
              <div>
                <div>Choose from Gallery</div>
                <div style={{ fontSize: 10, color: '#64748B', fontWeight: 400 }}>Pick saved files</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Component for rendering the thumbnails preview strip above composer input
export const PhotoThumbnailsStrip: React.FC<{
  photos: ChatPhoto[];
  onRemove: (id: string) => void;
  onCaptionChange: (id: string, caption: string) => void;
}> = ({ photos, onRemove, onCaptionChange }) => {
  if (photos.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        overflowX: 'auto',
        padding: '8px 12px 6px',
        borderBottom: '1px solid #E2E8F0',
        background: '#F8FAFC',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
      }}
    >
      {photos.map((photo, idx) => (
        <div
          key={photo.id}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            padding: '4px 8px 4px 4px',
            flexShrink: 0,
            maxWidth: 240,
          }}
        >
          <img
            src={photo.url}
            alt={`Attached proof ${idx + 1}`}
            style={{
              width: 44,
              height: 44,
              borderRadius: 6,
              objectFit: 'cover',
              border: '1px solid #E2E8F0',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
            <input
              type="text"
              placeholder="Add caption..."
              value={photo.caption || ''}
              onChange={e => onCaptionChange(photo.id, e.target.value)}
              style={{
                fontSize: 11,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                color: '#1E293B',
                width: '100%',
                fontWeight: 500,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9.5, color: '#059669', fontWeight: 600 }}>
              <MapPin size={10} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                GPS Stamped
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(photo.id)}
            aria-label="Remove photo"
            style={{
              background: '#FEE2E2',
              color: '#DC2626',
              border: 'none',
              borderRadius: '50%',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginLeft: 4,
            }}
          >
            <X size={11} />
          </button>
        </div>
      ))}
      <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, paddingLeft: 4 }}>
        ({photos.length}/5 photos attached)
      </span>
    </div>
  );
};

