// 个人书签主页 - 主逻辑脚本
// 数据驱动渲染，支持分类编辑和一键导出

// 全局错误处理
window.addEventListener('error', function(event) {
  console.error('🌐 全局JavaScript错误:', event.error);
});

// 确保DOMContentLoaded事件触发
console.log('📄 script.js已加载');

// ==================== 全局配置 ====================
const categoryDisplayNames = {
  'ai': 'AI工具',
  'video': '视频创作',
  'content': '内容平台',
  'tool': '实用工具',
  'download': '下载资源',
  'finance': '金融投资',
  'study': '学习知识',
  'music': '音乐娱乐',
  'youtube': 'Youtube素材',
  'government': '政务办公',
  'design': '设计素材',
  'shopping': '购物消费',
  'science': '自然科学',
  'audio': '乐器与音频',
  'local': '澳洲本地',
  'other': '其他'
};

// 分类对应的图标映射
const categoryIcons = {
  'ai': '🤖',
  'video': '🎬',
  'content': '📺',
  'tool': '🛠️',
  'download': '⬇️',
  'finance': '💹',
  'study': '📚',
  'music': '🎵',
  'youtube': '🎥',
  'government': '🏛️',
  'design': '🎨',
  'shopping': '🛍️',
  'science': '🧬',
  'audio': '🎸',
  'local': '🦘',
  'other': '📌'
};

// 所有分类列表
const allCategories = Object.keys(categoryDisplayNames);

// 当前数据存储（从links.json加载，用户编辑时更新）
let currentLinksData = [];

// ==================== 数据加载与渲染 ====================

// 从links.json加载数据
async function loadLinksData() {
  // 优先使用fetch API
  try {
    const response = await fetch('links.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    currentLinksData = data;
    return data;
  } catch (fetchError) {
    console.warn('Fetch API失败，尝试使用XMLHttpRequest:', fetchError);

    // 如果是file://协议，使用同步XMLHttpRequest作为回退
    if (window.location.protocol === 'file:') {
      try {
        const data = loadLocalFileSync('links.json');
        if (data) {
          currentLinksData = data;
          return data;
        }
      } catch (xhrError) {
        console.error('XMLHttpRequest也失败:', xhrError);
      }
    }

    console.error('加载links.json失败:', fetchError);
    alert('❌ 无法加载书签数据，请确保links.json文件存在\n\n💡 提示：如果直接在本地打开HTML文件，请使用HTTP服务器（如Python的 "python -m http.server"）');
    return [];
  }
}

// 同步加载本地文件（仅用于file://协议回退）
function loadLocalFileSync(filePath) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', filePath, false); // 同步请求
  xhr.send(null);

  if (xhr.status === 200 || xhr.status === 0) { // 0表示本地文件
    try {
      return JSON.parse(xhr.responseText);
    } catch (parseError) {
      throw new Error(`解析JSON失败: ${parseError.message}`);
    }
  } else {
    throw new Error(`XMLHttpRequest错误，状态码: ${xhr.status}`);
  }
}

// 渲染卡片到对应分类区域
function renderLinks(data) {
  // 1. 清空所有动态加载的区域（排除硬编码的youtube分类）
  document.querySelectorAll('.cards-grid').forEach(grid => {
    const section = grid.closest('.section');
    if (section && section.dataset.section !== 'youtube') {
      grid.innerHTML = '';
    }
  });

  // 2. 按分类分发卡片
  data.forEach(item => {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = item.url;
    card.target = "_blank";
    card.innerHTML = `
      <div class="card-ico">${item.ico || '🌐'}</div>
      <div class="card-info">
        <div class="card-name">${item.name}</div>
        <div class="card-domain">${item.domain || new URL(item.url).hostname}</div>
      </div>
      <span class="card-arrow">→</span>
    `;

    const targetSection = document.querySelector(`.cat-${item.category} .cards-grid`);
    if (targetSection) {
      targetSection.appendChild(card);
    }
  });

  // 3. 更新统计数字和UI
  updateCategoryCounts();
  addCategoryTagsToCards();
  setupCardCategoryEditing();
  setupSearch();
  setupSidebarFilter();
}

