const fetch = require('node-fetch').default
const bip39 = require('bip39')
const bip32 = require('bip32')
const bech32 = require('bech32')
const secp256k1 = require('secp256k1')
const crypto = require('crypto')
const bitcoinjs = require('bitcoinjs-lib')
const CryptoJS = require("crypto-js")

const DROP_PATH = "m/44'/118'/0'/0/0"
const DROP_BECH32_PREFIX = 'drop'
const TRANS_TYPE = {
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

/** creates a Drop instance to utilize functions on Dropil Chain */
let Drop = function(lcdUrl, chainId) {
  this.url = lcdUrl
	this.chainId = chainId
	this.path = DROP_PATH
	this.bech32MainPrefix = DROP_BECH32_PREFIX
}

/** returns a new Drop instance to utilize functions on Dropil Chain */
function start(lcdUrl = 'https://testnet-api.dropilchain.com', chainId = 'dropilchain-testnet') {
  return new Drop(lcdUrl, chainId)
}

/** generates a random mnemonic for use in wallet generation */
function generateMnemonic() {
  let randomBytes = Buffer.from(CryptoJS.lib.WordArray.random(32).toString(), `hex`)
  if (randomBytes.length !== 32) throw Error(`Entropy has incorrect length`)
  
  return bip39.entropyToMnemonic(randomBytes.toString(`hex`))
}

/** generates a new wallet and returns { address, mnemonic } */
async function generateWallet() {
  let mnemonic = generateMnemonic()
  let seed = await bip39.mnemonicToSeed(mnemonic)
  let bipInterface = bip32.fromSeed(seed)
  let bipPath = bipInterface.derivePath(DROP_PATH)
  let words = bech32.toWords(bipPath.identifier)
  let address = bech32.encode(DROP_BECH32_PREFIX, words)
  return { address, mnemonic }
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

/** returns response from LCD API (this.url) on /auth/accounts/{address} endpoint */
Drop.prototype.getAccount = function(address) {
  return fetch(this.url + "/auth/accounts/" + address)
  .then(response => response.json())
}

/** returns { accountNumber, sequence } for provided mnemonic */
Drop.prototype.getAccountData = async function(mnemonic) {
  let address = await this.getAddress(mnemonic)
  return this.getAccount(address)
  .then(data => ({ accountNumber: String(data.result.value.account_number), sequence: String(data.result.value.sequence) }))
}

/** returns String(accountNumber) from provided mnemonic */
Drop.prototype.getAccountNumber = async function(mnemonic) {
  let address = await this.getAddress(mnemonic)
  return this.getAccount(address)
  .then(data => String(data.result.value.account_number))
}

/** returns String(sequence) from provided mnemonic */
Drop.prototype.getAccountSequence = async function(mnemonic) {
  let address = await this.getAddress(mnemonic)  
  return this.getAccount(address)
  .then(data => String(data.result.value.sequence))
}

/** returns { address, privateKey } based on provided mnemonic */
Drop.prototype.getKeys = async function(mnemonic) {
  return {
    address: await this.getAddress(mnemonic),
    privateKey: await this.getPrivateKey(mnemonic)
  }
}

/** returns address for provided mnemonic */
Drop.prototype.getAddress = async function(mnemonic) {
  if (typeof mnemonic !== "string") throw new Error("mnemonic expects a string")
  if (mnemonic.split(' ').length !== 24) throw new Error('incorrect mnemonic length, must be 24 words')

	const seed = await bip39.mnemonicToSeed(mnemonic)
	const node = bip32.fromSeed(seed)
	const child = node.derivePath(this.path)
  const words = bech32.toWords(child.identifier)
  const address = bech32.encode(this.bech32MainPrefix, words)

	return address
}

/** returns privateKey for provided mnemonic */
Drop.prototype.getPrivateKey = async function(mnemonic) {
  if (typeof mnemonic !== "string") throw new Error("mnemonic expects a string")
  if (mnemonic.split(' ').length !== 24) throw new Error('incorrect mnemonic length, must be 24 words')

	const seed = await bip39.mnemonicToSeed(mnemonic)
	const node = bip32.fromSeed(seed)
	const child = node.derivePath(this.path)
  const ecpair = bitcoinjs.ECPair.fromPrivateKey(child.privateKey, { compressed : false })
  
	return ecpair.privateKey
}

/** returns udrop balance of provided address; set convert to true to return in DROP decimal format */
Drop.prototype.getBalance = async function(address, convert = false) {
  let data = await this.getAccount(address)

  // return 0 if error or udrop does not exist
  if (!data.result || !data.result.value.coins.length || 
    !data.result.value.coins.filter(c => c.denom === 'udrop').length) return '0'

  let balance = data.result.value.coins.filter(c => c.denom === 'udrop')[0].amount

  return convert ? String(parseFloat(balance) / 1000000.0) : balance
}

/** returns a stdMsg based on the input json */
function newStdMsg(input) {
	return {
    json: input,
    bytes: convertStringToBytes(JSON.stringify(sortObject(input)))
  }
}

Drop.prototype.buildStdMsg = function(type, params, data, memo = '') {
  return newStdMsg({
    msgs: [
      {
        type,
        value: { ...params }
      }
    ],
    chain_id: this.chainId,
    fee: { amount: [ { amount: String(1000000), denom: "udrop" } ], gas: String(200000) },
    memo,
    account_number: String(data.accountNumber),
    sequence: String(data.sequence)
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

/** 
 * creates a send transaction & signs offline using provided mnemonic and then 
 * broadcasts to LCD API (this.url);
 * optionally pass in accountNumber and sequence for manual override;
 * optionally pass false into broadcast param to return the signedTx and NOT broadcast
 */
Drop.prototype.send = async function(mnemonic, toAddress, amount, memo = '', accountNumber = null, sequence = null, broadcast = true) {
  let { address, privateKey } = await this.getKeys(mnemonic)  

  let data = { accountNumber, sequence }
  if (!accountNumber || !sequence) data = await this.getAccountData(mnemonic)
  
  let params = {
    amount: [
      {
        amount: String(amount),
        denom: "udrop"
      }
    ],
    from_address: address,
    to_address: toAddress
  }

  let stdMsg = this.buildStdMsg(TRANS_TYPE.MSG_SEND, params, data, memo)
  const signedTx = sign(stdMsg, privateKey)
  
  if (!broadcast) return signedTx
  return await this.broadcast(signedTx)
}

/** 
 * creates a delegate transaction & signs offline using provided mnemonic and then 
 * broadcasts to LCD API (this.url);
 * optionally pass in accountNumber and sequence for manual override;
 * optionally pass false into broadcast param to return the signedTx and NOT broadcast
 */
Drop.prototype.delegate = async function(mnemonic, validatorAddress, amount, memo = '', accountNumber = null, sequence = null, broadcast = true) {
  let { address, privateKey } = await this.getKeys(menmonic)

  let data = { accountNumber, sequence }
  if (!accountNumber || !sequence) data = await this.getAccountData(mnemonic)
  
  let params = {
    amount: {
      amount: String(amount),
      denom: "udrop"
    },
    delegator_address: address,
    validator_address: validatorAddress
  }

  let stdMsg = this.buildStdMsg(TRANS_TYPE.MSG_DELEGATE, params, data, memo)
  const signedTx = sign(stdMsg, privateKey)

  if (!broadcast) return signedTx
  return await this.broadcast(signedTx)
}

/** 
 * creates an undelegate transaction & signs offline using provided mnemonic and then 
 * broadcasts to LCD API (this.url);
 * optionally pass in accountNumber and sequence for manual override;
 * optionally pass false into broadcast param to return the signedTx and NOT broadcast
 */
Drop.prototype.undelegate = async function(mnemonic, validatorAddress, amount, memo = '', accountNumber = null, sequence = null, broadcast = true) {
  let { address, privateKey } = await this.getKeys(menmonic)

  let data = { accountNumber, sequence }
  if (!accountNumber || !sequence) data = await this.getAccountData(mnemonic)
  
  let params = {
    amount: {
      amount: String(amount),
      denom: "udrop"
    },
    delegator_address: address,
    validator_address: validatorAddress
  }

  let stdMsg = this.buildStdMsg(TRANS_TYPE.MSG_UNDELEGATE, params, data, memo)
  const signedTx = sign(stdMsg, privateKey)

  if (!broadcast) return signedTx
  return await this.broadcast(signedTx)
}

/** 
 * only export the start & generateWallet functions because all other
 * functions should be invoked using the variable created when calling dropjs.create()
 */
module.exports = {
  start,
  generateMnemonic,
  generateWallet
}