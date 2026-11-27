export const indicatorTemplates = {
  'ema-three-channels': {
    name: 'EMA 三通道',
    interval: '1d',
    minimumBars: 676,
    description: '所有标的均可使用，适合观察日线历史充足的标的，原例为纳斯达克 100 和 QQQ。用于观察长期趋势，以及回撤触及或跌破哪一组 EMA 通道。',
    channels: [
      { periods: [144, 169], color: '#85aaff' },
      { periods: [288, 338], color: '#54cbb7' },
      { periods: [576, 676], color: '#ff827c' },
    ],
  },
};

export function emaSeries(rows, length, interval) {
  const weight = 2 / (length + 1);
  let priorTime, count = 0, sum = 0, average = null;
  return rows.map(row => {
    if (row.time - priorTime !== interval) {
      count = 0;
      sum = 0;
      average = null;
    }
    priorTime = row.time;
    const close = Number(row.close);
    if (count < length) {
      sum += close;
      count++;
      // 用首段完整日线的简单均值初始化，缺口后的日线重新累计。
      if (count === length) average = sum / length;
    } else {
      average += (close - average) * weight;
    }
    return average;
  });
}
