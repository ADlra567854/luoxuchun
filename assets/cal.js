/* 农历双历引擎 · 白驹站点共享
 * window.CAL_LUNAR：
 *   solarToLunar(y,m,d) -> 详情 {lunarText, animal, gzYear, jieqi, festivals, zodiac, yiji...}
 *   getJieqi(y)          -> 当年 24 节气 { 'm-d': 名 }
 *   1900-2100 可靠，纯前端无网络。
 * 宜忌为参考性质（非迷信），仅作生活建议展示。
 */
(function () {
  var lunarInfo = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
    0x0d520
  ];
  var Gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var Zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var Animals = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
  var MonNames = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
  var DayNames = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
  var sTermInfo = [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,
    218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,
    440795,462224,483532,504758];
  var JIEQI = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种',
    '夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];
  // 公历固定节日（m-d）
  var solarFest = {
    '1-1':'元旦','2-14':'情人节','3-8':'妇女节','3-12':'植树节','4-1':'愚人节',
    '4-5':'清明（公历）','5-1':'劳动节','5-4':'青年节','6-1':'儿童节','7-1':'建党节',
    '8-1':'建军节','9-10':'教师节','10-1':'国庆节','12-24':'平安夜','12-25':'圣诞节'
  };
  // 农历节日（m-d，m 负为闰月不算）
  var lunarFest = {
    '1-1':'春节','1-15':'元宵节','2-2':'龙抬头','5-5':'端午节','7-7':'七夕','7-15':'中元节',
    '8-15':'中秋节','9-9':'重阳节','12-8':'腊八节','12-23':'小年（北方）','12-24':'小年（南方）'
  };

  function sTermDay(y, n) {
    var d = new Date((31556925974.7 * (y - 1900) + sTermInfo[n] * 60000) + Date.UTC(1900, 0, 6, 2, 5));
    return d.getUTCDate();
  }
  function getJieqi(y) {
    var map = {};
    for (var n = 0; n < 24; n++) {
      var m = Math.floor(n / 2) + 1;
      map[m + '-' + sTermDay(y, n)] = JIEQI[n];
    }
    return map;
  }
  function lunarYearInfo(y) { return lunarInfo[y - 1900] || 0x04bd8; }

  // 公历 -> 农历（精确：偏移量累加 + 闰月边界）
  function solarToLunar(y, m, d) {
    var base = Date.UTC(1900, 0, 31);           // 1900-01-31 = 农历1900正月初一
    var off = Math.floor((Date.UTC(y, m - 1, d) - base) / 86400000);
    var year, tmp = 0;
    for (year = 1900; year < 2101 && off > 0; year++) { tmp = lYearDays(year); off -= tmp; }
    if (off < 0) { off += tmp; year--; }
    var leap = leapMonth(year);
    var leapFlag = false, month = 1, mDays = 0;
    for (; month < 13 && off > 0; month++) {
      if (leap > 0 && month === (leap + 1) && !leapFlag) { month--; leapFlag = true; mDays = leapDays(year); }
      else mDays = monthDays(year, month);
      off -= mDays;
      if (leapFlag && month === (leap + 1)) leapFlag = false;
    }
    if (off === 0 && leap > 0 && month === (leap + 1)) {
      if (leapFlag) leapFlag = false; else { leapFlag = true; month--; }
    }
    if (off < 0) { off += mDays; month--; }
    return build(y, m, d, year, month, off + 1, leapFlag);
  }

  function build(sy, sm, sd, ly, lm, ld, isLeap) {
    var jq = getJieqi(sy);
    var jieqi = jq[sm + '-' + sd] || '';
    var monthName = (isLeap ? '闰' : '') + MonNames[lm - 1] + '月';
    var dayName = DayNames[ld - 1];
    var lunarText = monthName + dayName;
    var gzYear = Gan[(ly - 4) % 10] + Zhi[(ly - 4) % 12] + '年';
    var animal = Animals[(ly - 4) % 12];
    var zodiac = zodiacOf(sm, sd);
    var fests = [];
    if (solarFest[sm + '-' + sd]) fests.push(solarFest[sm + '-' + sd]);
    if (!isLeap && lunarFest[lm + '-' + ld]) fests.push(lunarFest[lm + '-' + ld]);
    if (jieqi) fests.push(jieqi);
    // 母亲节/父亲节/感恩节（动态公历节日）
    var dow = new Date(sy, sm - 1, sd).getDay();
    if (sm === 5 && sd >= 8 && sd <= 14 && dow === 0) fests.push('母亲节');
    if (sm === 6 && sd >= 15 && sd <= 21 && dow === 0) fests.push('父亲节');
    if (sm === 11 && sd >= 22 && sd <= 28 && dow === 4) fests.push('感恩节');
    var yi = ['学习','整理','锻炼','规划'];
    var ji = ['拖延','熬夜'];
    if (ld === 1 || ld === 15) { yi = ['祈福','静心','复盘']; ji = ['冲动决策']; }
    if (jieqi) { yi = ['顺应节气调整作息','关注养生']; ji = ['过度劳累']; }
    if (dow === 0) { yi = ['休息','陪伴家人']; ji = ['熬夜']; }
    return {
      solar: sy + '-' + pad(sm) + '-' + pad(sd),
      lunarYear: ly, lunarMonth: lm, lunarDay: ld, isLeap: isLeap,
      lunarText: lunarText, monthName: monthName, dayName: dayName,
      gzYear: gzYear, animal: animal, zodiac: zodiac,
      jieqi: jieqi, festivals: fests,
      yiji: { yi: yi, ji: ji }
    };
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function zodiacOf(m, d) {
    // 每月星座切换日：该月几号起进入新星座
    var Z = [[1,20,'水瓶'],[2,19,'双鱼'],[3,21,'白羊'],[4,20,'金牛'],[5,21,'双子'],[6,22,'巨蟹'],
             [7,23,'狮子'],[8,23,'处女'],[9,23,'天秤'],[10,24,'天蝎'],[11,23,'射手'],[12,22,'摩羯']];
    for (var i = 0; i < 12; i++) {
      if (m === Z[i][0] && d >= Z[i][1]) return Z[i][2] + '座';
    }
    var prev = m === 1 ? 11 : m - 2;   // 未到本月切换日 -> 属上个月的星座
    return Z[prev][2] + '座';
  }
  function lYearDays(y) {
    var info = lunarYearInfo(y), i, sum = 348;
    for (i = 0x8000; i > 0x8; i >>= 1) sum += (info & i) ? 1 : 0;
    return sum + leapDays(y);
  }
  function leapMonth(y) { return lunarYearInfo(y) & 0xf; }
  function leapDays(y) { return leapMonth(y) ? ((lunarYearInfo(y) & 0x10000) ? 30 : 29) : 0; }
  function monthDays(y, m) { return (lunarYearInfo(y) & (0x10000 >> m)) ? 30 : 29; }

  window.CAL_LUNAR = {
    solarToLunar: solarToLunar,
    getJieqi: getJieqi,
    zodiacOf: zodiacOf,
    animals: Animals,
    gan: Gan, zhi: Zhi
  };
})();
