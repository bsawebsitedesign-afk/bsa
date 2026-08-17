import { ImageResponse } from 'next/og';

export const alt = 'BSA - Build. Break. Secure.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Social card. Deliberately font-free (system stack only) so the build can
 * never fail on a remote font fetch.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#F4F1EA',
        padding: 56,
        border: '16px solid #0B0B0B',
        fontFamily: 'Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 76,
            height: 76,
            backgroundColor: '#0B0B0B',
            border: '4px solid #0B0B0B',
            color: '#FBF9F4',
            fontSize: 30,
            fontWeight: 900,
          }}
        >
          BSA
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#4A4740',
            fontWeight: 700,
          }}
        >
          Business Security Alliance
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 92, fontWeight: 900, color: '#0B0B0B', lineHeight: 1 }}>
          THE PEOPLE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 6 }}>
          <div style={{ display: 'flex', fontSize: 92, fontWeight: 900, color: '#0B0B0B', lineHeight: 1 }}>
            WHO RUN SECURITY.
          </div>
          <div
            style={{ display: 'flex', width: 220, height: 34, backgroundColor: '#C6F432', border: '4px solid #0B0B0B' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', fontSize: 28, color: '#1C1B18' }}>
          Member directory, industry events and business opportunities.
        </div>
        <div
          style={{
            display: 'flex',
            backgroundColor: '#FF3D8B',
            border: '4px solid #0B0B0B',
            color: '#FBF9F4',
            padding: '12px 24px',
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          JOIN BSA
        </div>
      </div>
    </div>,
    size,
  );
}
