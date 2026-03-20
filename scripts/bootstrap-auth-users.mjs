import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bulkTempPassword = process.env.BULK_TEMP_PASSWORD;

if (!supabaseUrl) {
  console.error("Fehlt: NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("Fehlt: SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!bulkTempPassword || bulkTempPassword.length < 8) {
  console.error("Fehlt oder zu kurz: BULK_TEMP_PASSWORD (mindestens 8 Zeichen)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function getAllAuthUsers() {
  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const batch = data?.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function main() {
  console.log("Lade bestehende Auth-User ...");
  const authUsers = await getAllAuthUsers();

  const authUserByEmail = new Map();
  for (const user of authUsers) {
    const email = normalizeEmail(user.email);
    if (email) {
      authUserByEmail.set(email, user);
    }
  }

  console.log("Lade offene Player ...");
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, email, name, user_id")
    .is("user_id", null)
    .not("email", "is", null)
    .order("id", { ascending: true });

  if (playersError) {
    throw playersError;
  }

  if (!players || players.length === 0) {
    console.log("Keine offenen Player gefunden.");
    return;
  }

  let linkedExisting = 0;
  let createdAndLinked = 0;
  let skippedInvalid = 0;
  let failed = 0;

  console.log(`Zu verarbeiten: ${players.length}`);

  for (const player of players) {
    const email = normalizeEmail(player.email);

    if (!email) {
      skippedInvalid += 1;
      console.log(`SKIP  player#${player.id}: ungültige E-Mail`);
      continue;
    }

    try {
      let authUser = authUserByEmail.get(email);

      if (!authUser) {
        const { data: created, error: createError } =
          await supabase.auth.admin.createUser({
            email,
            password: bulkTempPassword,
            email_confirm: true,
            user_metadata: {
              bootstrap_created: true,
              player_id: player.id,
              player_name: player.name ?? null,
            },
          });

        if (createError) {
          throw createError;
        }

        authUser = created?.user ?? null;

        if (!authUser?.id) {
          throw new Error(`Auth-User konnte nicht erstellt werden für ${email}`);
        }

        authUserByEmail.set(email, authUser);
        createdAndLinked += 1;
        console.log(`CREATE player#${player.id}: ${email} -> ${authUser.id}`);
      } else {
        linkedExisting += 1;
        console.log(`LINK  player#${player.id}: ${email} -> ${authUser.id}`);
      }

      const { error: updateError } = await supabase
        .from("players")
        .update({ user_id: authUser.id })
        .eq("id", player.id)
        .is("user_id", null);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      failed += 1;
      console.error(`FAIL  player#${player.id}: ${email}`);
      console.error(error);
    }
  }

  console.log("");
  console.log("FERTIG");
  console.log(`Bestehende Auth-User verknüpft: ${linkedExisting}`);
  console.log(`Neu erstellte Auth-User:       ${createdAndLinked}`);
  console.log(`Übersprungen:                  ${skippedInvalid}`);
  console.log(`Fehler:                        ${failed}`);
  console.log("");
  console.log("Wichtig:");
  console.log(`Alle neu erstellten Accounts haben aktuell dieses temporäre Passwort: ${bulkTempPassword}`);
  console.log("Bitte danach Passwortwechsel sauber organisieren.");
}

main().catch((error) => {
  console.error("Bootstrap abgebrochen:");
  console.error(error);
  process.exit(1);
});