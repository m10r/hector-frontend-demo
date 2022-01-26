import "./swap.scss";
import React, { useEffect, useMemo, useRef, useState, VFC } from "react";
import SDK, {
  BLOCKCHAIN_NAME,
  Configuration,
  InstantTrade,
  WalletProvider,
  InsufficientFundsError,
} from "hector-rubic-sdk";
import { useWeb3Context } from "src/hooks";
import { FANTOM } from "src/constants";
import { sleep } from "src/helpers/Sleep";
import tokens from "src/assets/tokens.json";
import { ReactComponent as ChevronIcon } from "src/assets/icons/chevron.svg";
import { ReactComponent as ArrowDownIcon } from "src/assets/icons/arrow-down.svg";
import { BigNumber as EthersBigNumber, ethers } from "ethers";
import { abi as ierc20Abi } from "src/abi/IERC20.json";
import { abi as erc20Abi } from "src/abi/ERC20.json";
import BigNumber from "bignumber.js";
import { HECTOR_ENV } from "src/helpers/Environment";

const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";

interface Token {
  name: string;
  address: string;
  symbol: string;
  logo: string;
}

const initialConfiguration: Configuration = {
  rpcProviders: {
    [BLOCKCHAIN_NAME.ETHEREUM]: {
      mainRpc: "https://cloudflare-eth.com/",
    },
    [BLOCKCHAIN_NAME.FANTOM]: {
      mainRpc: "https://rpc.ftm.tools",
    },
  },
};