// ==================== 统计与UI更新 ====================

// 更新分类计数（包括侧边栏和标题）
function updateCategoryCounts() {
  // 更新每个分类的计数
  document.querySelectorAll('.section').forEach(sec => {
    const cat = sec.dataset.section;
    const count = sec.querySelectorAll('.card').length;
    const el = document.getElementById('count-' + cat);
    if (el) el.textContent = count;

    // 更新侧边栏计数
    const sidebarCountEl = document.getElementById('sidebar-count-' + cat);
    if (sidebarCountEl) sidebarCountEl.textContent = count;

    // 如果该分类没有卡片，则隐藏整个section（添加no-items类）
    sec.classList.toggle('no-items', count === 0);
  });

  // 更新总计数
  const total = document.querySelectorAll('.card').length;
  const totalCountEl = document.getElementById('totalCount');
  if (totalCountEl) totalCountEl.textContent = total;

  const sidebarAllCountEl = document.getElementById('sidebar-count-all');
  if (sidebarAllCountEl) sidebarAllCountEl.textContent = total;
}

// ==================== 卡片分类编辑功能 ====================

// 为卡片添加分类标签和下拉菜单
function addCategoryTagsToCards() {
  document.querySelectorAll('.card').forEach(card => {
    // 如果已经添加过标签，跳过
    if (card.querySelector('.card-category-tag')) return;

    // 查找父section分类
    const section = card.closest('.section');
    if (!section) return;
    const cat = section.dataset.section;
    const displayName = categoryDisplayNames[cat] || cat;

    // 创建标签元素
    const tag = document.createElement('div');
    tag.className = 'card-category-tag';
    tag.textContent = displayName;
    tag.dataset.category = cat;

    // 创建下拉菜单
    const dropdown = document.createElement('div');
    dropdown.className = 'card-category-dropdown';

    // 添加所有分类选项
    Object.entries(categoryDisplayNames).forEach(([id, name]) => {
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = name;
      link.dataset.category = id;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        moveCardToCategory(card, id);
        dropdown.classList.remove('show');
        card.classList.remove('show-dropdown');
      });
      dropdown.appendChild(link);
    });

    // 相对定位
    card.style.position = 'relative';
    card.appendChild(tag);
    card.appendChild(dropdown);
  });
}

// 设置卡片分类编辑事件
function setupCardCategoryEditing() {
  document.querySelectorAll('.card').forEach(card => {
    const tag = card.querySelector('.card-category-tag');
    const dropdown = card.querySelector('.card-category-dropdown');

    if (!tag || !dropdown) return;

    // 标签点击切换下拉菜单
    tag.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // 隐藏所有其他下拉菜单
      document.querySelectorAll('.card-category-dropdown.show').forEach(d => {
        if (d !== dropdown) {
          d.classList.remove('show');
          d.closest('.card')?.classList.remove('show-dropdown');
        }
      });

      const isShowing = dropdown.classList.toggle('show');
      card.classList.toggle('show-dropdown', isShowing);
    });
  });

  // 点击页面其他地方关闭下拉菜单
  document.addEventListener('click', () => {
    document.querySelectorAll('.card-category-dropdown.show').forEach(d => {
      d.classList.remove('show');
      d.closest('.card')?.classList.remove('show-dropdown');
    });
  });
}

