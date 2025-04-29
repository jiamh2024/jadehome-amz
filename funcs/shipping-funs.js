// utils/shippingCalculator.js

/**
 * 计算体积重量（磅）
 * @param {number} length - 长度（英寸）
 * @param {number} width - 宽度（英寸）
 * @param {number} height - 高度（英寸）
 * @returns {number} 体积重量（磅）
 */
function calculateDimensionalWeight(length, width, height) {
    return (length * width * height) / 139;
  }
  
  /**
   * 产品分类
   * @returns {'smallStandard'|'largeStandard'|'largeBulky'}
   */
  function classifyProduct(length, width, height, weight) {
    // 小号标准
    if (weight < 1 && 
        length <= 15 && 
        width <= 12 && 
        height <= 0.75) {
      return 'smallStandard';
    }
    
    // 大号标准
    if (weight < 20 && 
        length <= 18 && 
        width <= 14 && 
        height <= 8) {
      return 'largeStandard';
    }
    
    // 大号大件
    return 'largeBulky';
  }
  
  /**
   * 小号标准运费计算
   */
  function calculateSmallStandardFee(weight) {
    const weightOz = weight * 16; // 转换为盎司
    
    if (weightOz <= 2) return 3.06;
    if (weightOz <= 4) return 3.15;
    if (weightOz <= 6) return 3.24;
    if (weightOz <= 8) return 3.33;
    if (weightOz <= 10) return 3.43;
    if (weightOz <= 12) return 3.53;
    if (weightOz <= 14) return 3.60;
    if (weightOz <= 16) return 3.65;
    
    // 超过16盎司的小号标准物品按大号标准计算
    return calculateLargeStandardFee(weight);
  }
  
  /**
   * 大号标准运费计算
   */
  function calculateLargeStandardFee(weight) {
    const weightOz = weight * 16; // 转换为盎司
    
    if (weightOz <= 4) return 3.68;
    if (weightOz <= 8) return 3.90;
    if (weightOz <= 12) return 4.15;
    if (weightOz <= 16) return 4.55;
    if (weight < 1.25) return 4.99;
    if (weight < 1.5) return 5.37;
    if (weight < 1.75) return 5.52;
    if (weight < 2) return 5.77;
    if (weight < 2.25) return 5.87;
    if (weight < 2.5) return 6.05;
    if (weight < 2.75) return 6.21;
    if (weight < 3) return 6.62;
    
    // 3磅以上的计算
    const baseFee = 6.92;
    const extraWeight = weight - 3; // 超出3磅的部分
    const extraFee = Math.ceil(extraWeight * 16 / 4) * 0.08; // 每4盎司0.08美元
    
    return baseFee + extraFee;
  }
  
  /**
   * 大号大件运费计算
   */
  function calculateLargeBulkyFee(weight) {
    const baseFee = 9.61;
    const extraWeight = Math.max(0, weight - 1); // 超出首磅的部分
    const extraFee = extraWeight * 0.38; // 每磅0.38美元
    
    return baseFee + extraFee;
  }
  
  /**
   * 计算美国物流配送费
   * @param {number} length - 长度（英寸）
   * @param {number} width - 宽度（英寸）
   * @param {number} height - 高度（英寸）
   * @param {number} weight - 重量（磅）
   * @returns {number} 配送费（美元）
   */
  function calculateUSShippingFee(length, width, height, weight) {
    // 1. 计算体积重量（磅）
    const dimensionalWeight = calculateDimensionalWeight(length, width, height);
    const billableWeight = Math.max(weight, dimensionalWeight);
    
    // 2. 产品分类
    const productType = classifyProduct(length, width, height, weight);
    
    // 3. 根据分类计算运费
    switch(productType) {
      case 'smallStandard':
        return calculateSmallStandardFee(weight); // 计算小号标准运费,不考虑体积重量
      case 'largeStandard':
        return calculateLargeStandardFee(billableWeight);
      case 'largeBulky':
        return calculateLargeBulkyFee(billableWeight);
      default:
        throw new Error('未知的产品分类');
    }
  }
  
  /**
   * 单位转换工具
   */
  const unitConverter = {
    // 长度转换
    convertLength(value, fromUnit, toUnit) {
      const conversions = {
        'cm': 1,
        'inch': 2.54,
        'm': 100,
        'foot': 30.48
      };
      return value * conversions[fromUnit] / conversions[toUnit];
    },
    
    // 重量转换
    convertWeight(value, fromUnit, toUnit) {
      const conversions = {
        'kg': 1,
        'lb': 0.453592,
        'g': 0.001,
        'oz': 0.0283495
      };
      return value * conversions[fromUnit] / conversions[toUnit];
    }
  };
  
  module.exports = {
    calculateUSShippingFee,
    unitConverter,
    // 导出内部方法用于测试
    _internal: {
      calculateDimensionalWeight,
      classifyProduct,
      calculateSmallStandardFee,
      calculateLargeStandardFee,
      calculateLargeBulkyFee
    }
  };