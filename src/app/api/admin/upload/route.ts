import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import {
  requirePermission,
  ok,
  fail,
  writeAudit,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

// POST /api/admin/upload
// Accepts either:
//   - multipart/form-data with a `file` field (recommended for large images)
//   - JSON body: { "dataUrl": "data:image/png;base64,..." }  (for tiny uploads / data URLs)
//
// Returns: { "url": "/uploads/<random-name>.png" }
//
// Saves the file to /public/uploads/ and returns a server-relative URL that the
// menu editor can store on MenuItem.image. Files are served statically by Next.
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
}

export async function POST(req: NextRequest) {
  // Anyone who can create/update a menu item may upload an image for it.
  // We check MENU_ITEM.CREATE — if you don't have it, you don't need to upload.
  const { user, error } = await requirePermission('MENU_ITEM.CREATE')
  if (error) return error
  if (!user) return fail('Unauthorized', 401)

  const contentType = req.headers.get('content-type') || ''

  let buffer: Buffer
  let mime: string

  try {
    if (contentType.startsWith('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file')
      if (!(file instanceof File)) {
        return fail('Missing "file" field in form data.', 400)
      }
      if (file.size > MAX_BYTES) {
        return fail(
          `File too large (max ${MAX_BYTES / 1024 / 1024}MB).`,
          413,
        )
      }
      mime = file.type || 'image/png'
      if (!ALLOWED_MIME.includes(mime)) {
        return fail(`Unsupported file type: ${mime}`, 415)
      }
      const ab = await file.arrayBuffer()
      buffer = Buffer.from(ab)
    } else if (contentType.includes('application/json')) {
      const body = await req.json()
      const dataUrl: string | undefined = body?.dataUrl
      if (!dataUrl) {
        return fail('Missing "dataUrl" in JSON body.', 400)
      }
      const match = dataUrl.match(
        /^data:(image\/(png|jpeg|webp|gif|svg\+xml));base64,(.+)$/i,
      )
      if (!match) {
        return fail('Invalid data URL. Expected data:image/...;base64,...', 400)
      }
      mime = match[1].toLowerCase()
      const base64 = match[3]
      buffer = Buffer.from(base64, 'base64')
      if (buffer.length > MAX_BYTES) {
        return fail(
          `Decoded image too large (max ${MAX_BYTES / 1024 / 1024}MB).`,
          413,
        )
      }
    } else {
      return fail(
        'Unsupported Content-Type. Use multipart/form-data or application/json.',
        415,
      )
    }
  } catch (err: any) {
    return fail(`Failed to parse upload: ${err.message || err}`, 400)
  }

  // Generate a random filename — never trust the client's filename.
  const ext = EXT_BY_MIME[mime] || 'bin'
  const rand = crypto.randomBytes(8).toString('hex')
  const filename = `${Date.now()}-${rand}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  const filePath = path.join(uploadDir, filename)

  try {
    await fs.mkdir(uploadDir, { recursive: true })
    await fs.writeFile(filePath, buffer)
  } catch (err: any) {
    console.error('[upload] write failed:', err)
    return fail('Failed to save uploaded file.', 500)
  }

  const url = `/uploads/${filename}`
  writeAudit(user, 'CREATE', 'UPLOAD', null, { url, mime, bytes: buffer.length })

  return ok({ url, mime, bytes: buffer.length }, 201)
}