function Swap() {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [rubic, setRubic] = useState<SDK>(null);
  useEffect(() => {
    async function run() {
      const sdk = await SDK.createSDK(configuration);
      setRubic(sdk);
    }
    run();
  }, []);

  const web3 = useWeb3Context();
  const [wallet, setWallet] = useState<WalletProvider>(null);
  useEffect(() => {
    if (!web3.connected) {
      return;
    }
    setWallet({
      address: web3.address,
      chainId: web3.chainID,
      core: window.ethereum,
    });
  }, [web3]);

  useEffect(() => {
    async function update() {
      const newConfiguration: Configuration = {
        ...configuration,
        walletProvider: wallet || undefined,
      };
      setConfiguration(newConfiguration);
      if (rubic) {
        await rubic.updateConfiguration(newConfiguration);
      }
    }
    update();
  }, [rubic, wallet]);

  const [from, setFrom] = useState<Token>(tokens.find(token => token.symbol === "FTM"));
  const [to, setTo] = useState<Token>(tokens.find(token => token.address === FANTOM.HEC_ADDRESS));
  const [amount, setAmount] = useState("");
  const [trades, setTrades] = useState<InstantTrade[]>([]);
  const bestTrade: InstantTrade | undefined = trades[0];

  const [decimals, setDecimals] = useState<number>(18);

  const provider = useMemo(() => new ethers.providers.JsonRpcProvider("https://rpc.ftm.tools"), []);

  async function getBalance(): Promise<EthersBigNumber> {
    if (from.address === NATIVE_ADDRESS) {
      return await web3.provider.getBalance(web3.address);
    }
    const ierc20 = new ethers.Contract(from.address, ierc20Abi, provider);
    try {
      return await ierc20.balanceOf(web3.address);
    } catch (e) {
      return EthersBigNumber.from(0);
    }
  }

  useEffect(() => {
    if (!web3 || !from) {
      return;
    }

    let disposed = false;
    async function run() {
      if (from.address === NATIVE_ADDRESS) {
        setDecimals(18);
        return;
      }

      const erc20 = new ethers.Contract(from.address, erc20Abi, provider);
      try {
        const decimals = await erc20.decimals();
        if (disposed) {
          return;
        }
        setDecimals(decimals);
      } catch (e) {}
    }

    run();
    return () => {
      disposed = true;
    };
  }, [from, web3]);

  useEffect(() => {
    if (!rubic) {
      return;
    }

    let disposed = false;
    async function run() {
      await sleep(50 / 1000);
      if (disposed) {
        return;
      }

      const newTrades = await rubic.instantTrades.calculateTrade(
        { blockchain: BLOCKCHAIN_NAME.FANTOM, address: from.address },
        amount,
        to.address,
      );

      if (disposed) {
        return;
      }
      newTrades.sort((a, b) => b.to.tokenAmount.comparedTo(a.to.tokenAmount));
      setTrades(newTrades);
    }
    setTrades([]);
    run();
    return () => {
      disposed = true;
    };
  }, [from, to, amount, rubic]);

  const [showConfirmation, setShowConfirmation] = useState<"hide" | "show" | "poor">("hide");
  const [showSelectFrom, setShowSelectFrom] = useState(false);
  const [showSelectTo, setShowSelectTo] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Confirmation
        show={showConfirmation}
        onClose={() => setShowConfirmation("hide")}
        from={from}
        to={to}
        trade={bestTrade}
      />
      <TokenSelect
        show={showSelectFrom}
        onClose={token => {
          setShowSelectFrom(false);
          if (token) {
            setFrom(token);
            setAmount("");
            amountRef.current?.select();
          }
        }}
      />
      <TokenSelect
        show={showSelectTo}
        onClose={token => {
          setShowSelectTo(false);
          if (token) {
            setTo(token);
          }
        }}
      />
      <div className="swap-view">
        <div className="input">
          <button className="token-select-button" onClick={() => setShowSelectFrom(true)}>
            <img src={from.logo} width="42" height="42" alt={from.name} />
            {from.symbol}
            <ChevronIcon width="10" height="10" />
          </button>
          <input
            ref={amountRef}
            placeholder="0.0"
            className="amount"
            type="number"
            value={amount}
            onChange={e => setAmount(e.currentTarget.value)}
          />
          <button
            className="max-balance"
            onClick={async () => setAmount(ethers.utils.formatUnits(await getBalance(), decimals))}
          >
            MAX
          </button>
        </div>
        <div className="swap">
          <button
            onClick={() => {
              setAmount(bestTrade?.to.tokenAmount.toString() ?? "");
              setFrom(to);
              setTo(from);
            }}
          >
            <ArrowDownIcon height="15" width="15" />
          </button>
        </div>
        <div className="input">
          <button className="token-select-button" onClick={() => setShowSelectTo(true)}>
            <img src={to.logo} width="42" height="42" alt={to.name} />
            {to.symbol}
            <ChevronIcon width="10" height="10" />
          </button>
          <div className="amount">{bestTrade ? prettyNumber(bestTrade.to.tokenAmount) : "—"}</div>
        </div>
        <TradeDetail trade={bestTrade} />
        {web3.connected ? (
          <button
            className="swap-button"
            onClick={async () => {
              setShowConfirmation("show");
              try {
                await bestTrade?.swap({
                  onConfirm: _hash => setShowConfirmation("hide"),
                });
              } catch (e) {
                if (e instanceof InsufficientFundsError) {
                  setShowConfirmation("poor");
                } else {
                  setShowConfirmation("hide");
                }
              }
            }}
            style={{ opacity: bestTrade ? 1 : 0.5, cursor: bestTrade ? "pointer" : "not-allowed" }}
            disabled={bestTrade == undefined}
          >
            Swap
          </button>
        ) : (
          <button
            className="swap-button"
            onClick={async () => {
              try {
                await web3.connect();
              } catch (e) {
                // Ignore "modal closed by user" exceptions.
              }
            }}
          >
            Connect wallet
          </button>
        )}
      </div>
    </>
  );
}

function prettyNumber(number: BigNumber): string {
  if (number.gte(1000)) {
    return number.toFormat(0);
  }
  if (number.gt(1)) {
    return number.toFormat(2);
  }

  // Since the number is less than 1, we need to decide how many decimals to display.
  // The strategy here is to always display a fixed amount of _meaningful_ decimal places.
  // A meaningful decimal place is a number that isn't zero.
  //
  // So, we'll render the string and then trim it past a certain point.

  const n = number.toFormat();
  const decimalIndex = n.indexOf(".");
  if (decimalIndex === -1) {
    return n;
  }

  let zeroDecimals = 0;
  for (let i = decimalIndex + 1; i < n.length; i += 1) {
    if (n[i] === "0") {
      zeroDecimals += 1;
    } else {
      break;
    }
  }
  const MEANINGFUL_DECIMAL_PLACES = 6;
  return n.substring(0, decimalIndex + zeroDecimals + 1 + MEANINGFUL_DECIMAL_PLACES);
}

