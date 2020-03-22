const fetch = require('node-fetch').default
const bip39 = require('bip39')
const bip32 = require('bip32')
const bech32 = require('bech32')
const secp256k1 = require('secp256k1')
const crypto = require('crypto')
const bitcoinjs = require('bitcoinjs-lib')
const CryptoJS = require("crypto-js")

const DEFAULT_MSG_TYPES = {
  MSG_SEND: 'cosmos-sdk/MsgSend',
  MSG_MULTI_SEND: 'cosmos-sdk/MsgMultiSend',
  MSG_CREATE_VALIDATOR: 'cosmos-sdk/MsgCreateValidator',
  MSG_EDIT_VALIDATOR: 'cosmos-sdk/MsgEditValidator',
  MSG_DELEGATE: 'cosmos-sdk/MsgDelegate',
  MSG_UNDELEGATE: 'cosmos-sdk/MsgUndelegate',
  MSG_BEGIN_REDELEGATE: 'cosmos-sdk/MsgBeginRedelegate',
  MSG_WITHDRAW_DELEGATION_REWARD: 'cosmos-sdk/MsgWithdrawDelegationReward',
  MSG_WITHDRAW_VALIDATOR_COMMISSION: 'cosmos-sdk/MsgWithdrawValidatorCommission',
  MSG_MODIFY_WITHDRAW_ADDRESS: 'cosmos-sdk/MsgModifyWithdrawAddress',
  MSG_SUBMIT_PROPOSAL: 'cosmos-sdk/MsgSubmitProposal',
  MSG_DEPOSIT: 'cosmos-sdk/MsgDeposit',
  MSG_VOTE: 'cosmos-sdk/MsgVote',
  MSG_UNJAIL: 'cosmos-sdk/MsgUnjail'
}

const MSG_TYPE = {
  'dropilchain-testnet': { ...DEFAULT_MSG_TYPES },
  'cosmoshub-3': { ...DEFAULT_MSG_TYPES }
}

/** creates a Drop instance to utilize functions on a Cosmos-SDK based blockchain */
let Drop = function(params) {  
  this.chainId = params.chainId
  this.url = params.lcdUrl
	this.hdPath = params.hdPath
  this.bech32Prefix = params.bech32Prefix
  this.denom = params.denom
  this.powerReduction = params.powerReduction
  this.baseFee = params.baseFee
  this.baseGas = params.baseGas
}

const START_PARAMS_MODEL = {
  chainId: 'String', // ex: "dropilchain-testnet"
  lcdUrl: 'String', // ex: "https://testnet-api.dropilchain.com"
  hdPath: 'String', // ex: "m/44'/118'/0'/0/0"
  bech32Prefix: 'String', // ex: "drop"
  denom: 'String', // ex: "udrop"
  powerReduction: 'int', // ex: 1000000
  baseFee: 'String', // ex: "1000000" expressed in denom
  baseGas: 'String', // ex: "200000"
}

/** returns a new Drop instance to utilize functions on designated params.chainId */
function start(params) {
  if (!params.chainId) throw new Error('param "chainId" missing')
  if (!params.lcdUrl) throw new Error('param "lcdUrl" missing')
  if (!params.hdPath) throw new Error('param "hdPath" missing')
  if (!params.bech32Prefix) throw new Error('param "bech32Prefix" missing')
  if (!params.denom) throw new Error('param "denom" missing')
  if (!params.powerReduction) throw new Error('param "powerReduction" missing')
  if (!params.baseFee) throw new Error('param "baseFee" missing')
  if (!params.baseGas) throw new Error('param "baseGas" missing')  

  return new Drop(params)
}

function convertStringToBytes(str) {
  if (typeof str !== "string") throw new Error("str expects a string")
  	  
	var myBuffer = []
	var buffer = Buffer.from(str, 'utf8')
	for (var i = 0; i < buffer.length; i++) {
	    myBuffer.push(buffer[i])
  }
  
	return myBuffer
}

function getPubKeyBase64(privateKey) {
	const pubKeyByte = secp256k1.publicKeyCreate(privateKey)
	return Buffer.from(pubKeyByte, 'binary').toString('base64')
}

