# MoneyTrack — mobile-friendly Supabase starter

This is a responsive MoneyTrack web app that works on mobile browsers and supports email/password sign-in, income/expense entry, summaries, listing, and deleting transactions.

## 1. Configure Supabase

1. Duplicate `configuration.example.js` and name the copy `config.js`.
2. Put your Supabase Project URL and **publishable key** in `config.js`.
3. Never put a database password, `service_role` key, or secret key in browser code.

## 2. Create the database table

In your Supabase project, open **SQL Editor**, create a new query, paste and run:

```sql
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null check (char_length(description) between 1 and 100),
  amount numeric(12,2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  category text not null default 'Other',
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

drop policy if exists "Users can read their own transactions" on public.transactions;
create policy "Users can read their own transactions"
  on public.transactions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can add their own transactions" on public.transactions;
create policy "Users can add their own transactions"
  on public.transactions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own transactions" on public.transactions;
create policy "Users can delete their own transactions"
  on public.transactions for delete to authenticated
  using (auth.uid() = user_id);
```

## 3. Run/deploy it

Upload `index.html`, `styles.css`, `app.js`, and your `config.js` to a static web host. Keep `config.js` alongside `index.html`. Do not upload `configuration.example.js` in place of the configured file. If Supabase email confirmation is enabled, confirm the email before signing in. For local testing, use a local/static web server rather than opening the HTML as a `file://` URL.

## Notes

- Currency is currently set to LKR in `app.js`. Change `currency: 'LKR'` if you need a different currency.
- The browser app loads Supabase JS from jsDelivr, so an internet connection is needed.
- This is a fresh replacement starter package, not a byte-for-byte recovery of any earlier ZIP.