interface TradeDetailProps {
  trade?: InstantTrade;
}
const TradeDetail: VFC<TradeDetailProps> = ({ trade }) => {
  return (
    <div className="trade-detail">
      <div className="detail">
        <div>Minimum received:</div>
        <div>{trade ? `${prettyNumber(trade.toTokenAmountMin.tokenAmount)} ${trade.to.symbol}` : "—"}</div>
      </div>
      <div className="detail">
        <div>Price:</div>
        <div>
          {trade ? (
            <div>
              1 {trade.to.symbol} = {prettyNumber(trade.to.price.dividedBy(trade.from.price))} {trade.from.symbol}
            </div>
          ) : (
            <div>&mdash;</div>
          )}
        </div>
      </div>
      <div className="detail">
        <div>Slippage:</div>
        <div>{trade ? `${trade.slippageTolerance * 100}%` : "—"}</div>
      </div>
    </div>
  );
};

interface TokenSelectProps {
  show: boolean;
  onClose: (selection?: Token) => void;
}
const TokenSelect: React.VFC<TokenSelectProps> = ({ show, onClose }) => {
  const [filter, setFilter] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const normalizedFilter = filter.trim().toLowerCase();
  const filteredTokens = tokens.filter(({ name, symbol }) => {
    const isNameMatch = name.toLowerCase().includes(normalizedFilter);
    const isSymbolMatch = symbol.toLowerCase().includes(normalizedFilter);
    return isNameMatch || isSymbolMatch;
  });
  useEffect(() => {
    if (!show) {
      return;
    }

    setFilter("");
    input.current?.focus();

    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("keydown", escape);
    };
  }, [show]);
  return (
    <div className="token-select-overlay" style={{ opacity: show ? 1 : 0, pointerEvents: show ? "unset" : "none" }}>
      <div className="token-select-background" onClick={() => onClose()} />
      <div className="token-select" style={{ transform: `translate(-50%, calc(-50% + ${show ? 0 : 30}px))` }}>
        <form
          onSubmit={e => {
            e.preventDefault();
            onClose(filteredTokens[0]);
          }}
        >
          <input
            ref={input}
            className="tokens-filter"
            placeholder="Search tokens"
            value={filter}
            onChange={e => setFilter(e.currentTarget.value)}
          />
        </form>
        <div className="tokens-list">
          {filteredTokens.map(token => (
            <div key={token.address} onClick={() => onClose(token)}>
              <img src={token.logo} width="24" height="24" />
              <div>{token.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ConfirmationProps {
  show: "hide" | "show" | "poor";
  onClose: (selection?: Token) => void;
  from: Token;
  to: Token;
  trade?: InstantTrade;
}
const Confirmation: React.VFC<ConfirmationProps> = ({ show, onClose, from, to, trade }) => {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!show) {
      return;
    }

    input.current?.focus();

    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("keydown", escape);
    };
  }, [show]);

  return (
    <div
      className="confirmation-overlay"
      style={{ opacity: show !== "hide" ? 1 : 0, pointerEvents: show !== "hide" ? "unset" : "none" }}
    >
      <div className="confirmation-background" onClick={() => onClose()} />
      <div
        className="confirmation"
        style={{ transform: `translate(-50%, calc(-50% + ${show !== "hide" ? 0 : 30}px))` }}
      >
        <div className="transaction">
          <div className="transaction-side">
            <div className="transaction-token">
              <img src={from.logo} width="16" height="16" />
              {from.symbol}
            </div>
            <div className="transaction-amount" style={{ color: show === "poor" ? "#e80625" : undefined }}>
              {trade ? prettyNumber(trade.from.tokenAmount) : "n/a"}
            </div>
          </div>
          <div className="transaction-direction">
            <ArrowDownIcon width="42" height="42" />
          </div>
          <div className="transaction-side">
            <div className="transaction-token">
              <img src={to.logo} width="16" height="16" />
              {to.symbol}
            </div>
            <div className="transaction-amount">{trade ? prettyNumber(trade.to.tokenAmount) : "n/a"}</div>
          </div>
        </div>
        {show === "poor" && <div className="poor-prompt">Your wallet doesn't have enough {from.symbol}</div>}
        {show === "show" && (
          <div className="confirmation-prompt">
            Confirm this transaction in {window.ethereum.isMetaMask ? "MetaMask" : "your wallet"}
          </div>
        )}
      </div>
    </div>
  );
};

export default Swap;
