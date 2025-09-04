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
  function calculateUSShippingFee(length, width, height, weight, salePrice) {
    // 1. 计算体积重量（磅）
    const dimensionalWeight = calculateDimensionalWeight(length, width, height);
    const billableWeight = Math.max(weight, dimensionalWeight);
    
    // 2. 产品分类
    const productType = classifyProduct(length, width, height, weight);
    
    // 3. 根据分类计算运费
    switch(productType) {
      case 'smallStandard':
        return calculateSmallStandardFee(weight, salePrice); // 计算小号标准运费,不考虑体积重量
      case 'largeStandard':
        return calculateLargeStandardFee(billableWeight, salePrice);
      case 'largeBulky':
        return calculateLargeBulkyFee(billableWeight, salePrice);
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
function calculateCanadaShippingFee(length, width, height, weight, salePrice) {
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
          return calculateCanadaEnvelopeFee(billedWeight, salePrice);
      case 'standard':
          return calculateCanadaStandardFee(billedWeight, salePrice);
      case 'oversize':
          return calculateCanadaOversizeFee(billedWeight, salePrice);
      default:
          return 0;
  }
}

/**
* 计算加拿大信封类包裹运费
* @param {number} weight 计费重量（克）
* @returns {number} 运费（加元）
*/
function calculateCanadaEnvelopeFee(weight, salePrice) {
  if (weight <= 100) return 4.46;
  if (weight <= 200) return 4.71;
  if (weight <= 300) return 5.01;
  if (weight <= 400) return 5.28;
  if (weight <= 500) return 5.62;
  
  // 如果超过500克，理论上信封类不会出现这种情况
  return 5.62;
}

/**
* 计算加拿大标准尺寸包裹运费
* @param {number} weight 计费重量（克）
* @returns {number} 运费（加元）
*/
function calculateCanadaStandardFee(weight, salePrice) {
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
* 计算加拿大大件包裹运费
* @param {number} weight 计费重量（克）
* @returns {number} 运费（加元）
*/
function calculateCanadaOversizeFee(weight, salePrice) {
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
function calculateUKShippingFee(length, width, height, weight, salePrice) {
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
  return calculateFeeByCategory(category, billedWeightGrams, billedWeightKg, salePrice);
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
function calculateFeeByCategory(category, weightGrams, weightKg, salePrice) {
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
 * 计算阿联酋亚马逊物流配送费
 * @param {number} length 长度（厘米）
 * @param {number} width 宽度（厘米）
 * @param {number} height 高度（厘米）
 * @param {number} weight 实际重量（千克）
 * @param {number} productPrice 商品销售单价（阿联酋迪拉姆）
 * @returns {number} 配送费用（阿联酋迪拉姆）
 */
function calculateUAEShippingFee(length, width, height, weight, productPrice) {
  // 1. 计算体积重量（千克）
  const dimensionalWeight = (length * width * height) / 5000;
  const billableWeight = Math.max(weight, dimensionalWeight);
  const billableWeightGrams = billableWeight * 1000; // 转换为克
  
  // 2. 对产品进行分类 - 根据新的分类表格
  let sizeCategory;
  
  // 小号信封
  if (billableWeightGrams <= 100 && length <= 20 && width <= 15 && height <= 1) {
      sizeCategory = 'small_envelope';
  }
  // 标准信封
  else if (billableWeightGrams <= 500 && length <= 33 && width <= 23 && height <= 2.5) {
      sizeCategory = 'standard_envelope';
  }
  // 大号信封
  else if (billableWeightGrams <= 1000 && length <= 33 && width <= 23 && height <= 5) {
      sizeCategory = 'large_envelope';
  }
  // 标准包裹
  else if (billableWeightGrams <= 12000 && length <= 45 && width <= 34 && height <= 26) {
      sizeCategory = 'standard_parcel';
  }
  // 大件
  else {
      sizeCategory = 'oversize';
  }
  
  // 3. 根据分类计算运费
  switch (sizeCategory) {
      case 'small_envelope':
          return calculateUAESmallEnvelopeFee(billableWeight, productPrice);
      case 'standard_envelope':
          return calculateUAEStandardEnvelopeFee(billableWeight, productPrice);
      case 'large_envelope':
          return calculateUAELargeEnvelopeFee(billableWeight, productPrice);
      case 'standard_parcel':
          return calculateUAEStandardParcelFee(billableWeight, productPrice);
      case 'oversize':
          return calculateUAEOversizeFee(billableWeight, productPrice);
      default:
          return 0;
  }
}

/**
* 计算阿联酋小号信封运费
* @param {number} weight 计费重量（千克）
* @param {number} productPrice 商品销售单价（阿联酋迪拉姆）
* @returns {number} 运费（阿联酋迪拉姆）
*/
function calculateUAESmallEnvelopeFee(weight, productPrice) {
  // 适用于≤0.1千克的商品
  if (weight > 0.1) return 7.5; // 如果超出重量范围，返回最高费用
  
  // 根据商品单价选择不同的费用
  return productPrice <= 25 ? 5.5 : 7.5;
}

/**
* 计算阿联酋标准信封运费
* @param {number} weight 计费重量（千克）
* @param {number} productPrice 商品销售单价（阿联酋迪拉姆）
* @returns {number} 运费（阿联酋迪拉姆）
*/
function calculateUAEStandardEnvelopeFee(weight, productPrice) {
  const isLowPrice = productPrice <= 25;
  
  if (weight <= 0.1) return isLowPrice ? 6.0 : 8.0;
  if (weight <= 0.2) return isLowPrice ? 6.2 : 8.2;
  if (weight <= 0.5) return isLowPrice ? 6.5 : 8.5;
  
  return isLowPrice ? 6.5 : 8.5; // 超出范围返回最高费用
}

/**
* 计算阿联酋大号信封运费
* @param {number} weight 计费重量（千克）
* @param {number} productPrice 商品销售单价（阿联酋迪拉姆）
* @returns {number} 运费（阿联酋迪拉姆）
*/
function calculateUAELargeEnvelopeFee(weight, productPrice) {
  // 适用于≤1千克的商品
  if (weight > 1) return 9.0; // 超出范围返回最高费用
  
  return productPrice <= 25 ? 7.0 : 9.0;
}

/**
* 计算阿联酋标准包裹运费
* @param {number} weight 计费重量（千克）
* @param {number} productPrice 商品销售单价（阿联酋迪拉姆）
* @returns {number} 运费（阿联酋迪拉姆）
*/
function calculateUAEStandardParcelFee(weight, productPrice) {
  const isLowPrice = productPrice <= 25;
  console.log('Weight, price:', weight, productPrice);
  
  if (weight <= 0.25) return isLowPrice ? 7.2 : 9.2;
  if (weight <= 0.5) return isLowPrice ? 7.5 : 9.5;
  if (weight <= 1) return isLowPrice ? 8.5 : 10.5;
  if (weight <= 1.5) return isLowPrice ? 9 : 11;
  if (weight <= 2) return isLowPrice ? 9.5 : 11.5;
  if (weight <= 3) return isLowPrice ? 10.5 : 12.5;
  if (weight <= 4) return isLowPrice ? 11.5 : 13.5;
  if (weight <= 5) return isLowPrice ? 12.5 : 14.5;
  if (weight <= 6) return isLowPrice ? 13.5 : 15.5;
  if (weight <= 7) return isLowPrice ? 14.5 : 16.5;
  if (weight <= 8) return isLowPrice ? 15.5 : 17.5;
  if (weight <= 9) return isLowPrice ? 16.5 : 18.5;
  if (weight <= 10) return isLowPrice ? 17.5 : 19.5;
  if (weight <= 11) return isLowPrice ? 18.5 : 20.5;
  if (weight <= 12) return isLowPrice ? 19.5 : 21.5;
  
  return isLowPrice ? 19.5 : 21.5; // 超出范围返回最高费用
}

/**
* 计算阿联酋大件包裹运费
* @param {number} weight 计费重量（千克）
* @param {number} productPrice 商品销售单价（阿联酋迪拉姆）
* @returns {number} 运费（阿联酋迪拉姆）
*/
function calculateUAEOversizeFee(weight, productPrice) {
  const isLowPrice = productPrice <= 25;
  
  if (weight <= 1) return isLowPrice ? 10.5 : 12.5;
  if (weight <= 2) return isLowPrice ? 11.5 : 13.5;
  if (weight <= 3) return isLowPrice ? 12.5 : 14.5;
  if (weight <= 4) return isLowPrice ? 13.5 : 15.5;
  if (weight <= 5) return isLowPrice ? 14.5 : 16.5;
  if (weight <= 6) return isLowPrice ? 15.5 : 17.5;
  if (weight <= 7) return isLowPrice ? 16.5 : 18.5;
  if (weight <= 8) return isLowPrice ? 17.5 : 19.5;
  if (weight <= 9) return isLowPrice ? 18.5 : 20.5;
  if (weight <= 10) return isLowPrice ? 19.5 : 21.5;
  if (weight <= 15) return isLowPrice ? 24.5 : 26.5;
  if (weight <= 20) return isLowPrice ? 29.5 : 31.5;
  if (weight <= 25) return isLowPrice ? 34.5 : 36.5;
  if (weight <= 30) return isLowPrice ? 39.5 : 41.5;
  
  return isLowPrice ? 39.5 : 41.5; // 超出范围返回最高费用
}

// 如果还有沙特的函数，也需要按照相同规则修改

/**
 * 计算沙特亚马逊物流配送费
 * @param {number} length 长度（厘米）
 * @param {number} width 宽度（厘米）
 * @param {number} height 高度（厘米）
 * @param {number} weight 实际重量（千克）
 * @param {number} productPrice 商品销售单价（沙特里亚尔）
 * @returns {number} 配送费用（沙特里亚尔）
 */
function calculateSaudiShippingFee(length, width, height, weight, productPrice) {
  // 1. 计算体积重量（千克）
  const dimensionalWeight = (length * width * height) / 5000;
  const billableWeight = Math.max(weight, dimensionalWeight);
  const billableWeightGrams = billableWeight * 1000; // 转换为克
  
  // 2. 对产品进行分类
  let sizeCategory;
  
  // 小号信封
  if (billableWeightGrams <= 100 && length <= 20 && width <= 15 && height <= 1) {
      sizeCategory = 'small_envelope';
  }
  // 标准信封
  else if (billableWeightGrams <= 500 && length <= 33 && width <= 23 && height <= 2.5) {
      sizeCategory = 'standard_envelope';
  }
  // 大号信封
  else if (billableWeightGrams <= 1000 && length <= 33 && width <= 23 && height <= 5) {
      sizeCategory = 'large_envelope';
  }
  // 标准包裹
  else if (billableWeightGrams <= 12000 && length <= 45 && width <= 34 && height <= 26) {
      sizeCategory = 'standard_parcel';
  }
  // 大件
  else {
      sizeCategory = 'oversize';
  }
  
  // 3. 根据分类计算运费
  switch (sizeCategory) {
      case 'small_envelope':
          return calculateSaudiSmallEnvelopeFee(billableWeight, productPrice);
      case 'standard_envelope':
          return calculateSaudiStandardEnvelopeFee(billableWeight, productPrice);
      case 'large_envelope':
          return calculateSaudiLargeEnvelopeFee(billableWeight, productPrice);
      case 'standard_parcel':
          return calculateSaudiStandardParcelFee(billableWeight, productPrice);
      case 'oversize':
          return calculateSaudiOversizeFee(billableWeight, productPrice);
      default:
          return 0;
  }
}

/**
* 计算沙特小号信封运费
* @param {number} weight 计费重量（千克）
* @param {number} productPrice 商品销售单价（沙特里亚尔）
* @returns {number} 运费（沙特里亚尔）
*/
function calculateSaudiSmallEnvelopeFee(weight, productPrice) {
  // 适用于≤0.1千克的商品
  if (weight > 0.1) return 7.5; // 如果超出重量范围，返回最高费用
  
  // 根据商品单价选择不同的费用
  return productPrice <= 25 ? 5.5 : 7.5;
}

/**
* 计算沙特标准信封运费
* @param {number} weight 计费重量（千克）
* @param {number} productPrice 商品销售单价（沙特里亚尔）
* @returns {number} 运费（沙特里亚尔）
*/
function calculateSaudiStandardEnvelopeFee(weight, productPrice) {
  const isLowPrice = productPrice <= 25;
  
  if (weight <= 0.1) return isLowPrice ? 6.0 : 8.0;
  if (weight <= 0.2) return isLowPrice ? 6.2 : 8.2;
  if (weight <= 0.5) return isLowPrice ? 6.5 : 8.5;
  
  return isLowPrice ? 6.5 : 8.5; // 超出范围返回最高费用
}

/**
* 计算沙特大号信封运费
* @param {number} weight 计费重量（千克）
* @param {number} productPrice 商品销售单价（沙特里亚尔）
* @returns {number} 运费（沙特里亚尔）
*/
function calculateSaudiLargeEnvelopeFee(weight, productPrice) {
  // 适用于≤1千克的商品
  if (weight > 1) return 9.0; // 超出范围返回最高费用
  
  return productPrice <= 25 ? 7.0 : 9.0;
}

/**
* 计算沙特标准包裹运费
* @param {number} weight 计费重量（千克）
* @param {number} productPrice 商品销售单价（沙特里亚尔）
* @returns {number} 运费（沙特里亚尔）
*/
function calculateSaudiStandardParcelFee(weight, productPrice) {
  const isLowPrice = productPrice <= 25;
  
  if (weight <= 0.25) return isLowPrice ? 7.2 : 9.2;
  if (weight <= 0.5) return isLowPrice ? 7.5 : 9.5;
  if (weight <= 1) return isLowPrice ? 8.0 : 10.0;
  if (weight <= 1.5) return isLowPrice ? 8.5 : 11.5;
  if (weight <= 2) return isLowPrice ? 9.0 : 12.0;
  if (weight <= 3) return isLowPrice ? 10.0 : 13.0;
  if (weight <= 4) return isLowPrice ? 11.0 : 14.0;
  if (weight <= 5) return isLowPrice ? 12.0 : 15.0;
  if (weight <= 6) return isLowPrice ? 13.0 : 16.0;
  if (weight <= 7) return isLowPrice ? 14.0 : 17.0;
  if (weight <= 8) return isLowPrice ? 15.0 : 18.0;
  if (weight <= 9) return isLowPrice ? 16.0 : 19.0;
  if (weight <= 10) return isLowPrice ? 17.0 : 20.0;
  if (weight <= 11) return isLowPrice ? 18.0 : 21.0;
  if (weight <= 12) return isLowPrice ? 19.0 : 22.0;
  
  return isLowPrice ? 19.0 : 22.0; // 超出范围返回最高费用
}

/**
* 计算沙特大件包裹运费
* @param {number} weight 计费重量（千克）
* @param {number} productPrice 商品销售单价（沙特里亚尔）
* @returns {number} 运费（沙特里亚尔）
*/
function calculateSaudiOversizeFee(weight, productPrice) {
  const isLowPrice = productPrice <= 25;
  
  if (weight <= 1) return isLowPrice ? 10.0 : 14.0;
  if (weight <= 2) return isLowPrice ? 11.0 : 15.0;
  if (weight <= 3) return isLowPrice ? 12.0 : 16.0;
  if (weight <= 4) return isLowPrice ? 13.0 : 17.0;
  if (weight <= 5) return isLowPrice ? 14.0 : 18.0;
  if (weight <= 6) return isLowPrice ? 15.0 : 19.0;
  if (weight <= 7) return isLowPrice ? 16.0 : 20.0;
  if (weight <= 8) return isLowPrice ? 17.0 : 21.0;
  if (weight <= 9) return isLowPrice ? 18.0 : 22.0;
  if (weight <= 10) return isLowPrice ? 19.0 : 23.0;
  if (weight <= 15) return isLowPrice ? 24.0 : 28.0;
  if (weight <= 20) return isLowPrice ? 29.0 : 33.0;
  if (weight <= 25) return isLowPrice ? 34.0 : 38.0;
  if (weight <= 30) return isLowPrice ? 39.0 : 43.0;
  
  // 超过30千克的部分，每千克额外加1沙特里亚尔
  const extraWeight = weight - 30;
  const extraFee = extraWeight * 1;
  return (isLowPrice ? 39.0 : 43.0) + extraFee;
}

// 示例用法 - 沙特物流计算
console.log(calculateSaudiShippingFee(20, 15, 1, 0.05, 20));  // 小号信封，单价低于25里亚尔
console.log(calculateSaudiShippingFee(20, 15, 1, 0.05, 30));  // 小号信封，单价高于25里亚尔
console.log(calculateSaudiShippingFee(33, 23, 2.5, 0.2, 20));  // 标准信封，0.2千克，单价低于25里亚尔
console.log(calculateSaudiShippingFee(33, 23, 5, 0.8, 30));    // 大号信封，单价高于25里亚尔
console.log(calculateSaudiShippingFee(45, 34, 26, 5, 20));     // 标准包裹，5千克，单价低于25里亚尔
console.log(calculateSaudiShippingFee(60, 40, 30, 10, 30));    // 大件，10千克，单价高于25里亚尔
console.log(calculateSaudiShippingFee(60, 40, 30, 35, 20));    // 大件，35千克（超过30千克），单价低于25里亚尔
