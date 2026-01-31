import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, filename } = await req.json()

    // Validate inputs
    if (!imageBase64 || !filename) {
      return NextResponse.json(
        { error: 'Missing imageBase64 or filename' },
        { status: 400 }
      )
    }

    // Convert base64 to buffer
    const base64Data = imageBase64.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    console.log('Uploading to Supabase Storage:', filename)

    // Upload to Supabase Storage
    const { data, error } = await supabase
      .storage
      .from('receipts')
      .upload(`${Date.now()}-${filename}`, buffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('receipts')
      .getPublicUrl(data.path)

    console.log('Upload successful:', publicUrl)

    return NextResponse.json({ url: publicUrl })
  } catch (error: any) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: `Server error: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
