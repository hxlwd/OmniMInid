create extension if not exists "pgcrypto";
create extension if not exists "vector";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '新的对话',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.langgraph_checkpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.conversations(id) on delete cascade,
  version integer not null,
  source text not null default 'chat' check (source in ('chat', 'tool', 'system')),
  state jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, thread_id, version)
);

create table if not exists public.memory_store_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  namespace text[] not null,
  namespace_path text not null,
  key text not null,
  kind text not null default 'memory',
  value jsonb not null default '{}',
  content text not null default '',
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, namespace_path, key)
);

create table if not exists public.notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  source text not null default 'manual' check (source in ('manual', 'agent', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notebook_id uuid references public.notebooks(id) on delete set null,
  title text not null,
  source_type text not null check (source_type in ('handwriting', 'image', 'audio', 'document', 'text')),
  mime_type text not null,
  size_bytes bigint,
  storage_bucket text not null default 'learning-assets',
  storage_path text not null,
  status text not null default 'uploading' check (status in ('uploading', 'queued', 'processing', 'ready', 'failed', 'archived')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.learning_assets(id) on delete cascade,
  content text not null,
  source_ref jsonb not null default '{}',
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_name text not null,
  input jsonb not null default '{}',
  risk text not null check (risk in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'failed')),
  summary text not null default '',
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  topic text not null,
  source text not null default 'agent' check (source in ('agent', 'manual')),
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  practice_set_id uuid not null references public.practice_sets(id) on delete cascade,
  position integer not null default 0,
  prompt text not null,
  answer text not null,
  explanation text not null default '',
  difficulty text not null default 'core',
  created_at timestamptz not null default now()
);

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  practice_item_id uuid not null references public.practice_items(id) on delete cascade,
  answer text not null,
  is_correct boolean,
  confidence smallint check (confidence is null or confidence between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  objective text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_plan_id uuid not null references public.study_plans(id) on delete cascade,
  position integer not null default 0,
  title text not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  reflection text,
  confidence smallint check (confidence is null or confidence between 1 and 5),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx on public.conversations(user_id);
create index if not exists messages_conversation_id_created_at_idx on public.messages(conversation_id, created_at);
create index if not exists langgraph_checkpoints_thread_version_idx on public.langgraph_checkpoints(user_id, thread_id, version desc);
create index if not exists memory_store_items_namespace_idx on public.memory_store_items(user_id, namespace_path);
create index if not exists memory_store_items_embedding_idx on public.memory_store_items using hnsw (embedding vector_cosine_ops) where embedding is not null;
create index if not exists notebooks_user_id_idx on public.notebooks(user_id);
create index if not exists learning_assets_user_status_idx on public.learning_assets(user_id, status);
create index if not exists asset_chunks_asset_id_idx on public.asset_chunks(asset_id);
create index if not exists asset_chunks_embedding_idx on public.asset_chunks using hnsw (embedding vector_cosine_ops) where embedding is not null;
create index if not exists agent_actions_user_status_idx on public.agent_actions(user_id, status);
create index if not exists practice_sets_user_id_idx on public.practice_sets(user_id);
create index if not exists study_plans_user_id_idx on public.study_plans(user_id);

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on table public.profiles to authenticated, service_role;
grant select, insert, update, delete on table public.conversations to authenticated, service_role;
grant select, insert, update, delete on table public.messages to authenticated, service_role;
grant select, insert, update, delete on table public.langgraph_checkpoints to authenticated, service_role;
grant select, insert, update, delete on table public.memory_store_items to authenticated, service_role;
grant select, insert, update, delete on table public.notebooks to authenticated, service_role;
grant select, insert, update, delete on table public.learning_assets to authenticated, service_role;
grant select, insert, update, delete on table public.asset_chunks to authenticated, service_role;
grant select, insert, update, delete on table public.agent_actions to authenticated, service_role;
grant select, insert, update, delete on table public.practice_sets to authenticated, service_role;
grant select, insert, update, delete on table public.practice_items to authenticated, service_role;
grant select, insert, update, delete on table public.practice_attempts to authenticated, service_role;
grant select, insert, update, delete on table public.study_plans to authenticated, service_role;
grant select, insert, update, delete on table public.study_tasks to authenticated, service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'conversations',
    'memory_store_items',
    'notebooks',
    'learning_assets',
    'agent_actions',
    'practice_sets',
    'study_plans',
    'study_tasks'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.langgraph_checkpoints enable row level security;
alter table public.memory_store_items enable row level security;
alter table public.notebooks enable row level security;
alter table public.learning_assets enable row level security;
alter table public.asset_chunks enable row level security;
alter table public.agent_actions enable row level security;
alter table public.practice_sets enable row level security;
alter table public.practice_items enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_tasks enable row level security;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'conversations',
    'messages',
    'langgraph_checkpoints',
    'memory_store_items',
    'notebooks',
    'learning_assets',
    'asset_chunks',
    'agent_actions',
    'practice_sets',
    'practice_items',
    'practice_attempts',
    'study_plans',
    'study_tasks'
  ]
  loop
    policy_name := table_name || '_all_own';
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = table_name and policyname = policy_name
    ) then
      execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', policy_name, table_name);
    end if;
  end loop;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_all_own') then
    create policy profiles_all_own on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end;
$$;

insert into storage.buckets (id, name, public)
values ('learning-assets', 'learning-assets', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'learning_assets_own_files') then
    create policy learning_assets_own_files on storage.objects
    for all
    using (
      bucket_id = 'learning-assets'
      and auth.uid()::text = (storage.foldername(name))[1]
    )
    with check (
      bucket_id = 'learning-assets'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;
end;
$$;
