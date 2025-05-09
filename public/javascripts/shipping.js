// utils/shippingCalculator.js

/**
 * 计算体积重量（英寸--磅）
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
 * 计算加拿大亚马逊物流配送费
 * @param {number} length 长度（厘米）
 * @param {number} width 宽度（厘米）
 * @param {number} height 高度（厘米）
 * @param {number} weight 实际重量（千克）
 * @returns {number} 配送费用（加元）
 */
function calculateCanadaShippingFee(length, width, height, weight) {
  // 1. 计算体积重量（克）
  const dimensionalWeight = (length * width * height) / 5000;
  const weightGrams = weight * 1000; // 转换为克
  // 取实际重量和体积重量中的较大者作为计费重量
  const billedWeight = Math.max(weightGrams, dimensionalWeight);
  
  // 2. 对产品进行分类
  let sizeCategory;
  if (billedWeight <= 500 && length <= 38 && width <= 27 && height <= 2) {
      sizeCategory = 'envelope'; // 信封
  } else if (billedWeight <= 9000 && length <= 45 && width <= 35 && height <= 20) {
      sizeCategory = 'standard'; // 标准尺寸
  } else {
      sizeCategory = 'oversize'; // 大件
  }
  
  // 3. 根据分类计算运费
  switch (sizeCategory) {
      case 'envelope':
          return calculateEnvelopeFee(billedWeight);
      case 'standard':
          return calculateStandardFee(billedWeight);
      case 'oversize':
          return calculateOversizeFee(billedWeight);
      default:
          return 0;
  }
}

/**
* 计算信封类包裹运费
* @param {number} weight 计费重量（克）
* @returns {number} 运费（加元）
*/
function calculateEnvelopeFee(weight) {
  if (weight <= 100) return 4.46;
  if (weight <= 200) return 4.71;
  if (weight <= 300) return 5.01;
  if (weight <= 400) return 5.28;
  if (weight <= 500) return 5.62;
  
  // 如果超过500克，理论上信封类不会出现这种情况
  return 5.62;
}

/**
* 计算标准尺寸包裹运费
* @param {number} weight 计费重量（克）
* @returns {number} 运费（加元）
*/
function calculateStandardFee(weight) {
  if (weight <= 100) return 5.92;
  if (weight <= 200) return 6.12;
  if (weight <= 300) return 6.36;
  if (weight <= 400) return 6.73;
  if (weight <= 500) return 7.23;
  if (weight <= 600) return 7.40;
  if (weight <= 700) return 7.71;
  if (weight <= 800) return 7.95;
  if (weight <= 900) return 8.25;
  if (weight <= 1000) return 8.49;
  if (weight <= 1100) return 8.58;
  if (weight <= 1200) return 8.84;
  if (weight <= 1300) return 9.04;
  if (weight <= 1400) return 9.29;
  if (weight <= 1500) return 9.60;
  
  // 1500克以上部分
  const additionalWeight = weight - 1500;
  const additional100Grams = Math.ceil(additionalWeight / 100); // 每100克为一个单位，向上取整
  return 10.32 + additional100Grams * 0.09;
}

/**
* 计算大件包裹运费
* @param {number} weight 计费重量（克）
* @returns {number} 运费（加元）
*/
function calculateOversizeFee(weight) {
  if (weight <= 500) return 15.43;
  
  const additionalWeight = weight - 500;
  const additional500Grams = Math.ceil(additionalWeight / 500); // 每500克为一个单位，向上取整
  return 15.43 + additional500Grams * 0.46;
}


/**
 * 计算UK亚马逊物流配送费
 * @param {number} length 长度（厘米）
 * @param {number} width 宽度（厘米）
 * @param {number} height 高度（厘米）
 * @param {number} weight 实际重量（千克）
 * @returns {number} 配送费用（英镑）
 */
function calculateUKShippingFee(length, width, height, weight) {
  // 1. 计算体积重量（千克）
  const dimensionalWeightKg = (length * width * height) / 5000;
  const weightGrams = weight * 1000; // 转换为克
  const dimensionalWeightGrams = dimensionalWeightKg * 1000; // 转换为克
  
  // 取实际重量和体积重量中的较大者作为计费重量
  const billedWeightGrams = Math.max(weightGrams, dimensionalWeightGrams);
  const billedWeightKg = billedWeightGrams / 1000;
  
  // 2. 对产品进行分类
  const category = determineCategory(length, width, height, weight, billedWeightKg);
  
  // 3. 根据分类计算运费
  return calculateFeeByCategory(category, billedWeightGrams, billedWeightKg);
}

