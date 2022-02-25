import apollo from "../../lib/apolloClient";

// TODO: add paramaterization
export const treasuryDataQuery = `
query {
  protocolMetrics(first: 1000, orderBy: timestamp, orderDirection: desc) {
    id
    timestamp
    hecCirculatingSupply
    sHecCirculatingSupply
    totalSupply
    hecPrice
    marketCap
    totalValueLocked
    treasuryRiskFreeValue
    treasuryMarketValue
    nextEpochRebase
    nextDistributedHec
    treasuryDaiMarketValue
    treasuryDaiLPMarketValue
    treasuryDaiRiskFreeValue
    treasuryUsdcMarketValue
    treasuryUsdcLPMarketValue
    treasuryUsdcRiskFreeValue
    treasuryMIMMarketValue
    treasuryMIMRiskFreeValue
    treasuryWFTMMarketValue
    treasuryWFTMRiskFreeValue
    treasuryFRAXRiskFreeValue
    treasuryFRAXMarketValue
    treasuryInvestments
    treasuryBOOMarketValue
    treasuryBOORiskFreeValue
    treasuryCRVRiskFreeValue
    treasuryCRVMarketValue
    treasuryWETHRiskFreeValue
    treasuryWETHMarketValue
    currentAPY
    runwayCurrent
    treasuryHecDaiPOL
    bankBorrowed
    bankSupplied
    treasuryFantomValidatorValue
  }
  tors(first: 1000, orderBy: timestamp, orderDirection: desc) {
    id
    timestamp
    torTVL
    supply
  }
}
`;

export const torQuery = `
query {
  tors(first: 1000, orderBy: timestamp, orderDirection: desc) {
    supply
    timestamp
  }
}
`;
export const ethMetricsQuery = `
query {
  ethMetrics(first: 1000, orderBy: timestamp, orderDirection: desc) {
    id
    timestamp
    treasuryBaseRewardPool
  }
}
`;

export const rebasesV1DataQuery = `
query {
  rebases(where: {contract: "0x9ae7972BA46933B3B20aaE7Acbf6C311847aCA40"}, orderBy: timestamp, first: 1000, orderDirection: desc) {
    percentage
    timestamp
  }
}
`;

export const rebasesV2DataQuery = `
query {
  rebases(where: {contract: "0xD12930C8deeDafD788F437879cbA1Ad1E3908Cc5"}, orderBy: timestamp, first: 1000, orderDirection: desc) {
    percentage
    timestamp
  }
}
`;