function sortObject(obj) {
	if (obj === null) return null
	if (typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(sortObject)
  
	const sortedKeys = Object.keys(obj).sort()
	const result = {}
	sortedKeys.forEach(key => {
		result[key] = sortObject(obj[key])
  })
  
	return result
}

/** generates a random mnemonic for use in wallet generation */
function generateMnemonic() {
  let randomBytes = Buffer.from(CryptoJS.lib.WordArray.random(32).toString(), `hex`)
  if (randomBytes.length !== 32) throw Error(`Entropy has incorrect length`)
  
  return bip39.entropyToMnemonic(randomBytes.toString(`hex`))
}

/** generates a new wallet and returns { address, mnemonic } */
Drop.prototype.generateWallet = async function() {
  let mnemonic = generateMnemonic()
  let seed = await bip39.mnemonicToSeed(mnemonic)
  let bipInterface = bip32.fromSeed(seed)
  let bipPath = bipInterface.derivePath(this.hdPath)
  let words = bech32.toWords(bipPath.identifier)
  let address = bech32.encode(this.bech32Prefix, words)
  return { address, mnemonic }
}

/** returns response from LCD API (this.url) on /auth/accounts/{address} endpoint */
Drop.prototype.getAccount = async function(address) {
  const response = await fetch(this.url + "/auth/accounts/" + address)
  return await response.json()
}

/** returns { accountNumber, sequence } for provided mnemonic */
Drop.prototype.getAccountData = async function(mnemonic = null, address = null) {
  if (!mnemonic && !address) throw new Error('either mnemonic or address must be provided')
  
  // get address via mnemonic if not already provided
  if (!address) address = await this.getAddress(mnemonic)

  let account = await this.getAccount(address)

  return { 
    accountNumber: String(account.result.value.account_number), 
    sequence: String(account.result.value.sequence) 
  }
}

/** returns String(accountNumber) from provided mnemonic */
Drop.prototype.getAccountNumber = async function(mnemonic = null, address = null) {
  if (!mnemonic && !address) throw new Error('either mnemonic or address must be provided')
  
  // get address via mnemonic if not already provided
  if (!address) address = await this.getAddress(mnemonic)

  let account = await this.getAccount(address)

  return account.result.value.account_number
}

/** returns String(sequence) from provided mnemonic */
Drop.prototype.getAccountSequence = async function(mnemonic = null, address = null) {
  if (!mnemonic && !address) throw new Error('either mnemonic or address must be provided')
  
  // get address via mnemonic if not already provided
  if (!address) address = await this.getAddress(mnemonic)

  let account = await this.getAccount(address)
  
  return account.result.value.sequence
}

/** returns { address, privateKey } based on provided mnemonic */
Drop.prototype.getKeys = async function(mnemonic) {
  if (typeof mnemonic !== "string") throw new Error("mnemonic expects a string")
  if (mnemonic.split(' ').length !== 24) throw new Error('incorrect mnemonic length, must be 24 words')

	const seed = await bip39.mnemonicToSeed(mnemonic)
	const bipInterface = bip32.fromSeed(seed)
	const bipPath = bipInterface.derivePath(this.hdPath)
  
  // address
  const words = bech32.toWords(bipPath.identifier)
  const address = bech32.encode(this.bech32Prefix, words)

  // private key
  const ecpair = bitcoinjs.ECPair.fromPrivateKey(bipPath.privateKey, { compressed : false })
  const privateKey = ecpair.privateKey  

  return { address, privateKey }
}

/** returns address for provided mnemonic */
Drop.prototype.getAddress = async function(mnemonic) {
  if (typeof mnemonic !== "string") throw new Error("mnemonic expects a string")
  if (mnemonic.split(' ').length !== 24) throw new Error('incorrect mnemonic length, must be 24 words')

	const seed = await bip39.mnemonicToSeed(mnemonic)
	const bipInterface = bip32.fromSeed(seed)
	const bipPath = bipInterface.derivePath(this.hdPath)
  const words = bech32.toWords(bipPath.identifier)
  const address = bech32.encode(this.bech32Prefix, words)

	return address
}

/** returns privateKey for provided mnemonic */
Drop.prototype.getPrivateKey = async function(mnemonic) {
  if (typeof mnemonic !== "string") throw new Error("mnemonic expects a string")
  if (mnemonic.split(' ').length !== 24) throw new Error('incorrect mnemonic length, must be 24 words')

	const seed = await bip39.mnemonicToSeed(mnemonic)
	const bipInterface = bip32.fromSeed(seed)
	const bipPath = bipInterface.derivePath(this.hdPath)
  const ecpair = bitcoinjs.ECPair.fromPrivateKey(bipPath.privateKey, { compressed : false })
  
	return ecpair.privateKey
}

/** returns denom balance of provided address; set convert to true to return params.powerReduction format */
Drop.prototype.getAvailableBalance = async function(address, convert = false) {
  let data = await this.getAccount(address)

  // return 0 if error or denom does not exist
  if (!data.result || !data.result.value.coins.length || 
    !data.result.value.coins.filter(c => c.denom === this.denom).length) return '0'

  let balance = data.result.value.coins.filter(c => c.denom === this.denom)[0].amount

  return convert ? String(parseFloat(balance) / powerReduction) : balance
}

/** returns a stdMsg based on the input json */
function newStdMsg(input) {
	return {
    json: input,
    bytes: convertStringToBytes(JSON.stringify(sortObject(input)))
  }
}

Drop.prototype.buildStdMsg = function(type, valueParams, accountNumber, sequence, memo = '', fee = null, gas = null) {
  if (!fee) fee = this.baseFee
  if (!gas) gas = this.baseGas

  return newStdMsg({
    msgs: [
      {
        type,
        value: { ...valueParams }
      }
    ],
    chain_id: this.chainId,
    fee: { amount: [ { amount: String(fee), denom: this.denom } ], gas: String(gas) },
    memo,
    account_number: String(accountNumber),
    sequence: String(sequence)
  })
}

Drop.prototype.buildMultiMsg = function(msgs, accountNumber, sequence, memo = '', fee = null, gas = null) {
  if (!fee) fee = this.baseFee
  if (!gas) gas = this.baseGas

  return newStdMsg({
    msgs,
    chain_id: this.chainId,
    fee: { amount: [ { amount: String(fee), denom: this.denom } ], gas: String(gas) },
    memo,
    account_number: String(accountNumber),
    sequence: String(sequence)
  })
}

/** signs a transaction offline using provided privateKey */
function sign(stdMsg, privateKey, modeType = "sync") {
  // Mode types: 
  // "block" (return after tx commit)
  // "sync" (return afer CheckTx)
  // "async" (return right away)

	let signMessage = stdMsg.json
	
	const hash = crypto.createHash('sha256').update(JSON.stringify(sortObject(signMessage))).digest('hex')
	const buf = Buffer.from(hash, 'hex')
	let signObj = secp256k1.ecdsaSign(buf, privateKey)
  let signatureBase64 = Buffer.from(signObj.signature, 'binary').toString('base64')  
  
  return {
    "tx": {
        "msg": stdMsg.json.msgs,
        "fee": stdMsg.json.fee,
        "signatures": [
            {
                "signature": signatureBase64,
                "pub_key": {
                    "type": "tendermint/PubKeySecp256k1",
                    "value": getPubKeyBase64(privateKey)
                }
            }
        ],
        "memo": stdMsg.json.memo
    },
    "mode": modeType
  }
}

/** broadcasts signed transaction to LCD API (this.url) */
Drop.prototype.broadcast = async function(signedTx) {
	const response = await fetch(this.url + "/txs", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(signedTx)
  })

  return await response.json()
}