// 将卡片移动到新分类
function moveCardToCategory(card, newCategory) {
  const section = card.closest('.section');
  if (!section) return;

  const oldCategory = section.dataset.section;
  if (oldCategory === newCategory) return;

  const newSection = document.querySelector(`.section[data-section="${newCategory}"]`);
  if (!newSection) return;

  const cardsGrid = newSection.querySelector('.cards-grid');
  if (!cardsGrid) return;

  // 移动DOM元素
  cardsGrid.appendChild(card);

  // 更新标签显示
  const tag = card.querySelector('.card-category-tag');
  if (tag) {
    tag.textContent = displayName;
    tag.dataset.category = newCategory;
  }

  // ✅ 更新卡片图标 (Fix Bug 1)
  const icoEl = card.querySelector('.card-ico');
  if (icoEl) {
    icoEl.textContent = categoryIcons[newCategory] || '🌐';
  }

  // 更新统计
  updateCategoryCounts();

  // 保存到localStorage（页面刷新后保持状态）
  const cardUrl = card.getAttribute('href');
  if (cardUrl) {
    saveCardCategoryToStorage(cardUrl, newCategory);
  }

  // 更新currentLinksData
  updateCardCategoryInData(cardUrl, newCategory);
}

// 保存分类到localStorage
function saveCardCategoryToStorage(cardUrl, category) {
  const savedCategories = JSON.parse(localStorage.getItem('cardCategories') || '{}');
  savedCategories[cardUrl] = category;
  localStorage.setItem('cardCategories', JSON.stringify(savedCategories));
}

// 从localStorage恢复分类
function restoreCardCategoriesFromStorage() {
  const savedCategories = JSON.parse(localStorage.getItem('cardCategories') || '{}');

  document.querySelectorAll('.card').forEach(card => {
    const cardUrl = card.getAttribute('href');
    if (cardUrl && savedCategories.hasOwnProperty(cardUrl)) {
      const category = savedCategories[cardUrl];
      const targetSection = document.querySelector(`.section[data-section="${category}"]`);
      if (targetSection) {
        const cardsGrid = targetSection.querySelector('.cards-grid');
        const currentCardsGrid = card.closest('.cards-grid');
        if (cardsGrid && currentCardsGrid && cardsGrid !== currentCardsGrid) {
          cardsGrid.appendChild(card);
        }
      }
    }
  });

  updateCategoryCounts();
}

// 更新currentLinksData中的卡片分类
function updateCardCategoryInData(cardUrl, newCategory) {
  const index = currentLinksData.findIndex(item => item.url === cardUrl);
  if (index !== -1) {
    currentLinksData[index].category = newCategory;
  }
}

// ==================== 搜索功能 ====================

function setupSearch() {
  const searchInput = document.getElementById('search');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
      // 清空搜索，恢复过滤状态
      document.querySelectorAll('.card').forEach(c => c.classList.remove('search-hidden'));
      const activeFilter = document.querySelector('.filter-btn.active')?.dataset.cat || 'all';
      document.querySelectorAll('.section').forEach(sec => {
        if (activeFilter === 'all' || sec.dataset.section === activeFilter) {
          sec.classList.remove('hidden');
        } else {
          sec.classList.add('hidden');
        }
      });
      return;
    }

    // 搜索时显示所有section
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('hidden'));

    // 根据搜索关键词显示/隐藏卡片
    document.querySelectorAll('.card').forEach(card => {
      const name = card.querySelector('.card-name')?.textContent.toLowerCase() || '';
      const domain = card.querySelector('.card-domain')?.textContent.toLowerCase() || '';
      const href = (card.getAttribute('href') || '').toLowerCase();

      if (name.includes(query) || domain.includes(query) || href.includes(query)) {
        card.classList.remove('search-hidden');
      } else {
        card.classList.add('search-hidden');
      }
    });

    // 隐藏没有可见卡片的section
    document.querySelectorAll('.section').forEach(sec => {
      const visible = [...sec.querySelectorAll('.card')].some(c => !c.classList.contains('search-hidden'));
      sec.classList.toggle('hidden', !visible);
    });
  });
}

// ==================== 侧边栏过滤 ====================