// export default treasuryData;
export const bulletpoints = {
  tvl: [
    {
      right: 20,
      top: -12,
      background: "linear-gradient(180deg, #768299 -10%, #98B3E9 100%)",
      name: "sHEC",
      stopColor: ["#768299", "#98B3E9"],
      marketValue: "totalValueLocked",
    },
    {
      right: 29,
      top: -12,
      background: "linear-gradient(180deg, #60a5fa -10%, #2563eb 100%)",
      name: "Bank",
      stopColor: ["#60a5fa", "#2563eb"],
      marketValue: "bankTotal",
    },
    {
      right: 29,
      top: -12,
      background: "linear-gradient(180deg, #e89e5a -10%, #be7c40 100%)",
      name: "Tor Curve LP",
      stopColor: ["#e89e5a", "#be7c40"],
      marketValue: "torTVL",
    },
  ],
  coin: [
    {
      background: "linear-gradient(180deg, #ef4444 -10%, #dc2626 100%)",
      name: "CRV",
      stopColor: ["#ef4444", "#dc2626"],
      marketValue: "treasuryCRVMarketValue",
      riskFree: "treasuryCRVRiskFreeValue",
    },
    {
      background: "linear-gradient(180deg, #10b981 -10%, #059669 100%)",
      name: "FTM Validator",
      stopColor: ["#10b981", "#059669"],
      marketValue: "treasuryFantomValidatorValue",
    },
    {
      background: "linear-gradient(180deg, #d946ef -10%, #c026d3 100%)",
      name: "wETH",
      stopColor: ["#E722D1", "#9D1865"],
      marketValue: "treasuryWETHMarketValue",
      riskFree: "treasuryWETHRiskFreeValue",
    },

    {
      background: "linear-gradient(180deg, #c084fc -10%, #a855f7 100%)",
      name: "BOO",
      stopColor: ["#c084fc", "#a855f7"],
      marketValue: "treasuryBOOMarketValue",
      riskFree: "treasuryBOORiskFreeValue",
    },
    {
      background: "linear-gradient(180deg, #3b82f6 -10%, #2563eb 100%)",
      name: "wFTM",
      stopColor: ["#3b82f6", "#2563eb"],
      marketValue: "treasuryWFTMMarketValue",
      riskFree: "treasuryWFTMRiskFreeValue",
    },
    {
      background: "linear-gradient(180deg, #78716c -10%, #57534e 100%)",
      name: "FRAX",
      stopColor: ["#78716c", "#57534e"],
      marketValue: "treasuryFRAXMarketValue",
      riskFree: "treasuryFRAXRiskFreeValue",
    },
    {
      background: "linear-gradient(180deg, #fef9c3 -10%, #fef08a 100%)",
      name: "DAI LP",
      stopColor: ["#fef9c3", "#fef08a"],
      marketValue: "treasuryDaiLPMarketValue",
    },
    {
      background: "linear-gradient(180deg, #cffafe -10%, #a5f3fc 100%)",
      name: "USDC LP",
      stopColor: ["#cffafe", "#a5f3fc"],
      marketValue: "treasuryUsdcLPMarketValue",
    },
    {
      background: "linear-gradient(180deg, #6366f1 -10%, #4f46e5 100%)",
      name: "MIM",
      stopColor: ["#6366f1", "#4f46e5"],
      marketValue: "treasuryMIMMarketValue",
      riskFree: "treasuryMIMRiskFreeValue",
    },
    {
      background: "linear-gradient(180deg, #06b6d4 -10%, #0891b2 100%)",
      name: "USDC",
      stopColor: ["#768299", "#98B3E9"],
      marketValue: "treasuryUsdcMarketValue",
      riskFree: "treasuryUsdcMarketValue",
    },
    {
      background: "linear-gradient(180deg, #ffd89b -10%, #fbbe5d 100%)",
      name: "DAI",
      stopColor: ["#ffd89b", "#fbbe5d"],
      marketValue: "treasuryDaiMarketValue",
      riskFree: "treasuryDaiMarketValue",
    },
    {
      background: "linear-gradient(180deg, #f97316 -10%, #ea580c 100%)",
      stopColor: ["#e2e8f0", "#cbd5e1"],
      name: "Curve",
      marketValue: "treasuryBaseRewardPool",
      riskFree: "treasuryBaseRewardPool",
    },
  ],
  holder: [
    {
      right: 40,
      top: -12,
      background: "#A3A3A3",
    },
  ],
  apy: [
    {
      right: 20,
      top: -12,
      background: "#49A1F2",
    },
  ],
  runway: [
    {
      right: 45,
      top: -12,
      background: "#FFFFFF",
    },
    {
      right: 48,
      top: -12,
      background: "#2EC608",
    },
    {
      right: 48,
      top: -12,
      background: "#49A1F2",
    },
  ],
  staked: [
    {
      right: 45,
      top: -11,
      background: "linear-gradient(180deg, #55EBC7 -10%, rgba(71, 172, 235, 0) 100%)",
    },
    {
      right: 68,
      top: -12,
      background: "rgba(151, 196, 224, 0.2)",
      border: "1px solid rgba(54, 56, 64, 0.5)",
    },
  ],
  pol: [
    {
      right: 15,
      top: -12,
      background: "linear-gradient(180deg, rgba(56, 223, 63, 1) -10%, rgba(182, 233, 152, 1) 100%)",
    },
    {
      right: 25,
      top: -12,
      background: "rgba(219, 242, 170, 1)",
      border: "1px solid rgba(118, 130, 153, 1)",
    },
  ],
  supply: [
    {
      right: 45,
      top: -12,
      background: "#ED994C",
    },
  ],
  torSupply: [
    {
      right: 45,
      top: -12,
      background: "#C1C1C1",
    },
  ],
};

export const tooltipItems = {
  tvl: ["Total Value Deposited", "Wormhole (USDC+DAI)"],
  apy: ["APY"],
  runway: ["Days"],
  pol: ["SLP Treasury", "Market SLP"],
  supply: ["HEC"],
  torSupply: ["TOR"],
};

export const tooltipInfoMessages = {
  tvl:
    "Total Value Deposited, is the dollar amount of all HEC staked in the protocol. This metric is often used as growth or health indicator in DeFi projects.",
  mvt: "Market Value of Treasury Assets, is the sum of the value (in dollars) of all assets held by the treasury.",
  rfv: "Risk Free Value, is the amount of funds the treasury guarantees to use for backing HEC.",
  pol:
    "Protocol Owned Liquidity, is the amount of LP the treasury owns and controls. The more POL the better for the protocol and its users.",
  staked: "HEC Staked, is the ratio of sHEC to HEC (staked vs unstaked)",
  apy:
    "Annual Percentage Yield, is the normalized representation of an interest rate, based on a compounding period over one year. Note that APYs provided are rather ballpark level indicators and not so much precise future results.",
  runway: "Runway, is the number of days sHEC emissions can be sustained at a given rate. Lower APY = longer runway",
  supply: "The number of HEC that are publicly available and circulating in the market.",
  torSupply: "The number of TOR that currently exist.",
};

export const itemType = {
  dollar: "$",
  percentage: "%",
};