// this model shows the potential keys and their expected types inside the params for all of the available transactions
// note: not all of these parameters will be used for each transaction
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

  // sets the account number and sequence for the transaction; transactions must be submitted to the network in order by sequence; by default, these are obtained via /auth/accounts/{address} API endpoint before signing each transaction
  // **special note: if one is provided, BOTH accountNumber and sequence must be provided together, not just one
  accountNumber: 'String || Number',  // default: obtained via /auth/accounts/{address} API endpoint
  sequence: 'String || Number', // default: obtained via /auth/accounts/{address} API endpoint

  // dictates whether transaction gets broadcasted or returns signedTx instead for later use  
  broadcast: 'Boolean', // default: true

  // sets a custom fee on the transaction
  fee: 'String || Number', // default: set in .start() params || 1000000 (1 DROP)

  // sets custom gas limit on transaction
  gas: 'String || Number', // default: set in .start() params || 200000

  // sets the mode of the transaction when broadcasted; possible values are 'block' which waits until the transaction is included in a block, 'sync' which waits for the response from the node, 'async' which returns immediately without waiting for a response
  mode: 'String' // default: 'sync'
}

// this model contains the default values for the required parameters of each transaction
const PARAMS_DEFAULTS = {
  memo: '',
  broadcast: true,  
  mode: 'sync'
}

/** merges default params with provided params and then adds any missing params */
Drop.prototype.buildParams = async function(params) {
  params = { ...PARAMS_DEFAULTS, ...params }
  if (!params.address || !params.privateKey) params = { ...params, ...(await this.getKeys(params.mnemonic)) }
  if (!params.accountNumber || !params.sequence) params = { ...params, ...(await this.getAccountData(params.mnemonic)) }

  return params
}

/** 
 * creates a send transaction & signs offline using provided mnemonic and then 
 * broadcasts to LCD API (this.url);
 * optionally pass in accountNumber and sequence for manual override;
 * optionally pass false into broadcast param to return the signedTx and NOT broadcast
 */
Drop.prototype.send = async function(params) {
  params = await this.buildParams(params)

  let valueParams = {
    amount: [
      {
        amount: String(params.amount),
        denom: this.denom
      }
    ],
    from_address: params.address,
    to_address: params.destination
  }

  let stdMsg = this.buildStdMsg(MSG_TYPE[this.chainId].MSG_SEND, valueParams, params.accountNumber, params.sequence, params.memo, params.fee, params.gas)
  const signedTx = sign(stdMsg, params.privateKey, params.mode)
    
  return params.broadcast ? await this.broadcast(signedTx) : signedTx
}

