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

Create a new Dropil Chain wallet by calling the `generateWallet` function of dropjs.

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

Call the `getBalance` function to retrieve the balance of an address. By default, this function returns a `udrop` value (1000000 udrop = 1 DROP). Pass an optional second parameter of `true` to return the value represented in DROP.

``` js
// balance of drop1qs6a7ht3t2784dn9ee89nv262726v56hks3k5u is 123456789 udrop

// returns '123456789' udrop
let balanceUdrop = await drop.getBalance('drop1qs6a7ht3t2784dn9ee89nv262726v56hks3k5u')

// returns '123.456789' DROP
let balanceDrop = await drop.getBalance('drop1qs6a7ht3t2784dn9ee89nv262726v56hks3k5u', true)
```

### Send Drops

DropJS makes sending a DROP transaction easy. The `send` function creates a new send transaction, signs it offline using a provided mnemonic and then broadcasts it to the LCD API URL. Sensitive information is not revealed in this process.

``` js
// the following mnemonic was generated for the purpose of this example and does not contain a balance
let mnemonic = 'exit cross gate coconut knee border dial hat upset empower draft glide maple rain erode polar pyramid ketchup seat bone excess fault once length'

// the following example will send 1000000 udrop (1 DROP) from the provided mnemonic to the address shown
let sendResponse = await drop.send(mnemonic, 'drop1qs6a7ht3t2784dn9ee89nv262726v56hks3k5u', 1000000)
```

Optionally pass in `memo, accountNumber, sequence` after the amount parameter for advanced use. Both `accountNumber` and `sequence` must be provided when used (not just one). 

The response will be the LCD API response for the broadcasted transaction.

<aside class="notice">
Note: the send, delegate, and undelegate functions use the `sync` method of signing transactions which means it waits for a response from the node, but does not wait for the transaction to be committed to the chain.
</aside>

### Delegate and Undelegate Drops

Delegating and undelegating is as simple as sending Drops as shown above.

``` js
// the following mnemonic was generated for the purpose of this example and does not contain a balance
let mnemonic = 'exit cross gate coconut knee border dial hat upset empower draft glide maple rain erode polar pyramid ketchup seat bone excess fault once length'

// the following example will delegate 1000000 udrop (1 DROP) from the provided mnemonic to the validator address shown
let delegateResponse = await drop.delegate(mnemonic, 'dropvaloper1hrd9kwhdmd730dvxpv8r44kaq2zpmtc2gzquz9', 1000000)

// the following example will undelegate 1000000 udrop (1 DROP) from the validator address shown to the mnemonic provided
// undelegated Drops are locked for 21 days before they can be withdrawn
let undelegateResponse = await drop.undelegate(mnemonic, 'dropvaloper1hrd9kwhdmd730dvxpv8r44kaq2zpmtc2gzquz9', 1000000)
```

Optionally pass in `memo, accountNumber, sequence` after the amount parameter for advanced use. Both `accountNumber` and `sequence` must be provided when used (not just one).

## Advanced Use

Study `src/drop.js` to understand how this library works in order to expand into more advanced use cases. Feel free to fork this repository and create pull requests with additional useful features or for your own personal use.