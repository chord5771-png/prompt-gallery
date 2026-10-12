const state = { prompts: [], query: '', category: '', tag: '' };
const $ = (id) => document.getElementById(id);
const grid = $('card-grid');
const dialog = $('detail-dialog');

function normalize(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\s·,，。！!？?、]+/g, '');
}

function searchText(item) {
  return normalize([item.name, item.category, item.subcategory, item.description, ...item.useCases, ...item.tags].join(' '));
}

function matches(item) {
  if (state.category && item.category !== state.category) return false;
  if (state.tag && !item.tags.includes(state.tag)) return false;
  const terms = state.query.trim().split(/\s+/).map(normalize).filter(Boolean);
  const haystack = searchText(item);
  return terms.every((term) => haystack.includes(term));
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function promptUrl(id) {
  const url = new URL(window.location.href);
  url.searchParams.set('prompt', id);
  return url;
}

function card(item) {
  const article = element('article', 'prompt-card');
  const link = element('a', 'card-link');
  link.href = promptUrl(item.id).toString();
  link.setAttribute('aria-label', `查看 ${item.name} 的完整提示词`);
  link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    history.pushState({}, '', link.href);
    openPrompt(item);
  });

  const visual = element('div', 'card-image-wrap');
  const image = document.createElement('img');
  image.src = item.cover;
  image.alt = item.coverType === 'illustration' ? `${item.name}风格示意图，并非真实生成效果` : `${item.name}示例图`;
  image.loading = 'lazy';
  visual.append(image);
  if (item.coverType === 'illustration') visual.append(element('span', 'cover-label', '风格示意'));
  visual.append(element('span', 'card-arrow', '↗'));
  link.append(visual);

  const meta = element('div', 'card-meta');
  meta.append(element('span', '', `${item.category} / ${item.subcategory || '风格'}`), element('span', '', `NO. ${String(state.prompts.indexOf(item) + 1).padStart(2, '0')}`));
  link.append(meta, element('h3', 'card-title', item.name), element('p', 'card-description', item.description));
  const tags = element('div', 'card-tags');
  item.tags.slice(0, 3).forEach((tag) => tags.append(element('span', '', `# ${tag}`)));
  link.append(tags);
  article.append(link);
  return article;
}

function render() {
  const results = state.prompts.filter(matches);
  grid.replaceChildren(...results.map(card));
  grid.classList.toggle('single', results.length === 1);
  $('result-count').textContent = String(results.length).padStart(2, '0');
  $('result-message').textContent = `${results.length} 个风格${state.query || state.category || state.tag ? '符合当前筛选' : '已收录'}`;
  $('empty-state').hidden = results.length > 0;
  document.querySelectorAll('.tag-button').forEach((button) => {
    const active = button.dataset.tag === state.tag;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function setupFilters() {
  const categories = [...new Set(state.prompts.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    $('category-select').append(option);
  }
  const counts = new Map();
  state.prompts.forEach((item) => item.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
  const tags = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN')).slice(0, 9);
  tags.forEach(([tag]) => {
    const button = element('button', 'tag-button', `# ${tag}`);
    button.type = 'button';
    button.dataset.tag = tag;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => { state.tag = state.tag === tag ? '' : tag; render(); });
    $('tag-filters').append(button);
  });
  $('search-input').addEventListener('input', (event) => { state.query = event.target.value; render(); });
  $('category-select').addEventListener('change', (event) => { state.category = event.target.value; render(); });
  $('reset-filters').addEventListener('click', () => {
    state.query = state.category = state.tag = '';
    $('search-input').value = '';
    $('category-select').value = '';
    render();
    $('search-input').focus();
  });
}

function fillChips(container, values) {
  container.replaceChildren(...values.map((value) => element('span', '', value)));
}

function openPrompt(item) {
  $('detail-image').src = item.cover;
  $('detail-image').alt = item.coverType === 'illustration' ? `${item.name}风格示意图，并非真实生成效果` : `${item.name}示例图`;
  $('detail-cover-label').hidden = item.coverType !== 'illustration';
  $('detail-category').textContent = `${item.category} / ${item.subcategory || '风格'}`;
  $('detail-title').textContent = item.name;
  $('detail-description').textContent = item.description;
  fillChips($('detail-use-cases'), item.useCases);
  fillChips($('detail-tags'), item.tags);
  $('detail-version').textContent = `V${item.version} · ${item.createdAt}`;
  $('detail-prompt').textContent = item.prompt;
  $('detail-feedback').textContent = '';
  $('copy-button').dataset.promptId = item.id;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

function closePrompt() {
  if (dialog.open) dialog.close();
  const url = new URL(window.location.href);
  if (url.searchParams.has('prompt')) {
    url.searchParams.delete('prompt');
    history.replaceState({}, '', url);
  }
}

function syncRoute() {
  const id = new URL(window.location.href).searchParams.get('prompt');
  const item = state.prompts.find((entry) => entry.id === id);
  if (item) openPrompt(item);
  else if (dialog.open) dialog.close();
}

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value);
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const success = document.execCommand('copy');
  textarea.remove();
  if (!success) throw new Error('copy failed');
}

function setupDialog() {
  $('close-detail').addEventListener('click', closePrompt);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closePrompt(); });
  dialog.addEventListener('close', () => { if (new URL(window.location.href).searchParams.has('prompt')) closePrompt(); });
  $('copy-button').addEventListener('click', async () => {
    const item = state.prompts.find((entry) => entry.id === $('copy-button').dataset.promptId);
    if (!item) return;
    try { await copyText(item.prompt); $('detail-feedback').textContent = '完整提示词已复制。'; }
    catch { $('detail-feedback').textContent = '复制失败，请手动选择提示词文本复制。'; }
  });
  $('share-button').addEventListener('click', async () => {
    const item = state.prompts.find((entry) => entry.id === $('copy-button').dataset.promptId);
    if (!item) return;
    try { await copyText(promptUrl(item.id).toString()); $('detail-feedback').textContent = '分享链接已复制。'; }
    catch { $('detail-feedback').textContent = '复制失败，请从浏览器地址栏复制链接。'; }
  });
  window.addEventListener('popstate', syncRoute);
}

async function init() {
  setupDialog();
  try {
    const response = await fetch('data/prompts.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.schemaVersion !== 1 || !Array.isArray(data.prompts)) throw new Error('Unsupported data format');
    state.prompts = data.prompts;
    setupFilters();
    render();
    syncRoute();
  } catch (error) {
    console.error('无法加载提示词数据', error);
    $('result-message').textContent = '数据加载失败，请刷新页面重试。';
  }
}

init();
