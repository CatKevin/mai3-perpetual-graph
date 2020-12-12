import { BigInt, ethereum, log, Address } from "@graphprotocol/graph-ts"
import {
    Deposit as DepositEvent,
    Withdraw as WithdrawEvent,
    AddLiquidatity as AddLiquidatityEvent,
    RemoveLiquidatity as RemoveLiquidatityEvent,
    Trade as TradeEvent,
    LiquidateByAMM as LiquidateByAMMEvent,
    LiquidateByTrader as LiquidateByTraderEvent,
    OpenPositionByTrade as OpenPositionByTradeEvent,
    ClosePositionByTrade as ClosePositionByTradeEvent,
    OpenPositionByLiquidation as OpenPositionByLiquidationEvent,
    ClosePositionByLiquidation as ClosePositionByLiquidationEvent,
} from '../generated/templates/Perpetual/Perpetual'

import { updateTradeMinuteData, updateTradeDayData, updateTradeSevenDayData, updateTradeHourData } from './dataUpdate'

import {
    fetchUser,
    fetchLiquidityAccount,
    fetchMarginAccount,
    ZERO_BD,
    ONE_BD,
    ONE_BI,
    BI_18,
    convertToDecimal,
} from './utils'

import { Perpetual, Trade, MarginAccount} from '../generated/schema'

export function handleDeposit(event: DepositEvent): void {
    let perp = Perpetual.load(event.address.toHexString())
    let user = fetchUser(event.params.trader)
    let marginAccount = fetchMarginAccount(user, perp as Perpetual)
    let amount = convertToDecimal(event.params.amount, BI_18)
    marginAccount.collateralAmount += amount
    marginAccount.save()
}

export function handleWithdraw(event: WithdrawEvent): void {
    let perp = Perpetual.load(event.address.toHexString())
    let user = fetchUser(event.params.trader)
    let marginAccount = fetchMarginAccount(user, perp as Perpetual)
    let amount = convertToDecimal(event.params.amount, BI_18)
    marginAccount.collateralAmount -= amount
    marginAccount.save()
}

export function handleAddLiquidatity(event: AddLiquidatityEvent): void {
    let perp = Perpetual.load(event.address.toHexString())
    let user = fetchUser(event.params.trader)
    let account = fetchLiquidityAccount(user, perp as Perpetual)
    if (account.collateralAmount != ZERO_BD) {
        perp.liquidityProviderCount += ONE_BI
    }
    let amount = convertToDecimal(event.params.addedCash, BI_18)
    account.collateralAmount += amount
    account.shareAmount += convertToDecimal(event.params.mintedShare, BI_18)
    perp.liquidityAmount += amount
    account.save()
    perp.save()
}

export function handleRemoveLiquidatity(event: RemoveLiquidatityEvent): void {
    let perp = Perpetual.load(event.address.toHexString())
    let user = fetchUser(event.params.trader)
    let account = fetchLiquidityAccount(user, perp as Perpetual)
    let shareAmount = convertToDecimal(event.params.burnedShare, BI_18)
    let cash = convertToDecimal(event.params.returnedCash, BI_18)
    account.shareAmount -= shareAmount
    account.collateralAmount -= cash
    if (account.shareAmount == ZERO_BD) {
        perp.liquidityProviderCount -= ONE_BI
    }
    perp.liquidityAmount -= (cash)
    account.save()
    perp.save()
}

export function handleTrade(event: TradeEvent): void {
    // AMM 
    if (event.address.toHexString() == event.params.trader.toHexString()) {
        return
    }
    let perp = Perpetual.load(event.address.toHexString())
    //TODO trade fee

    // update trade data
    updateTradeMinuteData(perp as Perpetual, event)
    updateTradeHourData(perp as Perpetual, event)
    updateTradeDayData(perp as Perpetual, event)
    updateTradeSevenDayData(perp as Perpetual, event)
}

export function handleLiquidateByAMM(event: LiquidateByAMMEvent): void {
    //TODO trade fee

}

export function handleLiquidateByTrader(event: LiquidateByTraderEvent): void {

}

export function handleOpenPositionByTrade(event: OpenPositionByTradeEvent): void {
    // AMM 
    if (event.address.toHexString() == event.params.trader.toHexString()) {
        return
    }
    let perp = Perpetual.load(event.address.toHexString())
    let user = fetchUser(event.params.trader)
    let transactionHash = event.transaction.hash.toHexString()
    let trade = new Trade(
        transactionHash
        .concat('-')
        .concat(event.logIndex.toString())
    )

    trade.perpetual = perp.id
    trade.trader = user.id
    trade.amount = convertToDecimal(event.params.amount, BI_18)
    trade.price = convertToDecimal(event.params.price, BI_18)
    trade.isClose = false
    trade.fee = ZERO_BD
    trade.type = 0 // position by trade
    trade.transactionHash = transactionHash
    trade.blockNumber = event.block.number
    trade.timestamp = event.block.timestamp
    trade.logIndex = event.logIndex
    perp.lastPrice = trade.price
    perp.save()
    trade.save()

    // user margin account
    let account = fetchMarginAccount(user, perp as Perpetual)
    account.position += trade.amount
    account.entryValue += trade.amount.times(trade.price)
    if (account.position == ZERO_BD) {
        account.entryPrice = ZERO_BD
    } else {
        account.entryPrice = account.entryValue.div(account.position)
    }
    account.save()
}

