// ============================================================
// 中国省份-城市映射数据
// adcode 对应 DataV GeoJSON 中的 properties.adcode
// ============================================================
const PROVINCE_CITY_MAP = {
    '110000': { name: '北京市', nameEn: 'Beijing', cities: ['beijing'] },
    '120000': { name: '天津市', nameEn: 'Tianjin', cities: ['tianjin'] },
    '130000': { name: '河北省', nameEn: 'Hebei', cities: ['shijiazhuang', 'zhangjiakou'] },
    '140000': { name: '山西省', nameEn: 'Shanxi', cities: ['taiyuan'] },
    '150000': { name: '内蒙古自治区', nameEn: 'Inner Mongolia', cities: [] },
    '210000': { name: '辽宁省', nameEn: 'Liaoning', cities: ['dalian', 'shenyang'] },
    '220000': { name: '吉林省', nameEn: 'Jilin', cities: [] },
    '230000': { name: '黑龙江省', nameEn: 'Heilongjiang', cities: ['harbin'] },
    '310000': { name: '上海市', nameEn: 'Shanghai', cities: ['shanghai'] },
    '320000': { name: '江苏省', nameEn: 'Jiangsu', cities: ['nanjing', 'suzhou', 'wuxi'] },
    '330000': { name: '浙江省', nameEn: 'Zhejiang', cities: ['hangzhou', 'ningbo', 'taizhou'] },
    '340000': { name: '安徽省', nameEn: 'Anhui', cities: ['hefei'] },
    '350000': { name: '福建省', nameEn: 'Fujian', cities: ['fuzhou', 'xiamen'] },
    '360000': { name: '江西省', nameEn: 'Jiangxi', cities: ['jiujiang'] },
    '370000': { name: '山东省', nameEn: 'Shandong', cities: ['jinan', 'qingdao', 'yantai'] },
    '410000': { name: '河南省', nameEn: 'Henan', cities: ['zhengzhou'] },
    '420000': { name: '湖北省', nameEn: 'Hubei', cities: ['wuhan'] },
    '430000': { name: '湖南省', nameEn: 'Hunan', cities: ['changsha'] },
    '440000': { name: '广东省', nameEn: 'Guangdong', cities: ['guangzhou', 'shenzhen'] },
    '450000': { name: '广西壮族自治区', nameEn: 'Guangxi', cities: ['guilin'] },
    '460000': { name: '海南省', nameEn: 'Hainan', cities: ['sanya'] },
    '500000': { name: '重庆市', nameEn: 'Chongqing', cities: ['chongqing'] },
    '510000': { name: '四川省', nameEn: 'Sichuan', cities: ['chengdu'] },
    '520000': { name: '贵州省', nameEn: 'Guizhou', cities: [] },
    '530000': { name: '云南省', nameEn: 'Yunnan', cities: ['kunming', 'lijiang'] },
    '540000': { name: '西藏自治区', nameEn: 'Tibet', cities: ['lhasa'] },
    '610000': { name: '陕西省', nameEn: 'Shaanxi', cities: ['xian'] },
    '620000': { name: '甘肃省', nameEn: 'Gansu', cities: ['lanzhou'] },
    '630000': { name: '青海省', nameEn: 'Qinghai', cities: [] },
    '640000': { name: '宁夏回族自治区', nameEn: 'Ningxia', cities: [] },
    '650000': { name: '新疆维吾尔自治区', nameEn: 'Xinjiang', cities: ['urumqi'] },
    '710000': { name: '台湾省', nameEn: 'Taiwan', cities: [] },
    '810000': { name: '香港特别行政区', nameEn: 'Hong Kong', cities: [] },
    '820000': { name: '澳门特别行政区', nameEn: 'Macau', cities: [] },
};

// 反向查找：城市 nameEn -> 省份 adcode
const CITY_TO_PROVINCE = {};
Object.entries(PROVINCE_CITY_MAP).forEach(([adcode, info]) => {
    info.cities.forEach(city => {
        CITY_TO_PROVINCE[city] = adcode;
    });
});

window.PROVINCE_CITY_MAP = PROVINCE_CITY_MAP;
window.CITY_TO_PROVINCE = CITY_TO_PROVINCE;
