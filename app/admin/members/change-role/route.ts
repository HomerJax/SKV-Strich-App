import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // in Route Handler hier nicht benötigt
        },
      },
    }
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const userId = formData.get('userId');
  const role = formData.get('role');

  if (
    typeof userId !== 'string' ||
    (role !== 'admin' && role !== 'member')
  ) {
    return NextResponse.redirect(
      new URL('/admin/members?error=member_role_update_failed', request.url)
    );
  }

  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data, error } = await supabase.rpc('admin_update_member_role', {
    target_user_id: userId,
    new_role: role,
  });

  if (error) {
    return NextResponse.redirect(
      new URL('/admin/members?error=member_role_update_failed', request.url)
    );
  }

  if (data === 'cannot_change_own_role') {
    return NextResponse.redirect(
      new URL('/admin/members?error=cannot_change_own_role', request.url)
    );
  }

  if (data === 'last_admin_must_remain') {
    return NextResponse.redirect(
      new URL('/admin/members?error=last_admin_must_remain', request.url)
    );
  }

  if (data !== 'ok') {
    return NextResponse.redirect(
      new URL('/admin/members?error=not_allowed', request.url)
    );
  }

  return NextResponse.redirect(
    new URL('/admin/members?success=role_updated', request.url)
  );
}