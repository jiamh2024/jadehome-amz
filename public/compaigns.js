document.addEventListener('DOMContentLoaded', async function() {
  // 配置常量
  const PAGE_SIZE = 10;
  let currentPage = 1;
  let allCampaigns = [];
  
  // 缓存DOM元素
  const elements = {
    filterForm: document.getElementById('filterForm'),
    resetBtn: document.getElementById('resetBtn'),
    tableBody: document.getElementById('campaignTableBody'),
    prevPageBtn: document.getElementById('prevPage'),
    nextPageBtn: document.getElementById('nextPage'),
    pageInfo: document.getElementById('pageInfo'),
    totalCampaignsEl: document.getElementById('totalCampaigns'),
    totalBudgetEl: document.getElementById('totalBudget'),
    budgetUsageEl: document.getElementById('budgetUsage'),
    avgCtrEl: document.getElementById('avgCtr')
  };

  // 初始化加载数据
  await loadCampaigns();

  // 事件监听
  elements.filterForm.addEventListener('submit', handleFilterSubmit);
  elements.resetBtn.addEventListener('click', handleReset);
  elements.prevPageBtn.addEventListener('click', goToPrevPage);
  elements.nextPageBtn.addEventListener('click', goToNextPage);

  // 主数据加载函数
  async function loadCampaigns() {
    try {
      showLoadingState();
      
      const response = await axios.get('/api/adsapi/campaigns');
      allCampaigns = response.data.campaigns || [];

      //批量获取预算使用情况
      await loadCampaignBudgets(allCampaigns);
      
      updateDashboard(allCampaigns);
    } catch (error) {
      showErrorState(error);
    }
  }

  // 批量获取campaign预算使用情况
  async function loadCampaignBudgets(campaigns) {
    try {
      const BATCH_SIZE = 50; // 每批次请求的campaign数量
      // 分割campaign列表为批次（避免一次性请求太多）
      for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
        const batch = campaigns.slice(i, i + BATCH_SIZE);
        const campaignIds = batch.map(c => c.campaignId);

        // 调用预算API
        const budgetResponse = await axios.post('/api/adsapi/budget', {
          campaignIds: campaignIds
        });
        
        // 更新campaign对象的预算数据
        budgetResponse.data.success.forEach(budgetInfo => {
          const campaign = campaigns.find(c => c.campaignId === budgetInfo.campaignId);
          if (campaign) {
            campaign.budget = campaign.budget || {};
            campaign.budget.spend = budgetInfo.spend;
            campaign.budget.usagePercentage = budgetInfo.usagePercentage;
          }
        });
      }
    } catch (error) {
      console.error('获取预算数据失败:', error);
      // 即使预算获取失败，仍然显示基本信息
      campaigns.forEach(campaign => {
        campaign.budget = campaign.budget || {};
        campaign.budget.spend = campaign.budget.spend || 0;
        campaign.budget.usagePercentage = campaign.budget.usagePercentage || 0;
      });
    }
  }

  // 更新整个仪表板
  function updateDashboard(campaigns) {
    updateStats(campaigns);
    renderCampaigns(campaigns);
    updatePagination();
  }

  // 更新统计信息
  function updateStats(campaigns) {
    const filteredCampaigns = filterCampaigns(campaigns);
    
    elements.totalCampaignsEl.textContent = filteredCampaigns.length;
    
    // 计算总预算
    const totalBudget = filteredCampaigns.reduce((sum, campaign) => {
      return sum + (campaign.budget?.budget || 0);
    }, 0);
    elements.totalBudgetEl.textContent = formatCurrency(totalBudget);
    
    // 计算预算使用率（假设API返回了spend数据）
    //const totalSpend = filteredCampaigns.reduce((sum, campaign) => {
    //  return sum + (campaign.budget?.spend || 0);
    //}, 0);
    //const budgetUsage = totalBudget > 0 ? (totalSpend / totalBudget * 100) : 0;
    //elements.budgetUsageEl.textContent = `${budgetUsage.toFixed(2)}%`;
    
    // 计算平均CTR
    const avgCtr = filteredCampaigns.length > 0 
      ? filteredCampaigns.reduce((sum, campaign) => sum + (campaign.ctr || 0), 0) / filteredCampaigns.length
      : 0;
    elements.avgCtrEl.textContent = `${avgCtr.toFixed(2)}%`;
  }

  // 渲染广告活动表格
  function renderCampaigns(campaigns) {
    const filteredCampaigns = filterCampaigns(campaigns);
    const paginatedCampaigns = paginate(filteredCampaigns, currentPage, PAGE_SIZE);
    
    if (paginatedCampaigns.length === 0) {
      elements.tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="no-data">没有找到匹配的广告活动</td>
        </tr>
      `;
      return;
    }
    
    elements.tableBody.innerHTML = paginatedCampaigns.map(campaign => `
      <tr>
        <td>${campaign.campaignId}</td>
        <td>${campaign.name}</td>
        <td class="status-${campaign.state.toLowerCase()}">${getStatusText(campaign.state)}</td>
        <td>${formatCurrency(campaign.budget?.budget)}</td>
        <td>${formatDate(campaign.startDate)}</td>
        <td>
          <div class="budget-usage-container">
            <div class="budget-usage-bar" 
                 style="width: ${campaign.budget?.usagePercentage || 0}%"
                 title="已花费: ${formatCurrency(campaign.budget?.spend)} / 总预算: ${formatCurrency(campaign.budget?.budget)}">
            </div>
            <span class="budget-usage-text">${campaign.budget?.usagePercentage || 0}%</span>
          </div>
        </td>
        <td>
          <button class="btn-view" data-id="${campaign.campaignId}">查看</button>
        </td>
      </tr>
    `).join('');
    
    // 添加按钮事件
    addButtonEventListeners();
  }

  // 分页逻辑
  function paginate(array, page, size) {
    return array.slice((page - 1) * size, page * size);
  }

  // 更新分页信息
  function updatePagination() {
    const filteredCampaigns = filterCampaigns(allCampaigns);
    const totalPages = Math.ceil(filteredCampaigns.length / PAGE_SIZE);
    const startItem = (currentPage - 1) * PAGE_SIZE + 1;
    const endItem = Math.min(currentPage * PAGE_SIZE, filteredCampaigns.length);
    
    elements.pageInfo.textContent = `显示 ${startItem}-${endItem} 条，共 ${filteredCampaigns.length} 条`;
    elements.prevPageBtn.disabled = currentPage === 1;
    elements.nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
  }

  // 筛选逻辑
  function filterCampaigns(campaigns) {
    const formData = new FormData(elements.filterForm);
    const statusFilter = formData.get('status');
    const nameFilter = formData.get('name')?.toLowerCase();
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');
    
    return campaigns.filter(campaign => {
      // 状态筛选
      if (statusFilter && campaign.state.toLowerCase() !== statusFilter) {
        return false;
      }
      
      // 名称筛选
      if (nameFilter && !campaign.name.toLowerCase().includes(nameFilter)) {
        return false;
      }
      
      // 日期筛选
      if (startDate && new Date(campaign.startDate) < new Date(startDate)) {
        return false;
      }
      
      if (endDate && new Date(campaign.endDate || '9999-12-31') > new Date(endDate)) {
        return false;
      }
      
      return true;
    });
  }

  // 事件处理函数
  function handleFilterSubmit(e) {
    e.preventDefault();
    currentPage = 1;
    updateDashboard(allCampaigns);
  }

  function handleReset() {
    elements.filterForm.reset();
    currentPage = 1;
    updateDashboard(allCampaigns);
  }

  function goToPrevPage() {
    if (currentPage > 1) {
      currentPage--;
      updateDashboard(allCampaigns);
    }
  }

  function goToNextPage() {
    const filteredCampaigns = filterCampaigns(allCampaigns);
    const totalPages = Math.ceil(filteredCampaigns.length / PAGE_SIZE);
    
    if (currentPage < totalPages) {
      currentPage++;
      updateDashboard(allCampaigns);
    }
  }

  // 辅助函数
  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-CN');
  }

  function formatCurrency(amount) {
    return amount ? `$${parseFloat(amount).toFixed(2)}` : '$0.00';
  }

  function calculateBudgetUsage(campaign) {
    if (!campaign.budget?.budget || campaign.budget.budget === 0) return 0;
    const spend = campaign.budget.spend || 0;
    return Math.min(Math.round((spend / campaign.budget.budget) * 100), 100);
  }

  function getStatusText(status) {
    const statusMap = {
      'enabled': '启用中',
      'paused': '已暂停',
      'archived': '已归档'
    };
    return statusMap[status.toLowerCase()] || status;
  }

  function showLoadingState() {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="loading-state">
          <div class="spinner"></div>
          正在加载数据...
        </td>
      </tr>
    `;
  }

  function showErrorState(error) {
    console.error('加载广告活动失败:', error);
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="error-state">
          <i class="error-icon">⚠️</i>
          加载数据失败，请稍后重试
          <button class="btn-retry" onclick="window.location.reload()">重试</button>
        </td>
      </tr>
    `;
  }

  function addButtonEventListeners() {
    // 查看按钮
    document.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', function() {
        const campaignId = this.getAttribute('data-id');
        viewCampaignDetails(campaignId);
      });
    });
    
    // 编辑按钮
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', function() {
        const campaignId = this.getAttribute('data-id');
        editCampaign(campaignId);
      });
    });
  }

  // 查看详情
  function viewCampaignDetails(campaignId) {
    // 实际项目中可以打开模态框或跳转详情页
    console.log('查看广告活动:', campaignId);
    window.location.href = `/campaigns/${campaignId}`;
  }

  // 编辑活动
  function editCampaign(campaignId) {
    console.log('编辑广告活动:', campaignId);
    window.location.href = `/campaigns/${campaignId}/edit`;
  }
});