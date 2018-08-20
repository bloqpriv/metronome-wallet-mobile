'use strict'

const debug = require('debug')('met-wallet:core:tokens')
const Web3 = require('web3')

const abi = require('./erc20-abi.json')

const tokens = []

function registerToken (address, meta) {
  debug('Registering token', address, meta)

  // TODO check address is checksum and ok

  if (!tokens.find(t => t.address.toLowerCase() === address.toLowerCase())) {
    tokens.push({ contractAddress: address, meta })
  }
}

function getTokenBalance (web3, contractAddress, address) {
  // TODO memoize contract creation
  const contract = new web3.eth.Contract(abi, contractAddress)

  return contract.methods.balanceOf(address).call()
}

function start ({ config, eventsBus, plugins }) {
  debug.enabled = config.debug

  const web3 = new Web3(plugins.wallet.web3Provider)

  function getTokenBalances (address) {
    tokens.forEach(function ({ contractAddress, meta: { symbol } }) {
      getTokenBalance(web3, contractAddress, address)
        .then(function (balance) {
          eventsBus.emit('wallet-state-changed', {
            // walletId is temporarily hardcoded
            1: {
              addresses: {
                [address]: {
                  token: {
                    [contractAddress]: {
                      symbol,
                      balance
                    }
                  }
                }
              }
            }
          })
        })
        .catch(function (err) {
          eventsBus.emit('wallet-error', {
            inner: err,
            message: `Could not get ${symbol} token balance`,
            meta: { plugin: 'wallet' }
          })
        })
    })
  }

  return {
    api: {
      getTokenBalances,
      registerToken
    },
    name: 'tokens'
  }
}

function stop () {}

module.exports = {
  start,
  stop
}