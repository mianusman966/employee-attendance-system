import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, full_name, role, password } = body as {
      email: string;
      full_name: string;
      role: 'admin' | 'employee';
      password: string;
    };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Get auth token from request headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the caller is an admin using anon client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Create client with the user's token to verify they're admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Use service role to create the new user
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // First, check if user already exists
    const { data: existingUser } = await adminClient.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email);
    
    if (userExists) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    // Create the user WITHOUT email_confirm to avoid trigger issues
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr) {
      console.error('Supabase createUser error:', createErr);
      return NextResponse.json({ error: `Database error creating new user: ${createErr.message}` }, { status: 400 });
    }

    const newUserId = created.user?.id;
    if (!newUserId) {
      return NextResponse.json({ error: 'User created but no ID returned' }, { status: 500 });
    }

    // Wait a moment for any auth triggers to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if profile already exists (from trigger)
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', newUserId)
      .single();

    if (existingProfile) {
      // Profile exists from trigger, just update it
      const { error: updateErr } = await adminClient
        .from('profiles')
        .update({ full_name, role })
        .eq('id', newUserId);

      if (updateErr) {
        console.error('Profile update error:', updateErr);
        return NextResponse.json({ error: `Error updating profile: ${updateErr.message}` }, { status: 400 });
      }
    } else {
      // Create profile manually
      const { error: profileErr } = await adminClient
        .from('profiles')
        .insert({ id: newUserId, email, full_name, role });

      if (profileErr) {
        console.error('Profile creation error:', profileErr);
        return NextResponse.json({ error: `Error creating profile: ${profileErr.message}` }, { status: 400 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      user_id: newUserId,
      message: 'User created successfully'
    }, { status: 200 });

  } catch (e: any) {
    console.error('User creation error:', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
