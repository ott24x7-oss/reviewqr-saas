export async function readLimited(response: Response, maxBytes: number, message: string) {
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maxBytes) throw new Error(message);
    return bytes;
  }
  const parts: Buffer[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error(message);
    }
    parts.push(Buffer.from(value));
  }
  return Buffer.concat(parts, size);
}
