import QRCode from 'qrcode';

export type QrFormat = 'svg' | 'png' | 'dataurl';

export async function renderQr(text: string, format?: 'svg', size?: number): Promise<string>;
export async function renderQr(text: string, format: 'png', size?: number): Promise<Buffer>;
export async function renderQr(text: string, format: 'dataurl', size?: number): Promise<string>;
export async function renderQr(text: string, format: QrFormat = 'svg', size = 512): Promise<string | Buffer> {
  const options = {
    errorCorrectionLevel: 'M' as const,
    margin: 1,
    width: size,
    color: { dark: '#07070A', light: '#FFFFFFFF' },
  };
  if (format === 'svg') return QRCode.toString(text, { ...options, type: 'svg' });
  if (format === 'dataurl') return QRCode.toDataURL(text, options);
  return QRCode.toBuffer(text, { ...options, type: 'png' });
}

export function tableMenuUrl(baseUrl: string, slug: string, qrToken: string) {
  return `${baseUrl.replace(/\/$/, '')}/r/${slug}/menu?table=${qrToken}`;
}
