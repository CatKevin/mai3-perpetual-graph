import {BigInt, BigDecimal, ethereum, log, Address} from "@graphprotocol/graph-ts"

import {
    Perpetual,
    LiquidityPool,
    Trade15MinData,
    TradeHourData,
    TradeDayData,
    TradeSevenDayData,
    PoolHourData,
    PoolDayData,
    ShareToken,
    LiquidityMiningDayData,
    Governor
} from '../generated/schema'

import {
    getTokenPrice,
    ZERO_BD,
} from './utils'

import {
    getPoolHourData
} from './liquidityPool'
import {CertifiedPools, TokenList} from "./const";

export function updateTrade15MinData(perp: Perpetual, price: BigDecimal, amount: BigDecimal, blockTimestamp: BigInt): Trade15MinData {
    let timestamp = blockTimestamp.toI32()
    let minIndex = timestamp / (60 * 15)
    let minStartUnix = minIndex * (60 * 15)
    let minPerpID = perp.id
        .concat('-')
        .concat(BigInt.fromI32(minIndex).toString())
    let trade15MinData = Trade15MinData.load(minPerpID)
    if (trade15MinData === null) {
        trade15MinData = new Trade15MinData(minPerpID)
        trade15MinData.perpetual = perp.id
        trade15MinData.timestamp = minStartUnix
        trade15MinData.open = price
        trade15MinData.low = price
        trade15MinData.high = price
        trade15MinData.close = price
        trade15MinData.volume = amount.times(price)
    } else {
        trade15MinData.close = price
        if (trade15MinData.high < price) {
            trade15MinData.high = price
        } else if (trade15MinData.low > price) {
            trade15MinData.low = price
        }
        trade15MinData.volume = trade15MinData.volume.plus(amount.times(price))
    }
    trade15MinData.save()
    return trade15MinData as Trade15MinData
}

export function updateTradeHourData(perp: Perpetual, price: BigDecimal, amount: BigDecimal, blockTimestamp: BigInt): TradeHourData {
    let timestamp = blockTimestamp.toI32()
    let hourIndex = timestamp / 3600
    let hourStartUnix = hourIndex * 3600
    let hourPerpID = perp.id
        .concat('-')
        .concat(BigInt.fromI32(hourIndex).toString())
    let tradeHourData = TradeHourData.load(hourPerpID)
    if (tradeHourData === null) {
        tradeHourData = new TradeHourData(hourPerpID)
        tradeHourData.perpetual = perp.id
        tradeHourData.timestamp = hourStartUnix
        tradeHourData.open = price
        tradeHourData.low = price
        tradeHourData.high = price
        tradeHourData.close = price
        tradeHourData.volume = amount.times(price)
    } else {
        tradeHourData.close = price
        if (tradeHourData.high < price) {
            tradeHourData.high = price
        } else if (tradeHourData.low > price) {
            tradeHourData.low = price
        }
        tradeHourData.volume = tradeHourData.volume.plus(amount.times(price))
    }
    tradeHourData.save()
    return tradeHourData as TradeHourData
}

export function updateTradeDayData(perp: Perpetual, price: BigDecimal, amount: BigDecimal, blockTimestamp: BigInt): TradeDayData {
    let timestamp = blockTimestamp.toI32()
    let dayIndex = timestamp / (3600 * 24)
    let dayStartUnix = dayIndex * (3600 * 24)
    let dayPerpID = perp.id
        .concat('-')
        .concat(BigInt.fromI32(dayIndex).toString())
    let tradeDayData = TradeDayData.load(dayPerpID)
    if (tradeDayData === null) {
        tradeDayData = new TradeDayData(dayPerpID)
        tradeDayData.perpetual = perp.id
        tradeDayData.timestamp = dayStartUnix
        tradeDayData.open = price
        tradeDayData.low = price
        tradeDayData.high = price
        tradeDayData.close = price
        tradeDayData.volume = amount.times(price)
    } else {
        tradeDayData.close = price
        if (tradeDayData.high < price) {
            tradeDayData.high = price
        } else if (tradeDayData.low > price) {
            tradeDayData.low = price
        }
        tradeDayData.volume = tradeDayData.volume.plus(amount.times(price))
    }
    tradeDayData.save()
    return tradeDayData as TradeDayData
}

