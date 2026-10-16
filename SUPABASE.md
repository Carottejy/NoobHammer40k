# Activer les comptes (Supabase)

1. Crée un projet gratuit sur https://supabase.com (région UE conseillée).
2. **SQL Editor → New query**, colle le script ci-dessous, **Run**.
3. **Authentication → Providers → Email** : pour une connexion immédiate sans mail de confirmation, désactive « Confirm email » (facultatif).
4. **Project Settings → API** : copie « Project URL » et la clé « anon public », puis renseigne-les dans `sync-config.js`.

```sql
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  pseudo text unique not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profils visibles par les connectes" on public.profiles for select to authenticated using (true);
create policy "modifier son profil" on public.profiles for update to authenticated using (auth.uid() = id);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, pseudo)
  values (new.id, coalesce(new.raw_user_meta_data->>'pseudo', 'joueur_' || substr(new.id::text, 1, 6)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.sync_docs (
  user_id uuid primary key references auth.users on delete cascade,
  doc jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.sync_docs enable row level security;
create policy "mon document" on public.sync_docs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

La table `profiles` (pseudo unique, lisible par les joueurs connectés) prépare la future liste d'amis.

## Amis et invitations (v1.18)

Tables `friendships` et `game_invites` (RLS : chacun ne voit que ses amitiés et ses invitations), fonction `find_user(pseudo)` pour retrouver un joueur par son pseudo exact, et la lecture des profils limitée à soi-même et à ses contacts. Voir la migration « amis_et_invitations » du projet.
