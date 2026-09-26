/// <reference types="vite/client" />

declare module 'lunar-javascript' {
  interface Lunar {
    getYearInGanZhi(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
  }
  export const Solar: {
    fromYmd(y: number, m: number, d: number): { getLunar(): Lunar };
  };
}