export function updateTradeSevenDayData(perp: Perpetual, price: BigDecimal, amount: BigDecimal, blockTimestamp: BigInt): TradeSevenDayData {
    let timestamp = blockTimestamp.toI32()
    let dayIndex = timestamp / (3600 * 24 * 7)
    let dayStartUnix = dayIndex * (3600 * 24 * 7)
    let dayPerpID = perp.id
        .concat('-')
        .concat(BigInt.fromI32(dayIndex).toString())
    let tradeSevenDayData = TradeSevenDayData.load(dayPerpID)
    if (tradeSevenDayData === null) {
        tradeSevenDayData = new TradeSevenDayData(dayPerpID)
        tradeSevenDayData.perpetual = perp.id
        tradeSevenDayData.timestamp = dayStartUnix
        tradeSevenDayData.open = price
        tradeSevenDayData.low = price
        tradeSevenDayData.high = price
        tradeSevenDayData.close = price
        tradeSevenDayData.volume = amount.times(price)
    } else {
        tradeSevenDayData.close = price
        if (tradeSevenDayData.high < price) {
            tradeSevenDayData.high = price
        } else if (tradeSevenDayData.low > price) {
            tradeSevenDayData.low = price
        }
        tradeSevenDayData.volume = tradeSevenDayData.volume.plus(amount.times(price))
    }
    tradeSevenDayData.save()
    return tradeSevenDayData as TradeSevenDayData
}

export function updatePoolHourData(pool: LiquidityPool, timestamp: BigInt, poolMargin: BigDecimal, price: BigDecimal): PoolHourData {
    let poolHourData = getPoolHourData(timestamp, pool.id)
    let shareToken = ShareToken.load(pool.shareToken)
    let nav = ZERO_BD
    if (shareToken.totalSupply != ZERO_BD) {
        nav = poolMargin.div(shareToken.totalSupply)
    }
    pool.poolMargin = poolMargin
    pool.poolMarginUSD = pool.poolMargin.times(price)
    poolHourData.poolMarginUSD = pool.poolMarginUSD
    poolHourData.poolMargin = pool.poolMargin
    poolHourData.netAssetValue = nav
    pool.save()
    poolHourData.save()
    return poolHourData as PoolHourData
}

export function updatePoolDayData(pool: LiquidityPool, timestamp: BigInt, poolMargin: BigDecimal, price: BigDecimal): PoolDayData {
    let dayIndex = timestamp.toI32() / (3600 * 24)
    let dayStartUnix = dayIndex * (3600 * 24)
    let dayPoolID = pool.id
        .concat('-')
        .concat(BigInt.fromI32(dayIndex).toString())
    let poolDayData = PoolDayData.load(dayPoolID)
    if (poolDayData === null) {
        poolDayData = new PoolDayData(dayPoolID)
        poolDayData.liquidityPool = pool.id
        poolDayData.poolName = CertifiedPools.get(pool.id) as string
        poolDayData.poolMargin = poolMargin
        poolDayData.poolMarginUSD = ZERO_BD
        poolDayData.netAssetValue = ZERO_BD
        poolDayData.timestamp = dayStartUnix
    }

    let shareToken = ShareToken.load(pool.shareToken)
    let nav = ZERO_BD
    if (shareToken.totalSupply != ZERO_BD) {
        nav = poolMargin.div(shareToken.totalSupply)
    }
    pool.poolMargin = poolMargin
    pool.poolMarginUSD = pool.poolMargin.times(price)
    poolDayData.poolMargin = pool.poolMargin
    poolDayData.poolMarginUSD = pool.poolMarginUSD
    poolDayData.netAssetValue = nav
    pool.save()
    poolDayData.save()
    return poolDayData as PoolDayData
}


