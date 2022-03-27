const path = require("path");
require('dotenv').config({ path: './.env' });
const HDWalletProvider = require('@truffle/hdwallet-provider');
const MetaMaskAccountIndex = 0;

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  networks: {
    develop: {
      host: "127.0.0.1",
      port: 7545,
      network_id: 5777,
    },
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(
          process.env.MNEMONIC,
          process.env.INFURA_KEY,
          MetaMaskAccountIndex
        );
      },
      network_id: 4,
      networkCheckTimeout: 1000000,
      timeoutBlocks: 200
    },
  },
  compilers: {
    solc: {
      version: '^0.8.0',
    },
  },
  plugins: ['truffle-plugin-verify'],
  api_keys: {
    etherscan: process.env.ETHERSCAN_KEY
  }
};