function setupSidebarFilter() {
  const sidebarCategories = document.querySelectorAll('.sidebar-category');
  const filterBtns = document.querySelectorAll('.filter-btn');

  // 侧边栏点击事件
  sidebarCategories.forEach(catEl => {
    catEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      sidebarCategories.forEach(c => c.classList.remove('active'));
      catEl.classList.add('active');
      const cat = catEl.dataset.cat;

      // 触发对应的filter按钮点击
      const correspondingBtn = document.querySelector(`.filter-btn[data-cat="${cat}"]`);
      if (correspondingBtn) correspondingBtn.click();
    });
  });

  // 原始filter按钮事件（隐藏的）
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;

      document.querySelectorAll('.section').forEach(sec => {
        if (cat === 'all' || sec.dataset.section === cat) {
          sec.classList.remove('hidden');
        } else {
          sec.classList.add('hidden');
        }
      });

      // 清空搜索
      document.getElementById('search').value = '';
      document.querySelectorAll('.card').forEach(c => c.classList.remove('search-hidden'));
    });
  });

  // 同步侧边栏和filter按钮的激活状态
  const activeFilterBtn = document.querySelector('.filter-btn.active');
  if (activeFilterBtn) {
    const activeCat = activeFilterBtn.dataset.cat;
    document.querySelectorAll('.sidebar-category').forEach(catEl => {
      catEl.classList.toggle('active', catEl.dataset.cat === activeCat);
    });
  }
}

// ==================== 导出功能 ====================

// 根据当前DOM状态生成新的JSON数据
function generateUpdatedJSON() {
  const updatedData = [];

  // 遍历所有分类section
  document.querySelectorAll('.section').forEach(section => {
    const category = section.dataset.section;

    // 遍历该分类下的所有卡片
    section.querySelectorAll('.card').forEach(card => {
      const url = card.getAttribute('href');
      const name = card.querySelector('.card-name')?.textContent || '';
      const domain = card.querySelector('.card-domain')?.textContent || '';
      const ico = card.querySelector('.card-ico')?.textContent || '📌';

      // 从currentLinksData中查找原始数据，保留其他字段
      const originalItem = currentLinksData.find(item => item.url === url);

      updatedData.push({
        category: category,
        name: name,
        url: url,
        domain: domain,
        ico: ico,
        // 保留其他字段（如果有）
        ...(originalItem ? {
          // 可以在这里保留其他字段，如description等
        } : {})
      });
    });
  });

  return updatedData;
}

// 导出JSON文件
function exportNewJSON() {
  const updatedData = generateUpdatedJSON();
  const dataStr = JSON.stringify(updatedData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "links_updated.json";
  a.click();

  // 释放资源
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

// ==================== 新增网址功能 ====================

// 初始化弹窗逻辑
function initModal() {
  const modal = document.getElementById('addModal');
  const addBtn = document.getElementById('addBtn');
  const closeBtns = document.querySelectorAll('.close-modal');
  const saveBtn = document.getElementById('saveBtn');
  const categorySelect = document.getElementById('newCategory');

  if (!modal || !addBtn) return;

  // 填充分类下拉菜单
  categorySelect.innerHTML = Object.entries(categoryDisplayNames)
    .map(([id, name]) => `<option value="${id}">${name}</option>`)
    .join('');

  // 打开弹窗
  addBtn.addEventListener('click', () => {
    modal.style.display = 'block';
    // 重置输入
    document.getElementById('newUrl').value = '';
    document.getElementById('newName').value = '';
  });

  // 关闭弹窗
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  });

  // 点击外部关闭
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  // 保存逻辑
  saveBtn.addEventListener('click', () => {
    const url = document.getElementById('newUrl').value.trim();
    const name = document.getElementById('newName').value.trim();
    const category = categorySelect.value;

    if (!url || !name) {
      alert('⚠️ 请填写完整的网址和名称');
      return;
    }

    try {
      // 检查URL合法性
      new URL(url);
    } catch (e) {
      alert('❌ 网址格式不正确，请包含 http:// 或 https://');
      return;
    }

    addNewLink(url, name, category);
    modal.style.display = 'none';

    // 自动导出新JSON
    setTimeout(() => {
      exportNewJSON();
      alert('✅ 网址已添加成功，并已自动导出 links_updated.json\n\n请手动替换原始文件以永久生效。');
    }, 500);
  });
}

