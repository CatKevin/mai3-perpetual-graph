
export const READER_ADDRESS = '{{reader_address}}'
export const DAO_VAULT_ADDRESS = '{{dao_vault_address}}'


// oracle address for get price
export const ETH_ORACLE = '{{eth_oracle}}'

// blocknumber for blockHandler
export const HANDLER_BLOCK = {{handler_block}}

// Notice lower case in config
// added ["USDT", "USDC", "DAI"]
export let USDTokens:string[] = [
    "{{usdc_token}}",
]

// !!!!!!!!!!!!!!  Notice Lower Case  !!!!!!!!!!!!!!
// TokenList: tokens need to get price
export let TokenList:string[] = [
    "{{eth_token}}",
]
// OracleList: oracles of each token upper, Notice: index must same with its token
export let OracleList:string[] = [
    "{{eth_oracle}}",
]