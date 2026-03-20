import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
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

async function buildRedirectUrl(path: string) {
  const headerStore = await headers();

  const forwardedProto = headerStore.get('x-forwarded-proto');
  const forwardedHost = headerStore.get('x-forwarded-host');
  const host = headerStore.get('host');

  if (forwardedProto && forwardedHost) {
    return new URL(path, `${forwardedProto}://${forwardedHost}`);
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return new URL(path, process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return new URL(path, process.env.NEXT_PUBLIC_SITE_URL);
  }

  return new URL(path, `http://${host ?? 'localhost:3000'}`);
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const userId = formData.get('userId');
  const playerIdRaw = formData.get('playerId');

  if (typeof userId !== 'string') {
    return NextResponse.redirect(
      await buildRedirectUrl('/admin/members?error=member_player_link_failed')
    );
  }

  let playerId: number | null = null;

  if (typeof playerIdRaw === 'string' && playerIdRaw.trim() !== '') {
    const parsed = Number(playerIdRaw);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      return NextResponse.redirect(
        await buildRedirectUrl('/admin/members?error=member_player_link_failed')
      );
    }

    playerId = parsed;
  }

  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(await buildRedirectUrl('/login'));
  }

  const { data, error } = await supabase.rpc('admin_link_member_player', {
    target_user_id: userId,
    target_player_id: playerId,
  });

  if (error) {
    return NextResponse.redirect(
      await buildRedirectUrl('/admin/members?error=member_player_link_failed')
    );
  }

  if (data === 'member_not_in_club') {
    return NextResponse.redirect(
      await buildRedirectUrl('/admin/members?error=member_not_in_club')
    );
  }

  if (data === 'player_not_in_club') {
    return NextResponse.redirect(
      await buildRedirectUrl('/admin/members?error=player_not_in_club')
    );
  }

  if (data === 'player_already_linked') {
    return NextResponse.redirect(
      await buildRedirectUrl('/admin/members?error=player_already_linked')
    );
  }

  if (data === 'ok_unlinked') {
    return NextResponse.redirect(
      await buildRedirectUrl('/admin/members?success=player_unlinked')
    );
  }

  if (data !== 'ok') {
    return NextResponse.redirect(
      await buildRedirectUrl('/admin/members?error=not_allowed')
    );
  }

  return NextResponse.redirect(
    await buildRedirectUrl('/admin/members?success=player_linked')
  );
}