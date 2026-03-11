import { ImageResponse } from 'next/og';

export const size = {
  width: 64,
  height: 64,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
          color: '#ffffff',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        LP
      </div>
    ),
    {
      ...size,
    }
  );
}
