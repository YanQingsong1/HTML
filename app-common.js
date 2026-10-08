/* ============================================================
   共享交互逻辑：登录门禁 / 卡片渲染 / 通用操作
   依赖 theme.css
   ============================================================ */

/* ---------- 登录鉴权 ---------- */
/* 说明：纯前端门禁，仅防止他人随手打开页面即查看；
   真正的安全控制需要服务端鉴权配合 */
const AUTH = {
    username: 'admin',
    password: 'yslxm',
    storageKey: 'axure_share_auth',
    rememberDays: 7
};

function readAuth() {
    try {
        return JSON.parse(sessionStorage.getItem(AUTH.storageKey) || localStorage.getItem(AUTH.storageKey));
    } catch {
        return null;
    }
}

function clearAuth() {
    localStorage.removeItem(AUTH.storageKey);
    sessionStorage.removeItem(AUTH.storageKey);
}

function isLoggedIn() {
    const record = readAuth();
    if (!record || record.ok !== true) return false;
    if (record.expire && Date.now() > record.expire) {
        clearAuth();
        return false;
    }
    return true;
}

function logout() {
    clearAuth();
    location.reload();
}

/* 登录成功后才执行回调，避免未登录就发起请求 */
function requireLogin(onSuccess) {
    const overlay = document.getElementById('login-overlay');
    const errorBox = document.getElementById('login-error');
    const passwordInput = document.getElementById('login-password');

    if (isLoggedIn()) {
        unlock(overlay);
        onSuccess();
        return;
    }

    overlay.classList.remove('hidden');

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = passwordInput.value;

        if (username !== AUTH.username || password !== AUTH.password) {
            errorBox.textContent = '账号或密码错误，请重试';
            passwordInput.value = '';
            passwordInput.focus();
            return;
        }

        errorBox.textContent = '';
        const remember = document.getElementById('login-remember').checked;
        const record = {
            ok: true,
            expire: Date.now() + AUTH.rememberDays * 24 * 60 * 60 * 1000
        };
        (remember ? localStorage : sessionStorage).setItem(AUTH.storageKey, JSON.stringify(record));
        unlock(overlay);
        onSuccess();
    });
}

function unlock(overlay) {
    overlay.classList.add('hidden');
    document.body.classList.remove('is-locked');
}

/* ---------- 通用操作 ---------- */
async function copyText(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const temp = document.createElement('textarea');
            temp.value = text;
            temp.style.position = 'fixed';
            temp.style.opacity = '0';
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            temp.remove();
        }
        showToast('链接已复制到剪贴板');
    } catch {
        showToast('复制失败，请手动复制');
    }
}

function copyUrl(elementId) {
    const input = document.getElementById(elementId);
    copyText(input.value);
}

function openProjectUrl(url) {
    window.open(url, '_blank');
}

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

/* ---------- 项目卡片渲染 ---------- */
function renderProjects(projects, emptyMessage) {
    const container = document.getElementById('projects-container');
    const loading = document.getElementById('loading');

    if (!projects.length) {
        loading.classList.remove('hidden');
        loading.innerHTML =
            `<div class="title-s">${emptyMessage || '没有找到项目'}</div>` +
            '<p class="caption">请确认项目目录内存在 index.html，或重新运行 axureyun.bat 生成项目清单。</p>';
        return;
    }

    loading.classList.add('hidden');
    container.innerHTML = projects.map((project, index) => `
        <article class="card project-card animate-in delay-${(index % 6) + 1}">
            <div class="project-head">
                <div class="icon-tile icon-tile-blue">📁</div>
                <div class="project-meta">
                    <h3 class="title-s">${escapeHtml(project.name)}</h3>
                    <p class="caption">${escapeHtml(project.subtitle || '静态原型 · index.html')}</p>
                </div>
            </div>
            <input class="field" id="url-${index}" value="${escapeHtml(project.url)}" readonly>
            <div class="actions">
                <button class="btn btn-primary btn-sm" onclick="openProjectUrl('${escapeHtml(project.url)}')">打开链接</button>
                <button class="btn btn-secondary btn-sm" onclick="copyUrl('url-${index}')">复制链接</button>
            </div>
        </article>
    `).join('');
}

function setStats(count) {
    const target = document.getElementById('stat-count');
    if (target) target.textContent = count;
}

function showError(message) {
    const loading = document.getElementById('loading');
    const box = document.getElementById('error-message');
    loading.classList.add('hidden');
    box.classList.remove('hidden');
    box.innerHTML = `<div class="title-s">加载失败</div><p class="caption">${escapeHtml(message)}</p>`;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}
