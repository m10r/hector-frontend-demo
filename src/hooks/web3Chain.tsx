import React, { useState, ReactElement, useContext, useCallback, useEffect, useMemo } from "react";
import Web3Modal from "web3modal";
import { Web3Provider } from "@ethersproject/providers";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { IFrameEthereumProvider } from "@ledgerhq/iframe-provider";
import { Chain, CHAINS } from "src/helpers/Chains";
import { switchNetwork } from "src/helpers/SwitchNetwork";

export enum Web3Connection {
  Disconnected,
  ConnectedWrongChain,
  Connected,
}

type Web3ChainStatus =
  | {
      connection: Web3Connection.Connected;
      chain: Chain;
      address: string;
      provider: Web3Provider;
    }
  | {
      connection: Web3Connection.ConnectedWrongChain;
      switchChain: () => Promise<void>;
      chain: Chain;
    }
  | {
      connection: Web3Connection.Disconnected;
      connect: () => Promise<void>;
    };

interface ContextProps {
  connected?: Chain;
  address?: string;
  connect: () => Promise<void>;
  provider?: Web3Provider;
  web3Modal: Web3Modal;
}
const Web3Chain = React.createContext<ContextProps>(undefined);
export function useWeb3Chain(want: Chain): Web3ChainStatus {
  const { connected, address, connect, provider, web3Modal } = useContext(Web3Chain);

  useEffect(() => {
    // Always run connect() on application start.
    if (web3Modal?.cachedProvider) {
      connect();
    }
  }, []);

  return useMemo(() => {
    if (!connected) {
      return { connection: Web3Connection.Disconnected, connect };
    }

    if (connected.chainId !== want.chainId) {
      return {
        connection: Web3Connection.ConnectedWrongChain,
        chain: connected,
        switchChain: async () => switchNetwork(want),
      };
    }

    return { connection: Web3Connection.Connected, chain: connected, address, provider };
  }, [connected, address, connect, want, provider]);
}

export const Web3ChainProvider: React.FC<{ children: ReactElement }> = ({ children }) => {
  const [chain, setChain] = useState<Chain>();
  const [address, setAddress] = useState<string>();
  const [provider, setProvider] = useState<Web3Provider>(undefined);

  const [web3Modal, setWeb3Modal] = useState<Web3Modal>(
    new Web3Modal({
      cacheProvider: true, // optional
      providerOptions: {
        walletconnect: {
          package: WalletConnectProvider,
          options: {
            rpc: Object.fromEntries(CHAINS.map(c => [c.chainId, c.rpc[0]])),
            qrcode: true,
            qrcodeModalOptions: {
              mobileLinks: ["metamask", "trust"],
            },
          },
        },
      },
    }),
  );

  const connect = useCallback(async () => {
    let externalProvider;
    if (window.location !== window.parent.location) {
      // Ledger Live
      externalProvider = new IFrameEthereumProvider();
    } else {
      try {
        externalProvider = await web3Modal.connect();
      } catch (e) {
        console.error("wallet isn't logged in");
      }
    }

    if (!externalProvider) {
      return;
    }

    externalProvider.on("accountsChanged", async (accounts: string[]) => {
      location.reload();
    });

    externalProvider.on("chainChanged", async (chain: number) => {
      location.reload();
    });

    externalProvider.on("network", (_newNetwork: any, oldNetwork: any) => {
      location.reload();
    });
    const connectedProvider = new Web3Provider(externalProvider, "any");
    setProvider(connectedProvider);
  }, [web3Modal]);

  useEffect(() => {
    if (provider == undefined) {
      setChain(undefined);
      setAddress(undefined);
      return;
    }

    let isCanceled = false;
    (async function () {
      const chainId = await provider.getNetwork().then(network => network.chainId);
      const chain = CHAINS.find(c => c.chainId === chainId);
      const address = await provider.getSigner().getAddress();

      if (isCanceled) {
        return;
      }

      setChain(chain);
      setAddress(address);
    })();

    return () => {
      isCanceled = true;
    };
  }, [provider]);

  return (
    <Web3Chain.Provider value={{ connected: chain, connect, address, provider, web3Modal }}>
      {children}
    </Web3Chain.Provider>
  );
};
