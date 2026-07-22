export interface RatingInfo {
  flight: string
  color: string
}

// 18段階、DARTSLIVEの公式レーティング分布グラフの配色を目視で近似したもの。
export const DARTSLIVE_COLORS = [
  '#7EC8F2', '#4FB3EA', '#2196E3', '#1769C4', '#0D47A1',
  '#8F6FCE', '#7B52C7', '#6739B8', '#52239E',
  '#E15A2A', '#F0702E', '#F58A24', '#FFA71E', '#FFBB2E',
  '#FFCE4D', '#FFDE6B', '#FFEA96', '#FFF6C9',
]

const DARTSLIVE_FLIGHTS: Record<number, string> = {
  1: 'C', 2: 'C', 3: 'C',
  4: 'CC', 5: 'CC',
  6: 'B', 7: 'B',
  8: 'BB', 9: 'BB',
  10: 'A', 11: 'A', 12: 'A',
  13: 'AA', 14: 'AA', 15: 'AA',
  16: 'SA', 17: 'SA', 18: 'SA',
}

export function getDartsLiveInfo(rating: number): RatingInfo {
  return {
    flight: DARTSLIVE_FLIGHTS[rating] ?? '',
    color: DARTSLIVE_COLORS[rating - 1] ?? '#B7AF9C',
  }
}

// PHOENIXの公式ガイド(CLASS表)から確認した色帯。
const PHOENIX_BANDS: { min: number; max: number; cls: string; color: string }[] = [
  { min: 1, max: 1, cls: 'N', color: '#9AA0A6' },
  { min: 2, max: 3, cls: 'C', color: '#4C9A5B' },
  { min: 4, max: 5, cls: 'CC', color: '#4C9A5B' },
  { min: 6, max: 7, cls: 'CCC', color: '#4C9A5B' },
  { min: 8, max: 9, cls: 'B', color: '#3E6FD9' },
  { min: 10, max: 11, cls: 'BB', color: '#3E6FD9' },
  { min: 12, max: 13, cls: 'BBB', color: '#3E6FD9' },
  { min: 14, max: 16, cls: 'A', color: '#F0932B' },
  { min: 17, max: 20, cls: 'AA', color: '#F0932B' },
  { min: 21, max: 24, cls: 'AAA', color: '#F0932B' },
  { min: 25, max: 27, cls: 'MASTER', color: '#D64550' },
  { min: 28, max: 30, cls: 'GM', color: '#D64550' },
]

export function getPhoenixInfo(rating: number): RatingInfo {
  const band = PHOENIX_BANDS.find((b) => rating >= b.min && rating <= b.max)
  return {
    flight: band ? band.cls : '',
    color: band?.color ?? '#B7AF9C',
  }
}
