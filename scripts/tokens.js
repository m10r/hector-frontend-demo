const axios = require("axios").default;
const fs = require("fs");
const path = require("path");

/**
 * @typedef Platforms
 * @type {object}
 * @property {string} id - an ID.
 * @property {string} name - your name.
 * @property {number} age - your age.
 */

/**
 * @typedef Token
 * @type {object}
 * @property {string} id
 * @property {string} name
 * @property {string} symbol
 * @property {Object.<string, string>} platforms
 * @property {string} logo
 * @property {number?} rank
 * @property {boolean?} isNative
 * @property {number?} decimals
 */

/**
 * @typedef Chain
 * @type {object}
 *
 * @property {string} chainSlug
 * @property {string} nativeTokenId
 * @property {number} nativeTokenDecimals
 * @property {string} filename
 *
 * @property {number} chainId
 * @property {string} color
 * @property {boolean} isFavorite
 * @property {string[]} rpc
 * @property {string} name
 * @property {string} longName
 * @property {string[]} explorers
 */

/** @type {Chain[]} */
const CHAINS = [
  {
    chainSlug: "polygon-pos",
    nativeTokenId: "matic-network",
    nativeTokenDecimals: 18,
    filename: "polygon",

    chainId: 137,
    color: "#8247E5",
    isFavorite: false,
    name: "Polygon",
    longName: "Polygon Mainnet",
    rpc: ["https://polygon-rpc.com/", "https://rpc-mainnet.matic.network"],
    explorers: ["https://polygonscan.com/"],
  },
  {
    chainSlug: "ethereum",
    nativeTokenId: "ethereum",
    nativeTokenDecimals: 18,
    filename: "ethereum",

    name: "Ethereum",
    longName: "Ethereum Mainnet",
    chainId: 1,
    color: "#627EEA",
    isFavorite: true,
    rpc: ["https://cloudflare-eth.com", "https://main-rpc.linkpool.io"],
    explorers: ["https://etherscan.io/"],
  },
  {
    chainSlug: "binance-smart-chain",
    nativeTokenId: "binancecoin",
    nativeTokenDecimals: 18,
    filename: "binance",

    name: "Binance",
    longName: "Binance Smart Chain Mainnet",
    chainId: 56,
    isFavorite: false,
    color: "#F0B90B",
    rpc: ["https://bsc-dataseed1.binance.org", "https://bsc-dataseed1.defibit.io/"],
    explorers: ["https://bscscan.com/"],
  },
  {
    chainSlug: "moonriver",
    nativeTokenId: "moonriver",
    nativeTokenDecimals: 18,
    filename: "moonriver",

    name: "Moonriver",
    longName: "Moonriver",
    chainId: 1285,
    isFavorite: false,
    color: "#53CBC9",
    rpc: ["https://rpc.moonriver.moonbeam.network", "https://moonriver.api.onfinality.io/public"],
    explorers: ["https://moonriver.moonscan.io/"],
  },
  {
    chainSlug: "fantom",
    nativeTokenId: "fantom",
    nativeTokenDecimals: 18,
    filename: "fantom",

    name: "Fantom",
    longName: "Fantom Opera",
    chainId: 250,
    color: "#1969FF",
    isFavorite: true,
    rpc: ["https://rpc.ftm.tools"],
    explorers: ["https://ftmscan.com/"],
  },
  {
    chainSlug: "avalanche",
    nativeTokenId: "avalanche-2",
    nativeTokenDecimals: 18,
    filename: "avalanche",

    name: "Avalanche",
    longName: "Avalanche Mainnet",
    chainId: 43114,
    isFavorite: false,
    color: "#E84142",
    rpc: ["https://api.avax.network/ext/bc/C/rpc"],
    explorers: ["https://snowtrace.io/"],
  },
];

