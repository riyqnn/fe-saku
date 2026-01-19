import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      console.error('❌ [Setup Wallet] No session found')
      return NextResponse.json(
        { error: 'Unauthorized: No session' },
        { status: 401 }
      )
    }

    const user = session.user
    const userPhone = user.user_metadata?.phone || user.phone
    const uid = user.id

    if (!userPhone) {
      console.error('❌ [Setup Wallet] Phone not found')
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 400 }
      )
    }

    console.log('📱 [Setup Wallet] Phone:', userPhone)
    console.log('👤 [Setup Wallet] User ID:', uid)

    // Check if user already has wallet
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('id', uid)
      .single()

    if (existingProfile?.wallet_address) {
      console.log('✅ [Setup Wallet] User already has wallet')
      return NextResponse.json({
        success: true,
        message: 'User already has wallet',
        address: existingProfile.wallet_address,
        isNewUser: false,
      })
    }

    console.log('🆕 [Setup Wallet] Generating deterministic wallet from phone number...')

    // Generate deterministic private key from phone number
    const phoneBytes = ethers.toUtf8Bytes(userPhone)
    const seed = ethers.keccak256(phoneBytes)
    const privateKey = seed

    console.log('🔑 [Setup Wallet] Deterministic private key generated from phone')

    const userWallet = new ethers.Wallet(privateKey)
    console.log('💼 [Setup Wallet] Wallet address:', userWallet.address)

    // Hash phone with keccak256
    console.log('📋 [Setup Wallet] Hashing phone number with keccak256...')
    const phoneHash = ethers.keccak256(ethers.toUtf8Bytes(userPhone))

    // Store in database
    console.log('💾 [Setup Wallet] Storing wallet in database...')
    const { error: dbError } = await supabase.from('profiles').upsert({
      id: uid,
      phone_number: userPhone,
      phone_hash: phoneHash,
      wallet_address: userWallet.address,
      is_verified: true,
    })

    if (dbError) throw dbError

    console.log('✅ [Setup Wallet] Wallet created and stored successfully')

    return NextResponse.json({
      success: true,
      message: 'Wallet created',
      address: userWallet.address,
      isNewUser: true,
    })
  } catch (error: any) {
    console.error('❌ [Setup Wallet] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Wallet creation failed' },
      { status: 500 }
    )
  }
}