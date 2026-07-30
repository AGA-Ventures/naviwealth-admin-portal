export type StockRecord = {
  id: number;
  symbol: string;
  fullName: string;
  reference: string;
  assetClass: string;
  scenario: string;
  ticks: number;
  firstPrice: number;
  lastPrice: number;
  lowPrice: number;
  highPrice: number;
  volatility: "Low" | "Moderate" | "High";
  riskProfile: string;
  gameplayRole: string;
  summary: string;
  trendPoints: number[];
};

export const stockInventory: StockRecord[] = [
  {
    id: 1,
    symbol: "BTC",
    fullName: "Bitcoin",
    reference: "BTC",
    assetClass: "Digital asset",
    scenario: "Scenario 1",
    ticks: 360,
    firstPrice: 1300,
    lastPrice: 188.27,
    lowPrice: 128.37,
    highPrice: 1432.51,
    volatility: "High",
    riskProfile: "Speculative decline",
    gameplayRole:
      "A high-volatility digital asset with a sustained downside cycle.",
    summary:
      "Bitcoin Scenario 1 contains the 360 fixed price points supplied in the stock source file.",
    trendPoints: [
      1300, 1160.51, 1088.29, 1098.78, 559.85, 457.44, 422.41, 276.46,
      265.69, 222.1, 149.33, 188.27,
    ],
  },
  {
    id: 2,
    symbol: "KLSI",
    fullName: "FTSE Bursa Malaysia KLCI",
    reference: "KLSI",
    assetClass: "Market index",
    scenario: "Scenario 1",
    ticks: 360,
    firstPrice: 109,
    lastPrice: 107.7,
    lowPrice: 86.33,
    highPrice: 129.36,
    volatility: "Moderate",
    riskProfile: "Balanced index",
    gameplayRole:
      "A range-bound market index with alternating expansion and pullback.",
    summary:
      "KLSI Scenario 1 contains the 360 fixed price points supplied in the stock source file.",
    trendPoints: [
      109, 99.97, 101.06, 106.82, 118.93, 111.6, 96.03, 97.67, 93.13,
      94.79, 99.57, 107.7,
    ],
  },
  {
    id: 3,
    symbol: "GOLD",
    fullName: "Gold",
    reference: "GOLD",
    assetClass: "Commodity",
    scenario: "Scenario 1",
    ticks: 360,
    firstPrice: 101,
    lastPrice: 129.77,
    lowPrice: 98.42,
    highPrice: 131.52,
    volatility: "Low",
    riskProfile: "Defensive growth",
    gameplayRole:
      "A steadier commodity sequence with a sustained positive trend.",
    summary:
      "Gold Scenario 1 contains the 360 fixed price points supplied in the stock source file.",
    trendPoints: [
      101, 100.12, 104.4, 103.49, 106.75, 114.44, 114.22, 115.84, 116.53,
      124.95, 125.14, 129.77,
    ],
  },
  {
    id: 4,
    symbol: "SMP500",
    fullName: "S&P 500",
    reference: "SMP500",
    assetClass: "Market index",
    scenario: "Scenario 1",
    ticks: 360,
    firstPrice: 996,
    lastPrice: 1115.63,
    lowPrice: 866.12,
    highPrice: 1155.31,
    volatility: "Moderate",
    riskProfile: "Diversified core",
    gameplayRole:
      "A broad index cycle with meaningful drawdowns and a positive finish.",
    summary:
      "SMP500 Scenario 1 contains the 360 fixed price points supplied in the stock source file.",
    trendPoints: [
      996, 1089.53, 1045.91, 982.35, 1037.15, 1021.71, 897.64, 982.13,
      1028.79, 980.01, 1017.13, 1115.63,
    ],
  },
  {
    id: 5,
    symbol: "BTC2",
    fullName: "Bitcoin · Scenario 2",
    reference: "BTC2",
    assetClass: "Digital asset",
    scenario: "Scenario 2",
    ticks: 360,
    firstPrice: 1300,
    lastPrice: 968.9,
    lowPrice: 631.81,
    highPrice: 4659.86,
    volatility: "High",
    riskProfile: "Speculative boom and correction",
    gameplayRole:
      "A rapid upside cycle followed by a prolonged correction.",
    summary:
      "Bitcoin Scenario 2 contains the second 360-point BTC sequence supplied in the stock source file.",
    trendPoints: [
      1300, 2542.68, 2847.29, 3882.63, 2942.15, 1354.1, 1430.91, 1197.38,
      1101.97, 853.75, 1065.65, 968.9,
    ],
  },
  {
    id: 6,
    symbol: "KLSI2",
    fullName: "FTSE Bursa Malaysia KLCI · Scenario 2",
    reference: "KLSI2",
    assetClass: "Market index",
    scenario: "Scenario 2",
    ticks: 360,
    firstPrice: 109,
    lastPrice: 112.76,
    lowPrice: 96.29,
    highPrice: 151.15,
    volatility: "Moderate",
    riskProfile: "Growth index cycle",
    gameplayRole:
      "A market-index rally with several shorter correction phases.",
    summary:
      "KLSI Scenario 2 contains the second 360-point KLSI sequence supplied in the stock source file.",
    trendPoints: [
      109, 96.29, 102.01, 130.23, 143.62, 112.06, 119.67, 117.56, 125.56,
      101.4, 113.4, 112.76,
    ],
  },
  {
    id: 7,
    symbol: "GOLD2",
    fullName: "Gold · Scenario 2",
    reference: "GOLD2",
    assetClass: "Commodity",
    scenario: "Scenario 2",
    ticks: 360,
    firstPrice: 101,
    lastPrice: 105.11,
    lowPrice: 92.68,
    highPrice: 116.92,
    volatility: "Low",
    riskProfile: "Defensive range",
    gameplayRole:
      "A low-volatility commodity cycle that returns close to its opening level.",
    summary:
      "Gold Scenario 2 contains the second 360-point GOLD sequence supplied in the stock source file.",
    trendPoints: [
      101, 108.66, 115.8, 107.65, 104.97, 98.57, 98.06, 96.86, 99.54,
      105.06, 106.23, 105.11,
    ],
  },
  {
    id: 8,
    symbol: "SMP5002",
    fullName: "S&P 500 · Scenario 2",
    reference: "SMP5002",
    assetClass: "Market index",
    scenario: "Scenario 2",
    ticks: 360,
    firstPrice: 996,
    lastPrice: 1101.88,
    lowPrice: 903.89,
    highPrice: 1281.57,
    volatility: "Moderate",
    riskProfile: "Diversified growth cycle",
    gameplayRole:
      "A broad index rally with corrections and a positive closing level.",
    summary:
      "SMP500 Scenario 2 contains the second 360-point SMP500 sequence supplied in the stock source file.",
    trendPoints: [
      996, 1090.85, 1229.92, 1170.42, 1162.8, 1006.43, 978.33, 995.68,
      1133.85, 1101.28, 1138.62, 1101.88,
    ],
  },
];