export function updateLiquidityMiningDayData(pool: LiquidityPool, timestamp: BigInt, blockNumber: BigInt): void {
    let dayIndex = timestamp.toI32() / (3600 * 24)
    let dayStartUnix = dayIndex * (3600 * 24)
    let dayLiquidityMiningID = pool.id
        .concat('-')
        .concat(BigInt.fromI32(dayIndex).toString())
    let liquidityMiningDayData = LiquidityMiningDayData.load(dayLiquidityMiningID)
    if (liquidityMiningDayData === null) {
        liquidityMiningDayData = new LiquidityMiningDayData(dayLiquidityMiningID)
        liquidityMiningDayData.pool = pool.id
        liquidityMiningDayData.poolName = CertifiedPools.get(pool.id) as string
        liquidityMiningDayData.lastUpdateBlock = blockNumber
        liquidityMiningDayData.timestamp = dayStartUnix
        liquidityMiningDayData.token = "MCB"
        liquidityMiningDayData.minedAmount = ZERO_BD
        liquidityMiningDayData.minedValueUSD = ZERO_BD
        liquidityMiningDayData.save()

        let lastDayLiquidityMiningID = pool.id
            .concat('-')
            .concat(BigInt.fromI32(dayIndex - 1).toString())
        let lastLiquidityMiningDayData = LiquidityMiningDayData.load(lastDayLiquidityMiningID)
        if (lastLiquidityMiningDayData != null) {
            updateLMDayDataIfNotNull(pool, lastLiquidityMiningDayData!, blockNumber)
        }
    } else {
        updateLMDayDataIfNotNull(pool, liquidityMiningDayData!, blockNumber)
    }
}


export function updateLMDayDataIfNotNull(pool: LiquidityPool, liquidityMiningDayData: LiquidityMiningDayData, blockNumber: BigInt): void {
    let governor = Governor.load(pool.governor)
    let hourReward = ZERO_BD
    let mcbPrice = getTokenPrice(TokenList[1])

    if (governor.periodFinish > liquidityMiningDayData.lastUpdateBlock && governor.periodFinish <= blockNumber) {
        if (governor.changeRewardBlock > liquidityMiningDayData.lastUpdateBlock &&
            governor.changeRewardBlock <= governor.periodFinish) {
            let hourReward1 = (governor.changeRewardBlock.minus(liquidityMiningDayData.lastUpdateBlock)).toBigDecimal().times(governor.preRewardRate)
            let hourReward2 = (governor.periodFinish.minus(governor.changeRewardBlock)).toBigDecimal().times(governor.rewardRate)
            hourReward = hourReward1.plus(hourReward2)
        } else if (governor.changeRewardBlock > governor.periodFinish &&
            governor.changeRewardBlock < blockNumber) {
            hourReward = (governor.periodFinish.minus(liquidityMiningDayData.lastUpdateBlock)).toBigDecimal().times(governor.preRewardRate)
        } else {
            hourReward = (governor.periodFinish.minus(liquidityMiningDayData.lastUpdateBlock)).toBigDecimal().times(governor.rewardRate)
        }
    } else if (governor.periodFinish > blockNumber) {
        if (governor.changeRewardBlock > liquidityMiningDayData.lastUpdateBlock &&
            governor.changeRewardBlock < blockNumber) {
            let hourReward1 = (governor.changeRewardBlock.minus(liquidityMiningDayData.lastUpdateBlock)).toBigDecimal().times(governor.preRewardRate)
            let hourReward2 = (blockNumber.minus(governor.changeRewardBlock)).toBigDecimal().times(governor.rewardRate)
            hourReward = hourReward1.plus(hourReward2)
        } else {
            hourReward = (blockNumber.minus(liquidityMiningDayData.lastUpdateBlock)).toBigDecimal().times(governor.rewardRate)
        }
    }
    liquidityMiningDayData.minedAmount = liquidityMiningDayData.minedAmount.plus(hourReward)
    liquidityMiningDayData.minedValueUSD = liquidityMiningDayData.minedValueUSD.plus(hourReward.times(mcbPrice))

    liquidityMiningDayData.lastUpdateBlock = blockNumber
    liquidityMiningDayData.save()
}