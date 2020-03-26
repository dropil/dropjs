# DropJS - Dropil Chain JavaScript Library

An open source JavaScript library for use with Dropil Chain or ***any*** other Cosmos-SDK based chain.

The DropJS library offers the ability to create wallets, create transactions, sign transactions offline, and broadcast transactions to a desired LCD URL for any Cosmos-SDK based chain.

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
const dropjs = require("@dropilcoin/dropjs")
```

### Browser

Import dropjs into a web page by placing the following JS script in the `<head>` of your document.
``` html
<script src='..path to drop.js'></script>
```

## Using DropJS - Basic Use

Before starting, ensure you have imported the dropjs library (see above).

If you are unfamiliar with any of the terminology or about how Dropil Chain functions in general, refer to the [Dropil Chain Documentation](https://docs.dropilchain.com/info)

### Create a `Drop` instance

Create a new Drop instance by calling the `start` function of dropjs. **The `drop` variable will be referred to throughout this documentation.** Pass in a params object with valid parameters as outlined below.

``` js
const dropjs = require("@dropilcoin/dropjs")

let startParams = {
  chainId: 'Dropil-Chain-Poseidon', // String
  lcdUrl: 'https://testnet-api.dropilchain.com', // String
  hdPath: "m/44'/495'/0'/0/0", // String
  bech32Prefix: 'drop', // String
  denom: 'udrop', // String
  powerReduction: 1000000, // int
  baseFee: '10000', // String
  baseGas: '200000', // String
}

let drop = dropjs.start(startParams)
```

### Generate Mnemonic Phrase

Create a new mnemonic phrase by calling the `generateMnemonic` function of dropjs.

``` js
const dropjs = require("@dropilcoin/dropjs");
let wallet = dropjs.generateMnemonic()
```

Returns a 24-word mnemonic phrase as a `String`.

### Create New Wallet

Create a new wallet using the initialized bech32Prefix by calling the async `generateWallet` function.

``` js
const dropjs = require("@dropilcoin/dropjs")
let drop = dropjs.start(startParams)
let wallet = await drop.generateWallet()
```

Returns:

``` json
{
  "address": "String",
  "mnemonic": "String"
}
```

::: warning
The remaining examples in these docs will not import dropjs or call the `start` method of dropjs.
:::

### Get Balance of Address

Call the async `getAvailableBalance` function to retrieve the **available** balance of an address. By default, this function returns a `denom` (i.e. udrop or uatom) value. Pass an optional second parameter of `true` to return the value represented in the coin value instead of the denom value.

``` js
// example balance of drop1qs6a7ht3t2784dn9ee89nv262726v56hks3k5u is 123456789 udrop and the powerReduction of DROP is 1000000

// returns '123456789' udrop
let balanceUdrop = await drop.getAvailableBalance('drop1qs6a7ht3t2784dn9ee89nv262726v56hks3k5u')

// returns '123.456789' DROP
let balanceDrop = await drop.getAvailableBalance('drop1qs6a7ht3t2784dn9ee89nv262726v56hks3k5u', true)
```

## Transactions

This section will outline how to send transactions using DropJS. The current supported transaction types are `send`, `delegate`, `undelegate`, `redelegate`, `withdrawRewards`, and `modifyWithdrawAddress`, `submitProposal`, `vote`.

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

  // required for modifyWithdrawAddress transaction
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

  // sets a custom fee in `udrop` on the transaction
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

You may modify the withdraw address that rewards are sent to when calling the `withdrawRewards` function by using the `modifyWithdrawAddress` function. By default, the address is the address associated with your mnemonic.

``` js
// the following mnemonic was generated for the purpose of this example and does not contain a balance
let mnemonic = 'exit cross gate coconut knee border dial hat upset empower draft glide maple rain erode polar pyramid ketchup seat bone excess fault once length'

let params = {
  mnemonic,
  withdrawAddress: 'drop18w3regg6gd9wwmz582x9znmt5jqdydltjhh8cf'
}

let response = await drop.modifyWithdrawAddress(params)
```

Refer to the [Params Object](#the-params-object) for more advanced use.

### Submit Proposal

You may submit a proposal using the `submitProposal` function. Proposals submitted are `Text` proposals and require a title, description, and an initial deposit amount. Proposals require a minimum deposit amount to be considered valid proposals. Read about this in the respective chain docs.

``` js
// the following mnemonic was generated for the purpose of this example and does not contain a balance
let mnemonic = 'exit cross gate coconut knee border dial hat upset empower draft glide maple rain erode polar pyramid ketchup seat bone excess fault once length'

let params = {
  mnemonic,
  title: 'Example Proposal Title',
  description: 'Example Proposal Description', // use "\n" to depict linebreaks
  amount: 30000000000 // this is the initial deposit made to the proposal
}

let response = await drop.submitProposal(params)
```

Refer to the [Params Object](#the-params-object) for more advanced use.

### Vote on Proposal

Vote on a proposal that is currently in the voting period by using the `vote` function.

``` js
// the following mnemonic was generated for the purpose of this example and does not contain a balance
let mnemonic = 'exit cross gate coconut knee border dial hat upset empower draft glide maple rain erode polar pyramid ketchup seat bone excess fault once length'

let params = {
  mnemonic,
  proposal_id: '1',
  option: 'Yes' // Options are 'Yes', 'No', 'NoWithVeto', 'Abstain'  
}

let response = await drop.vote(params)
```

## Advanced Use

Study `src/drop.js` to understand how this library works in order to expand into more advanced use cases. Feel free to fork this repository and/or create pull requests with additional useful features or for your own personal use.