/**
* 确定产品分类
*/
function determineCategory(length, width, height, weightKg, billedWeightKg) {
  // Light envelope
  if (length <= 33 && width <= 23 && height <= 2.5 && weightKg <= 0.1) {
      return 'light_envelope';
  }
  // Standard envelope
  if (length <= 33 && width <= 23 && height <= 2.5 && weightKg <= 0.46) {
      return 'standard_envelope';
  }
  // Large envelope
  if (length <= 33 && width <= 23 && height <= 4 && weightKg <= 0.96) {
      return 'large_envelope';
  }
  // Extra-large envelope
  if (length <= 33 && width <= 23 && height <= 6 && weightKg <= 0.96) {
      return 'extra_large_envelope';
  }
  // Small parcel
  if (length <= 35 && width <= 25 && height <= 12 && 
      weightKg <= 3.9 && billedWeightKg <= 2.1) {
      return 'small_parcel';
  }
  // Standard parcel
  if (length <= 45 && width <= 34 && height <= 26 && 
      weightKg <= 11.9 && billedWeightKg <= 7.96) {
      return 'standard_parcel';
  }
  // Small oversize
  if (length <= 61 && width <= 46 && height <= 46 && 
      weightKg <= 1.76 && billedWeightKg <= 25.82) {
      return 'small_oversize';
  }
  // 其他情况视为大件
  return 'oversize';
}

/**
* 根据分类计算运费
*/
function calculateFeeByCategory(category, weightGrams, weightKg) {
  switch (category) {
      case 'light_envelope':
          if (weightGrams <= 20) return 1.83;
          if (weightGrams <= 40) return 1.87;
          if (weightGrams <= 60) return 1.89;
          if (weightGrams <= 80) return 2.07;
          if (weightGrams <= 100) return 2.08;
          break;
          
      case 'standard_envelope':
          if (weightGrams <= 210) return 2.10;
          if (weightGrams <= 460) return 2.16;
          break;
          
      case 'large_envelope':
          if (weightGrams <= 960) return 2.72;
          break;
          
      case 'extra_large_envelope':
          if (weightGrams <= 960) return 2.94;
          break;
          
      case 'small_parcel':
          if (weightGrams <= 150) return 2.91;
          if (weightGrams <= 400) return 3.00;
          if (weightGrams <= 900) return 3.04;
          if (weightKg <= 1.4) return 3.05;
          if (weightKg <= 1.9) return 3.25;
          if (weightKg <= 3.9) return 5.10;
          break;
          
      case 'standard_parcel':
          if (weightGrams <= 150) return 2.94;
          if (weightGrams <= 400) return 3.01;
          if (weightGrams <= 900) return 3.06;
          if (weightKg <= 1.4) return 3.26;
          if (weightKg <= 1.9) return 3.48;
          if (weightKg <= 2.9) return 4.73;
          if (weightKg <= 3.9) return 5.16;
          if (weightKg <= 5.9) return 5.19;
          if (weightKg <= 8.9) return 5.57;
          if (weightKg <= 11.9) return 5.77;
          break;
          
      case 'small_oversize':
          if (weightKg <= 0.76) return 3.65;
          return 3.65 + Math.ceil((weightKg - 0.76) * 4) * 0.25; // 每0.25kg增加0.25英镑
          
      case 'oversize':
          // 大件商品基础运费计算
          return 15.43 + Math.ceil((weightKg - 0.5) * 2) * 0.46; // 每0.5kg增加0.46英镑
  }
  
  // 默认返回最高档费用
  switch (category) {
      case 'light_envelope': return 2.08;
      case 'standard_envelope': return 2.16;
      case 'large_envelope': return 2.72;
      case 'extra_large_envelope': return 2.94;
      case 'small_parcel': return 5.10;
      case 'standard_parcel': return 5.77;
      case 'small_oversize': return 3.65 + Math.ceil((weightKg - 0.76) * 4) * 0.25;
      default: return 15.43 + Math.ceil((weightKg - 0.5) * 2) * 0.46;
  }
}

// 示例用法
console.log(calculateCanadaShippingFee(30, 20, 2, 0.015));  // Light envelope
console.log(calculateCanadaShippingFee(33, 23, 2.5, 0.2));  // Standard envelope
console.log(calculateCanadaShippingFee(33, 23, 4, 0.8));    // Large envelope
console.log(calculateCanadaShippingFee(35, 25, 10, 1.5));   // Small parcel
console.log(calculateCanadaShippingFee(45, 34, 20, 5));     // Standard parcel
console.log(calculateCanadaShippingFee(60, 45, 45, 1.5));   // Small oversize
console.log(calculateCanadaShippingFee(70, 50, 50, 10));    // Oversize

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
