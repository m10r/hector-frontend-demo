/* eslint-disable global-require */
import { Component } from "react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Web3ContextProvider } from "./hooks/web3Context";
import { Web3ChainProvider } from "./hooks/web3Chain";

import App from "./App";
import store from "./store";

export default class Root extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Web3ChainProvider>
        <Web3ContextProvider>
          <Provider store={store}>
            <BrowserRouter basename={"/#"}>
              <App />
            </BrowserRouter>
          </Provider>
        </Web3ContextProvider>
      </Web3ChainProvider>
    );
  }
}
