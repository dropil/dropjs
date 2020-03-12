# DropJS - Dropil Chain JavaScript Library

An open source JavaScript library for use with Dropil Chain.

The DropJS library offers the ability to create wallets, create transactions, sign transactions offline, and broadcast
transactions to a desired RPC URL.

## Installation

### NPM

```
npm install @dropilcoin/dropjs
```

### Yarn

```
yarn add @dropilcoin/dropjs
```

## Import

### NodeJS

Import dropjs in NodeJS by placing the following line at the top of your JS file.
``` js
const dropjs = require("@dropilcoin/dropjs");
```

### Browser

Import dropjs into a web page by placing the following JS script in the `<head>` of your document.
``` html
<script src='..path to drop.js'></script>
```

## Using DropJS - Basic Use

Before starting, ensure you have imported the dropjs library (see above).

If you are unfamiliar with any of the terminology or about how Dropil Chain functions in general, refer to the [Dropil Chain Documentation](https://docs.dropilchain.com/info)

### Create a dropjs instance

Create a new Drop instance by calling the `start` function of dropjs. **The `drop` variable will be referred to throughout this documentation.** Pass in a valid LCD API URL and chainId as parameters. You can pass in `http://localhost:1317` or whatever LCD URL you setup if you are running a full node on your local machine. If you omit these parameters, they will default to the values shown below. The Dropil Chain mainnet chain-id is `Dropil-Chain-Thor`.

``` js
let drop = dropjs.start(lcdUrl, chainId)
// for example dropjs.start('https://api-dropilchain.com', 'Dropil-Chain-Thor')
```

### Create new wallet

Create a new Dropil Chain wallet by calling the async `generateWallet` function of dropjs.

``` js
let wallet = await dropjs.generateWallet()
```

Returns:
``` json
{
  "address": "String",
  "mnemonic": "String"
}
```

Alternatively, if you only want to generate a mnemonic and do not care about the address, you can call `generateMnemonic` which returns a mnemonic as a `String`.

``` js
let mnemonic = dropjs.generateMnemonic()
```

### Get balance of address

Call the async `getAvailableBalance` function to retrieve the **available** balance of an address. By default, this function returns a `udrop` value (1000000 udrop = 1 DROP). Pass an optional second parameter of `true` to return the value represented in DROP.

``` js
// balance of drop1qs6a7ht3t2784dn9ee89nv262726v56hks3k5u is 123456789 udrop

// returns '123456789' udrop
let balanceUdrop = await drop.getAvailableBalance('drop1qs6a7ht3t2784dn9ee89nv262726v56hks3k5u')

// returns '123.456789' DROP
let balanceDrop = await drop.getAvailableBalance('drop1qs6a7ht3t2784dn9ee89nv262726v56hks3k5u', true)
```

## Transactions

This section will outline how to send transactions using DropJS. The current supported transaction types are `send`, `delegate`, `undelegate`, `redelegate`, `withdrawRewards`, and `modifyWithdrawAddress`.

### The Params Object

All transactions accept a single argument that is the `params` object. Each transaction requires different parameters in addition to many optional parameters. The `params` object is used to make each of the transactions as dynamic as possible for the end user.

Here is a model of the `params` object with all the potential parameters in a given transaction.
``` js
const PARAMS_MODEL = {
  // required for all transactions
  mnemonic: 'String',

  // required for send transaction
  destination: 'String',

  // required for delegate and undelegate transactions
  validatorAddress: 'String',

  // required for redelegate transaction
  validatorSourceAddress: 'String',
  validatorDestAddress: 'String',

  // required for withdrawRewards transaction
  withdrawAddress: 'String',

  // required for send, delegate, undelegate, and redelegate transactions
  amount: 'String || Number',
  
  // ==== optional parameters below ====

  // adds a memo to any transaction  
  memo: 'String', // default: ''

  // sets the account number and sequence for the transaction; transactions must be 
  // submitted to the network in order by sequence; by default, these are obtained via 
  // the /auth/accounts/{address} API endpoint before signing each transaction
  // **special note: if one is provided, BOTH accountNumber and sequence must be provided 
  // together, not just one
  accountNumber: 'String || Number',  
  sequence: 'String || Number',

  // dictates whether transaction gets broadcasted or returns signedTx instead for later use  
  broadcast: 'Boolean', // default: true

  // sets a custom fee on the transaction
  fee: 'String || Number', // default: 1000000 (1 DROP)

  // sets custom gas limit on transaction
  gas: 'String || Number', // default: 200000
  
  // sets the mode of the transaction when broadcasted; possible values are 'block' which 
  // waits until the transaction is included in a block, 'sync' which waits for the response 
  // from the node, 'async' which returns immediately without waiting for a response
  mode: 'String' // default: 'sync'
}
```

### Send Drops

DropJS makes sending a DROP transaction easy. The `send` function creates a new send transaction, signs it offline using a provided mnemonic and then broadcasts it to the LCD API URL. Sensitive information is not revealed in this process.

``` js
// the following mnemonic was generated for the purpose of this example and does not contain a balance
let mnemonic = 'exit cross gate coconut knee border dial hat upset empower draft glide maple rain erode polar pyramid ketchup seat bone excess fault once length'

// the following example will send 1000000 udrop (1 DROP) from the provided mnemonic to the address shown

let params = {
  mnemonic,
  destination: 'drop1qs6a7ht3t2784dn9ee89nv262726v56hks3k5u',
  amount: 1000000
}

let response = await drop.send(params)
```

Refer to the [Params Object](#the-params-object) for more advanced use.

### Delegate Undelegate, and Redelegate Drops

Below are examples for each of the `delegate`, `undelegate`, and `redelegate` transactions.

``` js
// the following mnemonic was generated for the purpose of this example and does not contain a balance
let mnemonic = 'exit cross gate coconut knee border dial hat upset empower draft glide maple rain erode polar pyramid ketchup seat bone excess fault once length'

// the following example will delegate 1000000 udrop (1 DROP) from the provided mnemonic to the validator address shown

let delegateParams = {
  mnemonic,
  validatorAddress: 'dropvaloper1hrd9kwhdmd730dvxpv8r44kaq2zpmtc2gzquz9',
  amount: 1000000
}

let delegateResponse = await drop.delegate(delegateParams)

// the following example will undelegate 1000000 udrop (1 DROP) from the validator address shown to the mnemonic provided
// undelegated Drops are locked for 21 days before they can be withdrawn

let undelegateParams = {
  mnemonic,
  validatorAddress: 'dropvaloper1hrd9kwhdmd730dvxpv8r44kaq2zpmtc2gzquz9',
  amount: 1000000
}

let undelegateResponse = await drop.undelegate(undelegateParams)

// the following example will redelegate 1000000 udrop (1 DROP) from the source validator address to the destination validator address
// redelegated Drops are not locked for 21 days and are immediately transferrable

let redelegateParams = {
  mnemonic,
  validatorSourceAddress: 'dropvaloper1hrd9kwhdmd730dvxpv8r44kaq2zpmtc2gzquz9',
  validatorDestAddress: 'dropvaloper18w3regg6gd9wwmz582x9znmt5jqdydltjtleah',
  amount: 1000000
}

let redelegateResponse = await drop.redelegate(redelegateParams)
```

Refer to the [Params Object](#the-params-object) for more advanced use.

### Withdraw Rewards

Rewards from delegating/staking are not automatically paid to the delegators address. The `withdrawRewards` function allows you to withdraw any unclaimed rewards from delegating Drops to a validator. 

``` js
// the following mnemonic was generated for the purpose of this example and does not contain a balance
let mnemonic = 'exit cross gate coconut knee border dial hat upset empower draft glide maple rain erode polar pyramid ketchup seat bone excess fault once length'

let response = await drop.withdrawRewards({ mnemonic })
```

Refer to the [Params Object](#the-params-object) for more advanced use.

### Modify Withdraw Address

You may modify the withdraw address that rewards are sent to when calling the `withdrawRewards` function using the `modifyWithdrawAddress` function. By default, the address is the address associated with your mnemonic.

``` js
let mnemonic = 'exit cross gate coconut knee border dial hat upset empower draft glide maple rain erode polar pyramid ketchup seat bone excess fault once length'

let params = {
  mnemonic,
  withdrawAddress: 'drop18w3regg6gd9wwmz582x9znmt5jqdydltjhh8cf'
}

let redelegateResponse = await drop.redelegate(params)
```

Refer to the [Params Object](#the-params-object) for more advanced use.

## Advanced Use

Study `src/drop.js` to understand how this library works in order to expand into more advanced use cases. Feel free to fork this repository and/or create pull requests with additional useful features or for your own personal use.