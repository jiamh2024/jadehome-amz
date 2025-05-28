document.addEventListener('DOMContentLoaded', async function() {
  // 初始化变量
  let currentPage = 1;
  const pageSize = 10;
  let allCampaigns = [];
  
  // DOM元素
  const filterForm = document.getElementById('filterForm');
  const resetBtn = document.getElementById('resetBtn');
  const tableBody = document.getElementById('campaignTableBody');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');
  const totalCampaignsEl = document.getElementById('totalCampaigns');
  const totalBudgetEl = document.getElementById('totalBudget');
  const avgCtrEl = document.getElementById('avgCtr');

  // 加载广告活动数据
  async function loadCampaigns() {
    try {
      tableBody.innerHTML = '<tr><td colspan="7">正在加载数据...</td></tr>';
      
      const response = await axios.get('/api/adsapi/campaigns', );
      allCampaigns = response.data.campaigns;
      
      updateStats(allCampaigns);
      renderCampaigns(allCampaigns);
      updatePagination();
    } catch (error) {
      console.error('加载广告活动失败:', error);
      tableBody.innerHTML = '<tr><td colspan="7" class="error">加载数据失败，请稍后重试</td></tr>';
    }
  }

  // 更新统计信息
  function updateStats(campaigns) {
    totalCampaignsEl.textContent = campaigns.length;
    
    const totalBudget = campaigns.reduce((sum, campaign) => {
      return sum + (campaign.budget.budget || 0);
    }, 0);
    totalBudgetEl.textContent = `$${totalBudget.toFixed(2)}`;
    
    const avgCtr = campaigns.length > 0 
      ? campaigns.reduce((sum, campaign) => sum + (campaign.ctr || 0), 0) / campaigns.length
      : 0;
    avgCtrEl.textContent = `${avgCtr.toFixed(2)}%`;
  }

  // 渲染广告活动表格
  function renderCampaigns(campaigns) {
    const filteredCampaigns = filterCampaigns(campaigns);
    const paginatedCampaigns = paginate(filteredCampaigns, currentPage, pageSize);
    
    if (paginatedCampaigns.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7">没有找到匹配的广告活动</td></tr>';
      return;
    }
    
    tableBody.innerHTML = '';
    
    paginatedCampaigns.forEach(campaign => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${campaign.campaignId}</td>
        <td>${campaign.name}</td>
        <td class="status-${campaign.state.toLowerCase()}">${getStatusText(campaign.state)}</td>
        <td>$${(campaign.budget.budget || 0).toFixed(2)}</td>
        <td>${formatDate(campaign.startDate)}</td>
        <td>${formatDate(campaign.endDate) || '-'}</td>
        <td>
          <button class="btn-view" data-id="${campaign.campaignId}">查看</button>
        </td>
      `;
      
      tableBody.appendChild(row);
    });
    
    // 添加查看按钮事件
    document.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', function() {
        const campaignId = this.getAttribute('data-id');
        viewCampaignDetails(campaignId);
      });
    });
  }

  // 筛选广告活动
  function filterCampaigns(campaigns) {
    const formData = new FormData(filterForm);
    const statusFilter = formData.get('status');
    const nameFilter = formData.get('name')?.toLowerCase();
    
    return campaigns.filter(campaign => {
      // 状态筛选
      if (statusFilter && campaign.state.toLowerCase() !== statusFilter) {
        return false;
      }
      
      // 名称筛选
      if (nameFilter && !campaign.name.toLowerCase().includes(nameFilter)) {
        return false;
      }
      
      return true;
    });
  }

  // 分页
  function paginate(array, page, size) {
    return array.slice((page - 1) * size, page * size);
  }

  // 更新分页信息
  function updatePagination() {
    const filteredCampaigns = filterCampaigns(allCampaigns);
    const totalPages = Math.ceil(filteredCampaigns.length / pageSize);
    
    pageInfo.textContent = `第 ${currentPage} 页 / 共 ${totalPages} 页`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
  }

  // 辅助函数
  function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  }

  function getStatusText(status) {
    const statusMap = {
      'enabled': '启用中',
      'paused': '已暂停',
      'archived': '已归档'
    };
    return statusMap[status.toLowerCase()] || status;
  }

  function viewCampaignDetails(campaignId) {
    // 这里可以跳转到详情页或显示模态框
    console.log('查看广告活动:', campaignId);
    alert(`查看广告活动 ${campaignId} 的详细信息`);
  }

  // 事件监听
  filterForm.addEventListener('submit', function(e) {
    e.preventDefault();
    currentPage = 1;
    renderCampaigns(allCampaigns);
    updatePagination();
  });

  resetBtn.addEventListener('click', function() {
    filterForm.reset();
    currentPage = 1;
    renderCampaigns(allCampaigns);
    updatePagination();
  });

  prevPageBtn.addEventListener('click', function() {
    if (currentPage > 1) {
      currentPage--;
      renderCampaigns(allCampaigns);
      updatePagination();
    }
  });

  nextPageBtn.addEventListener('click', function() {
    const filteredCampaigns = filterCampaigns(allCampaigns);
    const totalPages = Math.ceil(filteredCampaigns.length / pageSize);
    
    if (currentPage < totalPages) {
      currentPage++;
      renderCampaigns(allCampaigns);
      updatePagination();
    }
  });

  // 初始化加载数据
  await loadCampaigns();
});