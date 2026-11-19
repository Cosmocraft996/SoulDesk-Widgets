const cards = document.querySelector('#widgets');
const status = document.querySelector('#catalog-status');
const labels = { 'storage.instance': '读取和保存当前实例的设置与存储' };

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function link(url, text, className) {
  const node = element('a', className, text);
  node.href = url;
  return node;
}

function downloadLink(item, className) {
  return link(item.downloadUrl, item.status === 'preview' ? '下载本地预览 ZIP' : '下载 ZIP', className);
}

function hostLabel(item) {
  return item.minHostVersion ? 'SoulDesk ' + item.minHostVersion + ' 及以上' : '本地预览版';
}

function versionRow(item) {
  const row = element('section', 'version');
  const header = element('div', 'version-header');
  header.append(element('h4', '', 'v' + item.version));
  if (item.status === 'withdrawn') header.append(element('span', 'compatibility', '已撤回'));
  else header.append(downloadLink(item));
  row.append(header, element('p', 'compatibility', hostLabel(item)),
    element('p', 'notes', item.releaseNotes),
    element('p', '', '权限 · ' + (item.capabilities.map(key => labels[key] ?? key).join('、') || '无需额外权限')),
    element('p', '', item.sizeBytes.toLocaleString('zh-CN') + ' 字节 · SHA-256'),
    element('code', '', item.sha256));
  return row;
}

function renderWidget(widget) {
  const card = element('article', 'card');
  card.id = widget.id;
  if (widget.screenshots.length) {
    const figure = element('div', 'picture');
    for (const path of widget.screenshots.slice(0, 1)) {
      const image = element('img');
      image.src = path;
      image.alt = widget.name + '组件截图';
      figure.append(image);
    }
    card.append(figure);
  }
  const body = element('div', 'card-body');
  const heading = element('div', 'card-heading');
  const title = element('h3');
  title.append(link('#' + widget.id, widget.name));
  heading.append(title, element('span', 'category', widget.category));
  body.append(heading, element('p', 'summary', widget.summary));
  const latest = widget.versions.find(item => ['published', 'preview'].includes(item.status));
  const primary = element('div', 'primary');
  if (latest) {
    primary.append(element('span', 'compatibility', 'v' + latest.version + ' · ' + hostLabel(latest)),
      downloadLink(latest, 'download'));
  } else {
    primary.append(element('p', 'compatibility', '所有版本均已撤回'));
  }
  body.append(primary);
  const details = element('details');
  details.append(element('summary', '', '版本、权限与校验'));
  for (const item of widget.versions) details.append(versionRow(item));
  if (widget.screenshots.length > 1) {
    const related = element('p', 'compatibility');
    widget.screenshots.forEach((path, i) => related.append(link(path, '截图 ' + (i + 1)), ' '));
    details.append(related);
  }
  body.append(details);
  card.append(body);
  return card;
}

function openLinkedWidget() {
  const card = document.getElementById(location.hash.slice(1));
  const details = card?.querySelector('details');
  if (!details) return;
  details.open = true;
  card.scrollIntoView();
}

async function load() {
  const response = await fetch('./catalog.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('目录下载失败');
  const data = await response.json();
  if (data.schemaVersion !== 1 || !Array.isArray(data.widgets)) throw new Error('目录格式错误');
  cards.replaceChildren(...data.widgets.map(renderWidget));
  status.textContent = data.widgets.length ? data.widgets.length + ' 个组件' : '暂无已发布组件';
  openLinkedWidget();
}

window.addEventListener('hashchange', openLinkedWidget);
load().catch(() => {
  status.textContent = '组件目录加载失败，请刷新页面重试。';
});
