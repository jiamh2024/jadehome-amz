document.addEventListener('DOMContentLoaded', async function() {
  // 配置常量
  const PAGE_SIZE = 10;
  const SUPPORTED_COUNTRIES = ['US', 'CA', 'UK', 'AE', 'SA'];
  const COUNTRY_NAMES = {
    US: '美国',
    CA: '加拿大', 
    UK: '英国',
    AE: '阿联酋',
    SA: '沙特'
  };
  
  let currentPage = 1;
  let allCampaigns = [];
  
  // 缓存DOM元素
  const elements = {
    filterForm: document.getElementById('filterForm'),
    countryFilter: document.getElementById('countryFilter'),
    resetBtn: document.getElementById('resetBtn'),
    tableBody: document.getElementById('campaignTableBody'),
    prevPageBtn: document.getElementById('prevPage'),
    nextPageBtn: document.getElementById('nextPage'),
    pageInfo: document.getElementById('pageInfo'),
    totalCampaignsEl: document.getElementById('totalCampaigns'),
    totalBudgetEl: document.getElementById('totalBudget'),
    budgetUsageEl: document.getElementById('budgetUsage'),
    avgCtrEl: document.getElementById('avgCtr'),
    countryStatsContainer: document.getElementById('countryStats')
  };

  // 初始化加载数据
  await loadAllCampaigns();

  // 事件监听
  elements.filterForm.addEventListener('change', handleFilterSubmit);
  elements.resetBtn.addEventListener('click', handleReset);
  elements.prevPageBtn.addEventListener('click', goToPrevPage);
  elements.nextPageBtn.addEventListener('click', goToNextPage);

  // 主数据加载函数
  async function loadAllCampaigns() {
    try {
      showLoadingState();
      
      // 1. 并行获取所有国家的广告活动
      const responses = await Promise.all(
        SUPPORTED_COUNTRIES.map(countryCode => 
          fetchCampaignsByCountry(countryCode)
      ));
      
      // 2. 合并数据并添加国家标识
      allCampaigns = responses.flatMap(res => 
        res.campaigns.map(c => ({
          ...c,
          countryCode: res.countryCode,
          countryName: COUNTRY_NAMES[res.countryCode]
        }))
      );
      
      // 3. 获取预算数据
      await loadCampaignBudgets(allCampaigns);
      
      // 4. 更新UI
      updateDashboard(allCampaigns);
      updateCountryStats(allCampaigns);
    } catch (error) {
      showErrorState(error);
    }
  }
  // 更新整个仪表板
  function updateDashboard(campaigns) {
    updateStats(campaigns);
    renderCampaignTable(campaigns);
    updatePagination();
  }


// 首先，我们需要一个辅助函数来按国家分组数据
function groupCampaignsByCountry(campaigns) {
  return campaigns.reduce((acc, campaign) => {
    const country = campaign.countryCode || 'Unknown';
    if (!acc[country]) {
      acc[country] = {
        campaigns: [],
        totalBudget: 0,
        totalSpend: 0
      };
    }
    acc[country].campaigns.push(campaign);
    acc[country].totalBudget += campaign.budget?.budget || 0;
    acc[country].totalSpend += campaign.budget.usagePercent*campaign.budget.budget;
    return acc;
  }, {});
}

  // 更新统计信息的函数
  function updateStats(campaigns) {
    const filteredCampaigns = filterCampaigns(campaigns);
    
    // 1. 更新总体统计信息
    // 总活动数
    elements.totalCampaignsEl.textContent = filteredCampaigns.length;
    
    // 计算总预算和总花费
    const { totalBudget, totalSpend, totalCtr } = filteredCampaigns.reduce(
      (acc, campaign) => {
        const budget = campaign.budget?.budget || 0;
        const spend = budget * (campaign.budget?.usagePercentage || 0) / 100;
        
        return {
          totalBudget: acc.totalBudget + budget,
          totalSpend: acc.totalSpend + spend,
          totalCtr: acc.totalCtr + (campaign.ctr || 0)
        };
      },
      { totalBudget: 0, totalSpend: 0, totalCtr: 0 }
    );
    
    // 更新总预算显示
    elements.totalBudgetEl.textContent = formatCurrency(totalBudget);
    
    // 计算并更新预算使用率
    const budgetUsage = totalBudget > 0 
      ? (totalSpend / totalBudget) * 100 
      : 0;
    elements.budgetUsageEl.textContent = `${budgetUsage.toFixed(2)}%`;
    
    // 计算并更新平均CTR
    const avgCtr = filteredCampaigns.length > 0
      ? totalCtr / filteredCampaigns.length
      : 0;
    elements.avgCtrEl.textContent = `${avgCtr.toFixed(2)}%`;
    
  }

  // 辅助函数：根据国家代码获取国家名称
  function getCountryName(countryCode) {
    const countryNames = {
      'US': '美国',
      'CA': '加拿大',
      'UK': '英国',
      'AE': '阿联酋',
      'SA': '沙特'
    };
    return countryNames[countryCode] || countryCode;
  }

  // 按国家获取广告活动
  async function fetchCampaignsByCountry(countryCode) {
    try {
      const response = await axios.get(`/api/adsapi/campaigns?country=${countryCode}`);
      return {
        countryCode,
        campaigns: response.data.campaigns || []
      };
    } catch (error) {
      console.error(`Failed to fetch ${countryCode} campaigns:`, error);
      return {
        countryCode,
        campaigns: [],
        error: error.message
      };
    }
  }

  // 批量获取预算数据
  async function loadCampaignBudgets(campaigns) {
    try {
      // 按国家分组处理
      const byCountry = _.groupBy(campaigns, 'countryCode');
      
      for (const [countryCode, countryCampaigns] of Object.entries(byCountry)) {
        const campaignIds = countryCampaigns.map(c => c.campaignId);
        
        const budgetResponse = await axios.post(`/api/adsapi/budget?country=${countryCode}`, {
          campaignIds: campaignIds
        });
        
        // 更新预算数据
        budgetResponse.data.success.forEach(budget => {
          const campaign = countryCampaigns.find(c => c.campaignId === budget.campaignId);
          if (campaign) {
            campaign.budget = {
              ...campaign.budget,
              usagePercentage: budget.budgetUsagePercent
            };
          }
        });
      }
    } catch (error) {
      console.error('Failed to load budgets:', error);
      // 设置默认预算数据
      campaigns.forEach(c => {
        c.budget = {
          ...(c.budget || {}),
          spend: c.budget?.spend || 0,
          usagePercentage: c.budget?.usagePercentage || 0
        };
      });
    }
  }

  // 更新国家统计
  function updateCountryStats(campaigns) {
    const statsByCountry = _.chain(campaigns)
      .groupBy('countryCode')
      .mapValues(countryCampaigns => {
        const totalBudget = _.sumBy(countryCampaigns, 'budget.budget') || 0;
        const totalSpend = _.sumBy(countryCampaigns, 'budget.spend') || 0;
        const usage = totalBudget > 0 ? (totalSpend / totalBudget * 100) : 0;
        
        return {
          count: countryCampaigns.length,
          totalBudget,
          usagePercentage: usage.toFixed(2)
        };
      })
      .value();
    
    // 更新每个国家的统计卡片
    SUPPORTED_COUNTRIES.forEach(countryCode => {
      const statEl = document.querySelector(`.country-stat[data-country="${countryCode}"]`);
      if (statEl) {
        const stats = statsByCountry[countryCode] || { count: 0, totalBudget: 0, usagePercentage: 0 };
        
        statEl.querySelector('.stat-content').innerHTML = `
          <p>活动数: <span class="stat-value">${stats.count}</span></p>
          <p>总预算: <span class="stat-value">$${stats.totalBudget.toFixed(2)}</span></p>
          <p>预算使用率: <span class="stat-value">${stats.usagePercentage}%</span></p>
        `;
      }
    });
  }

  /**
   * 更新分页信息
   * @param {Array} campaigns - 当前页的活动数据
   */
  function updatePagination(campaigns) {

    const filteredCampaigns = filterCampaigns(allCampaigns);
    const totalPages = Math.ceil(filteredCampaigns.length / PAGE_SIZE);
    const startItem = (currentPage - 1) * PAGE_SIZE + 1;
    const endItem = Math.min(currentPage * PAGE_SIZE, filteredCampaigns.length);
    
    elements.pageInfo.textContent = `显示 ${startItem}-${endItem} 条，共 ${filteredCampaigns.length} 条`;
    elements.prevPageBtn.disabled = currentPage === 1;
    elements.nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

  }
  
  // [其余函数保持不变，添加国家筛选逻辑]
  function filterCampaigns(campaigns) {
    const formData = new FormData(elements.filterForm);
    const countryFilter = formData.get('country');
    const statusFilter = formData.get('status');

    return campaigns.filter(campaign => {
      if (countryFilter && campaign.countryCode !== countryFilter) {
        return false;
      }
      // ...其他筛选条件
      if (statusFilter && campaign.state.toLowerCase() !== statusFilter) {
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

  function goToNextPage() {
    const filteredCampaigns = filterCampaigns(allCampaigns);
    const totalPages = Math.ceil(filteredCampaigns.length / PAGE_SIZE);
    
    if (currentPage < totalPages) {
      currentPage++;
      updateDashboard(allCampaigns);
    }
  }

  function goToPrevPage() {
    if (currentPage > 1) {
      currentPage--;
      updateDashboard(allCampaigns);
    }
  }

  /**
   * 渲染整个活动列表表格
   * @param {Array} campaigns - 活动数据数组
   */
  function renderCampaignTable(campaigns) {
    const filteredCampaigns = filterCampaigns(campaigns);
    const paginatedCampaigns = paginate(filteredCampaigns, currentPage, PAGE_SIZE);

    // 如果没有活动数据，显示加载提示或空状态
    if (paginatedCampaigns.length === 0) {
      elements.tableBody.innerHTML = `<tr><td colspan="7" class="no-data">没有找到匹配的广告活动</td></tr>`;
      return;
    }
    
    // 清空表格体
    elements.tableBody.innerHTML = '';

    elements.tableBody.innerHTML = paginatedCampaigns.map(campaign => `
      <tr>
        <td>${campaign.campaignId}</td>
        <td>${campaign.name}</td>
        <td><span class="country-badge ${campaign.countryCode}">${campaign.countryName}</span></td>
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
          <button class="btn-view" data-id="${campaign.campaignId}" data-country="${campaign.countryCode}">查看</button>
        </td>
      </tr>
    `).join('');

    
    // 更新分页信息（假设有一个updatePagination函数）
    updatePagination(filteredCampaigns);
    // 添加按钮事件
    addButtonEventListeners();
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

  // 分页逻辑
  function paginate(array, page, size) {
    return array.slice((page - 1) * size, page * size);
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
    return statusMap[status] || status;
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
  function getStatusText(status) {
    const statusMap = {
      'enabled': '启用中',
      'paused': '已暂停',
      'archived': '已归档'
    };
    return statusMap[status.toLowerCase()] || status;
  }

});