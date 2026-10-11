(() => {
  const $ = (id) => document.getElementById(id);
  const config = window.MONEYTRACK_CONFIG;
  const notice = $('setupNotice');
  const authPanel = $('authPanel');
  const dashboard = $('dashboard');
  let supabase = null;
  let currentUser = null;

  const money = (n) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LKR' }).format(Number(n || 0));
  const escapeText = (s) => String(s ?? '');
  const showMessage = (id, text, isError = false) => { const el = $(id); el.textContent = text; el.style.color = isError ? 'var(--red)' : 'var(--accent)'; };

  function init() {
    if (!config || !config.SUPABASE_URL || config.SUPABASE_URL.includes('YOUR-PROJECT') || !config.SUPABASE_ANON_KEY || config.SUPABASE_ANON_KEY.includes('YOUR-PUBLISHABLE')) {
      notice.textContent = 'Setup needed: create config.js from configuration.example.js and add your Supabase Project URL and publishable key.';
      notice.classList.remove('hidden');
      $('signInBtn').disabled = true; $('signUpBtn').disabled = true;
      return;
    }
    if (!window.supabase?.createClient) {
      notice.textContent = 'Could not load the Supabase client. Check your internet connection and reload this page.';
      notice.classList.remove('hidden'); return;
    }
    supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    $('date').value = new Date().toISOString().slice(0, 10);
    $('authForm').addEventListener('submit', signIn);
    $('signUpBtn').addEventListener('click', signUp);
    $('signOutBtn').addEventListener('click', signOut);
    $('transactionForm').addEventListener('submit', addTransaction);
    $('refreshBtn').addEventListener('click', loadTransactions);
    supabase.auth.onAuthStateChange((_event, session) => { currentUser = session?.user ?? null; renderAuthState(); });
    supabase.auth.getSession().then(({ data }) => { currentUser = data.session?.user ?? null; renderAuthState(); });
  }

  async function signIn(e) {
    e.preventDefault(); showMessage('authMessage', 'Signing in…');
    const { error } = await supabase.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
    showMessage('authMessage', error ? error.message : 'Signed in.', !!error);
  }
  async function signUp() {
    showMessage('authMessage', 'Creating account…');
    const { data, error } = await supabase.auth.signUp({ email: $('email').value.trim(), password: $('password').value });
    if (error) return showMessage('authMessage', error.message, true);
    showMessage('authMessage', data.session ? 'Account created.' : 'Account created. Check your email to confirm, then sign in.');
  }
  async function signOut() { await supabase.auth.signOut(); }
  function renderAuthState() {
    authPanel.classList.toggle('hidden', !!currentUser);
    dashboard.classList.toggle('hidden', !currentUser);
    if (currentUser) { $('userEmail').textContent = currentUser.email || 'Signed in'; loadTransactions(); }
  }
  async function loadTransactions() {
    if (!currentUser) return;
    $('transactionList').replaceChildren(Object.assign(document.createElement('p'), { className: 'muted', textContent: 'Loading transactions…' }));
    const { data, error } = await supabase.from('transactions').select('id, description, amount, type, category, transaction_date, created_at').eq('user_id', currentUser.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).limit(100);
    if (error) {
      $('transactionList').textContent = 'Could not load transactions. Make sure you have run the SQL setup in README.md.';
      showMessage('formMessage', error.message, true); return;
    }
    const rows = data || [];
    const income = rows.filter(x => x.type === 'income').reduce((s, x) => s + Number(x.amount), 0);
    const expenses = rows.filter(x => x.type === 'expense').reduce((s, x) => s + Number(x.amount), 0);
    $('income').textContent = money(income); $('expenses').textContent = money(expenses); $('balance').textContent = money(income - expenses);
    const list = $('transactionList'); list.replaceChildren();
    if (!rows.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No transactions yet. Add your first one above.'; list.append(p); return; }
    rows.forEach(row => {
      const node = $('transactionTemplate').content.firstElementChild.cloneNode(true);
      node.querySelector('.transaction-icon').textContent = row.type === 'income' ? '↙' : '↗';
      node.querySelector('.transaction-description').textContent = row.description;
      node.querySelector('.transaction-meta').textContent = `${row.category} · ${row.transaction_date}`;
      const amount = node.querySelector('.transaction-amount'); amount.textContent = `${row.type === 'income' ? '+' : '−'}${money(row.amount)}`; amount.classList.add(row.type === 'income' ? 'positive' : 'negative');
      const del = node.querySelector('.delete-btn'); del.setAttribute('aria-label', `Delete ${row.description}`); del.addEventListener('click', () => deleteTransaction(row.id));
      list.append(node);
    });
  }
  async function addTransaction(e) {
    e.preventDefault(); if (!currentUser) return;
    const amount = Number($('amount').value);
    if (!Number.isFinite(amount) || amount <= 0) return showMessage('formMessage', 'Enter an amount greater than zero.', true);
    $('addBtn').disabled = true; showMessage('formMessage', 'Saving…');
    const payload = { user_id: currentUser.id, description: $('description').value.trim(), amount, type: $('type').value, category: $('category').value, transaction_date: $('date').value };
    const { error } = await supabase.from('transactions').insert(payload);
    $('addBtn').disabled = false;
    if (error) return showMessage('formMessage', error.message, true);
    $('description').value = ''; $('amount').value = ''; showMessage('formMessage', 'Transaction saved.'); await loadTransactions();
  }
  async function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', currentUser.id);
    if (error) showMessage('formMessage', error.message, true); else { showMessage('formMessage', 'Transaction deleted.'); await loadTransactions(); }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