// 添加新卡片到DOM和数据
function addNewLink(url, name, category) {
  const domain = new URL(url).hostname;
  const ico = categoryIcons[category] || '🌐';

  const newItem = {
    url,
    name,
    category,
    domain,
    ico
  };

  // 添加到当前数据
  currentLinksData.push(newItem);

  // 渲染新卡片
  const card = document.createElement('a');
  card.className = 'card';
  card.href = url;
  card.target = "_blank";
  card.innerHTML = `
    <div class="card-ico">${ico}</div>
    <div class="card-info">
      <div class="card-name">${name}</div>
      <div class="card-domain">${domain}</div>
    </div>
    <span class="card-arrow">→</span>
  `;

  const targetSection = document.querySelector(`.cat-${category} .cards-grid`);
  if (targetSection) {
    targetSection.appendChild(card);
    // 同时也移除no-items类
    targetSection.closest('.section').classList.remove('no-items');
  }

  // 刷新增强功能
  addCategoryTagsToCards();
  setupCardCategoryEditing();
  updateCategoryCounts();
}

// ==================== 子章节切换 ====================

function toggleSubsection(id) {
  const content = document.getElementById('content-' + id);
  const arrow = document.getElementById('arrow-' + id);
  if (content.style.display === 'none') {
    content.style.display = 'grid';
    arrow.textContent = '▼';
  } else {
    content.style.display = 'none';
    arrow.textContent = '▶';
  }
}

// ==================== 初始化 ====================

// 初始化不依赖数据的UI组件
function initUI() {
  console.log('🖥️ 初始化UI组件...');

  try {
    // 设置侧边栏过滤
    console.log('🔧 设置侧边栏过滤...');
    setupSidebarFilter();
    console.log('✅ 侧边栏过滤设置完成');

    // 设置搜索功能
    console.log('🔍 设置搜索功能...');
    setupSearch();
    console.log('✅ 搜索功能设置完成');

    // 设置导出按钮事件
    console.log('📤 设置导出按钮事件...');
    const exportBtn = document.querySelector('.export-fab');
    if (exportBtn) {
      console.log('找到导出按钮，绑定点击事件');
      // 先移除可能存在的监听器，防止重复
      exportBtn.removeEventListener('click', exportNewJSON);
      exportBtn.addEventListener('click', exportNewJSON);
      console.log('📤 导出按钮事件绑定完成');
    }

    // 初始化弹窗
    initModal();

    console.log('✅ UI组件初始化完成');
  } catch (error) {
    console.error('❌ UI组件初始化失败:', error);
    throw error; // 重新抛出，让init函数捕获
  }
}

async function init() {
  try {
    console.log('🚀 开始初始化个人书签主页...');

    // 初始化UI组件（不依赖数据）
    initUI();

    // 加载数据
    const data = await loadLinksData();
    console.log(`📊 加载 ${data.length} 条书签数据`);

    // 渲染卡片
    renderLinks(data);
    console.log('🎨 卡片渲染完成');

    // 从localStorage恢复分类
    restoreCardCategoriesFromStorage();
    console.log('💾 分类状态恢复完成');

    console.log('✅ 个人书签主页初始化完成');
  } catch (error) {
    console.error('初始化失败:', error);
    // 即使数据加载失败，UI组件也已初始化，用户可以交互
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// 全局导出函数（用于HTML内联调用）
window.toggleSubsection = toggleSubsection;
window.exportNewJSON = exportNewJSON;