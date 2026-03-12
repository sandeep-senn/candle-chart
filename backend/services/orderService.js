/**
 * Service to handle order placements with advanced validation.
 * Stateless: All methods require a 'kite' instance to be passed in.
 */
class OrderService {
  constructor() {
    this.locks = new Map();
  }

  /**
   * Acquires a simple in-memory lock for a symbol to prevent race conditions.
   */
  async acquireLock(userId, symbol) {
    const lockKey = `${userId}:${symbol}`;
    while (this.locks.has(lockKey)) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    this.locks.set(lockKey, true);
  }

  releaseLock(userId, symbol) {
    const lockKey = `${userId}:${symbol}`;
    this.locks.delete(lockKey);
  }

  /**
   * Validates and places a SELL Stop-Loss (SL or SL-M) order.
   */
  async placeSellStopLoss(kite, params) {
    const {
      userId,
      symbol,
      exchange,
      orderType,
      quantity,
      triggerPrice,
      limitPrice,
    } = params;

    try {
      await this.acquireLock(userId, symbol);

      const [positionsResponse, quoteResponse] = await Promise.all([
        kite.getPositions(),
        kite.getQuote([`${exchange}:${symbol}`])
      ]);

      const positions = positionsResponse.net || [];
      const quote = quoteResponse[`${exchange}:${symbol}`];

      if (!quote) throw new Error(`Market data not found for ${symbol}`);

      const pos = positions.find(p => p.tradingsymbol === symbol);
      if (!pos || pos.quantity <= 0) {
        throw new Error(`Validation Failed: No open BUY position found for ${symbol}.`);
      }

      if (quantity > pos.quantity) {
        throw new Error(`Validation Failed: Selling quantity (${quantity}) exceeds open position (${pos.quantity}).`);
      }

      const avgBuyPrice = pos.average_price;
      const cmp = quote.last_price;
      const lowerCircuit = quote.lower_circuit_limit;
      const upperCircuit = quote.upper_circuit_limit;

      if (triggerPrice >= cmp) {
        throw new Error(`Validation Failed: Trigger price (${triggerPrice}) must be less than Current Market Price (${cmp}).`);
      }

      const maxRiskPrice = avgBuyPrice * 0.90;
      if (triggerPrice < maxRiskPrice) {
        throw new Error(`Validation Failed: Stop-loss exceeds 10% risk limit. Minimum allowed price: ${maxRiskPrice.toFixed(2)}.`);
      }

      if (triggerPrice < lowerCircuit || triggerPrice > upperCircuit) {
        throw new Error(`Validation Failed: Trigger price must be within exchange circuit limits (${lowerCircuit} - ${upperCircuit}).`);
      }

      if (orderType === "SL") {
        if (!limitPrice) throw new Error(`Validation Failed: Limit price is required for SL orders.`);
        if (limitPrice > triggerPrice) {
          throw new Error(`Validation Failed: Limit price must be less than or equal to trigger price for Sell SL orders.`);
        }
        if (limitPrice < lowerCircuit || limitPrice > upperCircuit) {
          throw new Error(`Validation Failed: Limit price must be within exchange circuit limits.`);
        }
      }

      const orderId = await kite.placeOrder("regular", {
        exchange,
        tradingsymbol: symbol,
        transaction_type: "SELL",
        quantity,
        product: pos.product,
        order_type: orderType,
        trigger_price: triggerPrice,
        price: orderType === "SL" ? limitPrice : undefined,
      });

      return {
        success: true,
        orderId,
        message: `SELL ${orderType} order placed successfully.`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR"
      };
    } finally {
      this.releaseLock(userId, symbol);
    }
  }

  /**
   * Places a Smart Order: Entry + GTT OCO (Target & Stop Loss)
   */
  async placeSmartOrder(kite, params) {
    const {
      exchange,
      symbol,
      transactionType,
      product,
      orderType,
      quantity,
      price,
      targetPrice,
      stopLossPrice
    } = params;

    try {
      const quoteResponse = await kite.getQuote([`${exchange}:${symbol}`]);
      const quote = quoteResponse[`${exchange}:${symbol}`];
      if (!quote) throw new Error(`Market data not found for ${symbol}`);

      const entryOrderId = await kite.placeOrder("regular", {
        exchange,
        tradingsymbol: symbol,
        transaction_type: transactionType,
        quantity: Number(quantity),
        product,
        order_type: orderType,
        price: orderType === "LIMIT" ? Number(price) : undefined,
        validity: "DAY"
      });

      if (targetPrice || stopLossPrice) {
        const exitTransactionType = transactionType === "BUY" ? "SELL" : "BUY";
        const trigger_values = [];
        const orders = [];

        if (stopLossPrice) {
          let SLTrigger = Number(stopLossPrice);
          if (SLTrigger === Number(quote.last_price)) {
            SLTrigger = transactionType === "BUY" ? SLTrigger - 0.05 : SLTrigger + 0.05;
          }
          trigger_values.push(SLTrigger);
          orders.push({
            exchange,
            tradingsymbol: symbol,
            transaction_type: exitTransactionType,
            quantity: Number(quantity),
            product,
            order_type: "LIMIT",
            price: Number(stopLossPrice),
          });
        }

        if (targetPrice) {
          let TargetTrigger = Number(targetPrice);
          if (TargetTrigger === Number(quote.last_price)) {
            TargetTrigger = transactionType === "BUY" ? TargetTrigger + 0.05 : TargetTrigger - 0.05;
          }
          trigger_values.push(TargetTrigger);
          orders.push({
            exchange,
            tradingsymbol: symbol,
            transaction_type: exitTransactionType,
            quantity: Number(quantity),
            product,
            order_type: "LIMIT",
            price: Number(targetPrice),
          });
        }

        const gttParams = {
          trigger_type: orders.length === 2 ? "two-leg" : "single",
          tradingsymbol: symbol,
          exchange: exchange,
          last_price: Number(quote.last_price),
          trigger_values: trigger_values,
          orders: orders
        };

        try {
          await kite.placeGTT(gttParams);
        } catch (gttErr) {
          console.error("GTT Placement Error:", gttErr.message);
        }
      }

      return { success: true, orderId: entryOrderId };

    } catch (error) {
      console.error("Smart Order Error:", error.message);
      throw error;
    }
  }
}

export default new OrderService();
