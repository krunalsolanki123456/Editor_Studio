export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url) || url.startsWith('data:image/');
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || url.startsWith('data:video/');
}

export function isAudioUrl(url: string): boolean {
  return /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(url) || url.startsWith('data:audio/');
}