export function handleClosePositionByTrade(event: ClosePositionByTradeEvent): void {
    // AMM 
    if (event.address.toHexString() == event.params.trader.toHexString()) {
        return
    }
    let perp = Perpetual.load(event.address.toHexString())
    let user = fetchUser(event.params.trader)
    let account = fetchMarginAccount(user, perp as Perpetual)
    let transactionHash = event.transaction.hash.toHexString()
    let trade = new Trade(
        transactionHash
        .concat('-')
        .concat(event.logIndex.toString())
    )

    trade.perpetual = perp.id
    trade.trader = user.id
    trade.amount = convertToDecimal(event.params.amount, BI_18)
    trade.price = convertToDecimal(event.params.price, BI_18)
    trade.isClose = true
    trade.fee = ZERO_BD
    trade.type = 0 // position by trade
    let fundingLoss = convertToDecimal(event.params.fundingLoss, BI_18)
    let amount = trade.amount
    if (trade.amount < ZERO_BD) {
        amount = -amount
    }
    trade.pnl = amount.times(trade.price.minus(account.entryPrice)).minus(fundingLoss)
    trade.transactionHash = transactionHash
    trade.blockNumber = event.block.number
    trade.timestamp = event.block.timestamp
    trade.logIndex = event.logIndex
    perp.lastPrice = trade.price
    perp.save()
    trade.save()

    // user margin account
    account.position += trade.amount
    account.entryValue += trade.amount.times(trade.price)
    if (account.position == ZERO_BD) {
        account.entryPrice = ZERO_BD
    } else {
        account.entryPrice = account.entryValue.div(account.position)
    }
    account.save()
}

export function handleOpenPositionByLiquidation(event: OpenPositionByLiquidationEvent): void {
    // AMM 
    if (event.address.toHexString() == event.params.trader.toHexString()) {
        return
    }
    let perp = Perpetual.load(event.address.toHexString())
    let user = fetchUser(event.params.trader)
    let transactionHash = event.transaction.hash.toHexString()
    let trade = new Trade(
        transactionHash
        .concat('-')
        .concat(event.logIndex.toString())
    )

    trade.perpetual = perp.id
    trade.trader = user.id
    trade.amount = convertToDecimal(event.params.amount, BI_18)
    trade.price = convertToDecimal(event.params.price, BI_18)
    trade.isClose = false
    trade.fee = ZERO_BD
    trade.type = 1 // position by trade
    trade.transactionHash = transactionHash
    trade.blockNumber = event.block.number
    trade.timestamp = event.block.timestamp
    trade.logIndex = event.logIndex
    perp.lastPrice = trade.price
    perp.save()
    trade.save()

    // user margin account
    let account = fetchMarginAccount(user, perp as Perpetual)
    account.position += trade.amount
    account.entryValue += trade.amount.times(trade.price)
    if (account.position == ZERO_BD) {
        account.entryPrice = ZERO_BD
    } else {
        account.entryPrice = account.entryValue.div(account.position)
    }
    account.save()    
}

export function handleClosePositionByLiquidation(event: ClosePositionByLiquidationEvent): void {
    // AMM 
    if (event.address.toHexString() == event.params.trader.toHexString()) {
        return
    }
    let perp = Perpetual.load(event.address.toHexString())
    let user = fetchUser(event.params.trader)
    let account = fetchMarginAccount(user, perp as Perpetual)
    let transactionHash = event.transaction.hash.toHexString()
    let trade = new Trade(
        transactionHash
        .concat('-')
        .concat(event.logIndex.toString())
    )

    trade.perpetual = perp.id
    trade.trader = user.id
    trade.amount = convertToDecimal(event.params.amount, BI_18)
    trade.price = convertToDecimal(event.params.price, BI_18)
    trade.isClose = true
    trade.fee = ZERO_BD
    trade.type = 1 // position by trade
    let fundingLoss = convertToDecimal(event.params.fundingLoss, BI_18)
    trade.pnl = trade.amount.times(trade.price.minus(account.entryPrice)).minus(fundingLoss)
    trade.transactionHash = transactionHash
    trade.blockNumber = event.block.number
    trade.timestamp = event.block.timestamp
    trade.logIndex = event.logIndex
    perp.lastPrice = trade.price
    perp.save()
    trade.save()

    // user margin account
    account.position += trade.amount
    account.entryValue += trade.amount.times(trade.price)
    if (account.position == ZERO_BD) {
        account.entryPrice = ZERO_BD
    } else {
        account.entryPrice = account.entryValue.div(account.position)
    }
    account.save()    
}