/** 
 * creates a delegate transaction & signs offline using provided mnemonic and then 
 * broadcasts to LCD API (this.url);
 * optionally pass in accountNumber and sequence for manual override;
 * optionally pass false into broadcast param to return the signedTx and NOT broadcast
 */
Drop.prototype.delegate = async function(params) {
  params = await this.buildParams(params)
  
  let valueParams = {
    amount: {
      amount: String(params.amount),
      denom: this.denom
    },
    delegator_address: params.address,
    validator_address: params.validatorAddress
  }

  let stdMsg = this.buildStdMsg(MSG_TYPE[this.chainId].MSG_DELEGATE, valueParams, params.accountNumber, params.sequence, params.memo, params.fee, params.gas)
  const signedTx = sign(stdMsg, params.privateKey, params.mode)

  return params.broadcast ? await this.broadcast(signedTx) : signedTx
}

/** 
 * creates an undelegate transaction & signs offline using provided mnemonic and then 
 * broadcasts to LCD API (this.url);
 * optionally pass in accountNumber and sequence for manual override;
 * optionally pass false into broadcast param to return the signedTx and NOT broadcast
 */
Drop.prototype.undelegate = async function(params) {
  params = await this.buildParams(params)
  
  let valueParams = {
    amount: {
      amount: String(params.amount),
      denom: this.denom
    },
    delegator_address: params.address,
    validator_address: params.validatorAddress
  }

  let stdMsg = this.buildStdMsg(MSG_TYPE[this.chainId].MSG_UNDELEGATE, valueParams, params.accountNumber, params.sequence, params.memo, params.fee, params.gas)
  const signedTx = sign(stdMsg, params.privateKey, params.mode)

  return params.broadcast ? await this.broadcast(signedTx) : signedTx
}

/** 
 * creates a redelegate transaction & signs offline using provided mnemonic and then 
 * broadcasts to LCD API (this.url);
 * optionally pass in accountNumber and sequence for manual override;
 * optionally pass false into broadcast param to return the signedTx and NOT broadcast
 */
Drop.prototype.redelegate = async function(params) {
  params = await this.buildParams(params)
  
  let valueParams = {
    amount: {
      amount: String(params.amount),
      denom: this.denom
    },
    delegator_address: params.address,
    validator_src_address: params.validatorSourceAddress,
    validator_dst_address: params.validatorDestAddress
  }

  let stdMsg = this.buildStdMsg(MSG_TYPE[this.chainId].MSG_BEGIN_REDELEGATE, valueParams, params.accountNumber, params.sequence, params.memo, params.fee === PARAMS_DEFAULTS.fee ? '2000000' : params.fee, params.gas === PARAMS_DEFAULTS.gas ? '300000' : params.gas)
  const signedTx = sign(stdMsg, params.privateKey, params.mode)

  return params.broadcast ? await this.broadcast(signedTx) : signedTx
}

Drop.prototype.withdrawRewards = async function(params) {
  params = await this.buildParams(params)
  
  const response = await fetch(this.url + `/distribution/delegators/${params.address}/rewards`)
  const rewards = await response.json()

  if (!rewards.result.rewards.length) throw new Error('no rewards to withdraw')

  let msgs = rewards.result.rewards.map(r => {
    return {
      type: MSG_TYPE[this.chainId].MSG_WITHDRAW_DELEGATION_REWARD, 
      value: { 
        delegator_address: params.address, 
        validator_address: r.validator_address
      }
    }
  })

  let stdMsg = this.buildMultiMsg(msgs, params.accountNumber, params.sequence, params.memo, params.fee, params.gas)
  const signedTx = sign(stdMsg, params.privateKey, params.mode)

  return params.broadcast ? await this.broadcast(signedTx) : signedTx
}

Drop.prototype.modifyWithdrawAddress = async function(params) {
  params = await this.buildParams(params)
  
  let valueParams = {    
    delegator_address: params.address,
    withdraw_address: params.withdrawAddress
  }

  let stdMsg = this.buildStdMsg(MSG_TYPE[this.chainId].MSG_MODIFY_WITHDRAW_ADDRESS, valueParams, params.accountNumber, params.sequence, params.memo, params.fee, params.gas)
  const signedTx = sign(stdMsg, params.privateKey, params.mode)

  return params.broadcast ? await this.broadcast(signedTx) : signedTx
}

// only export the start and generateMnemonic functions because all other
// functions should be invoked using the variable created when calling dropjs.start()
module.exports = {
  start,
  generateMnemonic  
}