async function run() {
  const response = await axios.get("https://api.coingecko.com/api/v3/coins/list?include_platform=true");

  /** @type {Token[]} */
  let tokens = response.data;
  tokens = tokens.filter(token => {
    for (const [platform, address] of Object.entries(token.platforms)) {
      if (CHAINS.some(chain => chain.chainSlug === platform)) {
        return true;
      }
    }
    return false;
  });

  const SECONDS_PER_MINUTE = 60;
  const MILLIS_PER_SECOND = 1000;
  const MILLIS_PER_MINUTE = SECONDS_PER_MINUTE * MILLIS_PER_SECOND;

  const CALLS_PER_MINUTE = 45;
  const MILLIS_PER_CALL = MILLIS_PER_MINUTE / CALLS_PER_MINUTE;

  for (const [i, token] of tokens.entries()) {
    console.log(`[${i + 1}/${tokens.length}]`, "Getting token info:", token.name, `(${token.id})`);

    const start = process.hrtime();
    const { data: details } = await getTokenDetails(token.id);
    token.rank = details.coingecko_rank;
    token.logo = details.image.small;

    const elapsed = millis(process.hrtime(start));
    await sleep(MILLIS_PER_CALL - elapsed);
  }

  fs.writeFile("tokens.json", JSON.stringify(tokens), console.log);
}
// run();

async function filter() {
  const raw = fs.readFileSync("tokens_good.json");

  /**@type {Token[]} */
  let allTokens = JSON.parse(raw.toString());
  allTokens = allTokens.filter(({ rank }) => rank != undefined);
  allTokens.sort((a, b) => a.rank - b.rank);

  const chains = await Promise.all(
    CHAINS.map(async chain => {
      const chainTokens = allTokens.filter(token => Object.keys(token.platforms).includes(chain.chainSlug));

      const MIN = 75;
      const MAX = 100;
      const TOP_X_PERCENT = 0.15;
      const end = Math.min(Math.max(Math.floor(chainTokens.length * TOP_X_PERCENT), MIN), MAX);

      const tokens = chainTokens.slice(0, end).map(({ platforms, symbol, ...token }) => ({
        ...token,
        symbol: symbol.toUpperCase(),
        address: platforms[chain.chainSlug],
      }));

      let nativeTokenIndex = tokens.findIndex(token => token.id === chain.nativeTokenId);
      let [nativeToken] = nativeTokenIndex >= 0 ? tokens.splice(nativeTokenIndex, 1) : [];

      if (nativeToken == undefined) {
        const { data: nativeTokenDetails } = await getTokenDetails(chain.nativeTokenId);
        nativeToken = {
          id: nativeTokenDetails.id,
          name: nativeTokenDetails.name,
          symbol: nativeTokenDetails.symbol.toUpperCase(),
          logo: nativeTokenDetails.image.small,
          rank: nativeTokenDetails.coingecko_rank,
          address: nativeTokenDetails.contract_address || "0x0000000000000000000000000000000000000000",
          isNative: true,
          decimals: chain.nativeTokenDecimals,
        };
      } else {
        nativeToken.isNative = true;
        nativeToken.decimals = chain.nativeTokenDecimals;
      }

      return {
        filename: chain.filename,
        chainId: chain.chainId,
        name: chain.name,
        longName: chain.longName,
        color: chain.color,
        rpc: chain.rpc,
        explorers: chain.explorers,
        isFavortite: chain.isFavorite,
        tokens: [nativeToken, ...tokens],
      };
    }),
  );

  for (const chain of chains) {
    const filepath = path.join("src/assets/chains", `${chain.filename}.json`);
    fs.writeFile(filepath, JSON.stringify(chain, undefined, 4), console.log);
  }
}
filter();

/**
 * @param {[number, number]} time
 * @returns {number}
 */
function millis([secs, nanos]) {
  return secs * 1000 + nanos * 0.000001;
}

async function getTokenDetails(coin) {
  return axios.get(
    `https://api.coingecko.com/api/v3/coins/${coin}?developer_data=false&community_data=false&tickers=false&market_data=false&localization=false`,
  );
}

/**
 * @param {number} ms
 * @returns {Promise<any>}
 */
async function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
