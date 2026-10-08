/* 校园公共信息与数据展示中心 · 迷你版 —— 交互与图表
   职责边界：原生 JavaScript 负责筛选逻辑与加载状态，ECharts 只负责画图。
   数据来源：data/data.json（自习室查询与使用统计共用这一份数据，保证两个模块对得上）。 */

const state = {
  data: null,        // data.json 的内容
  floor: '全部',      // 楼层筛选条件
  status: '全部',     // 开放状态筛选条件
  empty: false       // 数据合法但没有任何记录
};

const els = {
  status: document.querySelector('#status'),
  filters: document.querySelector('#study-filters'),
  list: document.querySelector('#study-list'),
  source: document.querySelector('#data-source'),
  chart: document.querySelector('#usage-chart')
};

let barChart = null;   // 图表实例：同一容器只 init 一次，避免叠影

/* ---------- 加载状态提示：加载中 / 空数据 / 加载失败 ---------- */
const setStatus = (message, type) => {
  els.status.textContent = message;
  els.status.className = 'alert alert-' + type;
  els.status.hidden = false;
};

const clearStatus = () => {
  els.status.hidden = true;
};

/* ---------- 筛选：楼层 + 开放状态 ---------- */
const visibleRooms = () => {
  if (state.data === null) {
    return [];
  }
  return state.data.rooms.filter(room =>
    (state.floor === '全部' || room.floor === state.floor) &&
    (state.status === '全部' || (state.status === '开放中') === room.open)
  );
};

const emptyItem = (text) => {
  const li = document.createElement('li');
  li.className = 'list-group-item text-muted';
  li.textContent = text;
  return li;
};

/* ---------- 渲染自习室列表（渲染前先清空，避免残留上一次的筛选结果） ---------- */
const renderList = () => {
  els.list.innerHTML = '';

  if (state.data === null) {
    els.list.appendChild(emptyItem('数据未加载，请查看上方提示。'));
    return;
  }

  const rooms = visibleRooms();
  if (rooms.length === 0) {
    els.list.appendChild(emptyItem(state.empty ? '暂无自习室数据。' : '没有符合条件的自习室。'));
    return;
  }

  rooms.forEach(room => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center gap-3 flex-wrap';

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'fw-semibold';
    name.textContent = room.name;
    const meta = document.createElement('div');
    meta.className = 'text-muted small';
    meta.textContent = room.floor + ' · ' + room.seats + ' 个座位 · 累计 ' + room.usage + ' 人次';
    info.append(name, meta);

    // 开放状态用文字标注，不只用颜色区分
    const badge = document.createElement('span');
    badge.className = room.open ? 'badge text-bg-success' : 'badge text-bg-secondary';
    badge.textContent = room.open ? '开放中' : '已关闭';

    li.append(info, badge);
    els.list.appendChild(li);
  });
};

/* ---------- 筛选按钮：事件委托，同一组内只保留一个高亮 ---------- */
els.filters.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]');
  if (button === null) {
    return;
  }

  const group = button.dataset.group;
  if (group === 'floor') {
    state.floor = button.dataset.filter;
  } else {
    state.status = button.dataset.filter;
  }

  els.filters.querySelectorAll('button[data-group="' + group + '"]').forEach(item => {
    const isCurrent = item === button;
    item.classList.toggle('active', isCurrent);
    // 选中状态不只靠颜色：同步 aria-pressed，读屏软件与键盘用户都能感知
    item.setAttribute('aria-pressed', String(isCurrent));
  });

  renderList();
});

/* ---------- 柱状图：标题、单位与数据来源都写在图上 ---------- */
const renderChart = (data) => {
  if (typeof echarts === 'undefined') {
    els.chart.textContent = '图表库未加载：请确认 libs/echarts.min.js 存在。';
    return;
  }

  if (barChart === null) {
    barChart = echarts.init(els.chart);
  }

  barChart.setOption({
    baseOption: {
      title: {
        text: '各自习室使用量',
        subtext: '数据来源：' + data.source + '（' + data.period + '）',
        left: 'center'
      },
      tooltip: { trigger: 'axis' },
      grid: { left: 70, right: 30, top: 90, bottom: 90 },
      xAxis: {
        type: 'category',
        data: data.rooms.map(room => room.name),
        axisLabel: { interval: 0, rotate: 30 }
      },
      yAxis: {
        type: 'value',
        name: '单位：' + data.unit
      },
      series: [{
        name: '使用量',
        type: 'bar',
        barMaxWidth: 48,
        data: data.rooms.map(room => room.usage)
      }]
    },
    // 窄屏（手机）下标签更斜、字号更小，避免八个自习室名称挤在一起
    media: [{
      query: { maxWidth: 600 },
      option: {
        title: { textStyle: { fontSize: 14 }, subtextStyle: { fontSize: 10 } },
        grid: { left: 50, right: 16, top: 110, bottom: 150 },
        xAxis: { axisLabel: { interval: 0, rotate: 55, fontSize: 10 } }
      }
    }]
  });
};

/* ---------- 加载数据 ---------- */
const loadData = async () => {
  setStatus('数据加载中…', 'warning');
  els.list.innerHTML = '';
  els.list.appendChild(emptyItem('数据加载中…'));

  try {
    const response = await fetch('data/data.json');
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const data = await response.json();

    if (!Array.isArray(data.rooms) || data.rooms.length === 0) {
      state.data = data;      // 数据文件本身是合法的，只是没有记录
      state.empty = true;
      setStatus('暂无数据：data/data.json 中没有自习室记录。', 'warning');
      els.chart.textContent = '暂无数据，无法绘制图表。';   // 图表区域也要有提示，不能是一片空白
      renderList();
      return;
    }

    state.data = data;
    clearStatus();
    els.source.textContent = '数据来源：' + data.source + '（' + data.period + '）';
    els.source.hidden = false;
    renderList();
    renderChart(data);
  } catch (error) {
    // 断网、文件缺失、JSON 格式错误都会走到这里：给明确提示，而不是白屏
    setStatus('数据加载失败：' + error.message + '。请确认 data/data.json 存在、本地服务器已启动；直接双击 index.html 时浏览器的安全策略会拦截 fetch。', 'danger');
    els.chart.textContent = '数据未加载，暂无图表。';
    renderList();
  }
};

/* ---------- 窗口自适应：图表跟着容器变化 ---------- */
window.addEventListener('resize', () => {
  if (barChart !== null) {
    barChart.resize();
  }
});

loadData();
