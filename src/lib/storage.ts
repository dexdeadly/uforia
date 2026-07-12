import fs from 'fs'
import path from 'path'

function uploadsDir(): string {
  const dir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(process.cwd(), 'uploads')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export async function uploadBuffer(
  fileName: string,
  _contentType: string,
  buffer: Buffer,
): Promise<{ cloud_storage_path: string }> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const cloud_storage_path = `${Date.now()}-${safeName}`
  fs.writeFileSync(path.join(uploadsDir(), cloud_storage_path), buffer)
  return { cloud_storage_path }
}

export async function getFileBuffer(cloud_storage_path: string): Promise<Buffer> {
  return fs.readFileSync(path.join(uploadsDir(), cloud_storage_path))
}

export async function deleteFile(cloud_storage_path: string): Promise<void> {
  const fullPath = path.join(uploadsDir(), cloud_storage_path)
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
}
