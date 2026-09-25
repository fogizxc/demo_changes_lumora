import { TaxScenario } from '../../src/types.js';

export interface TaxCalculationItem {
  unitPrice: number;
  quantity: number;
  discount?: number;
  taxRate: number; // e.g. 18.0 for 18%
}

export interface TaxCalculationResult {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  itemBreakdowns: {
    taxableAmount: number;
    tax: number;
    cgst: number;
    sgst: number;
    igst: number;
    lineTotal: number;
  }[];
}

// Round to 2 decimal places safely without floating point drift
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Authoritative centralized tax calculation for POS transactions.
 * GST Rule:
 * Subtotal = sum(unit_price * quantity)
 * Discount = sum(item_discount) + order_discount
 * Taxable Amount = Subtotal - Discount
 * If INTRA_STATE: Tax is split 50/50 into CGST and SGST
 * If INTER_STATE: Tax is 100% IGST
 * Total = Taxable Amount + Total Tax
 */
export function calculateAuthoritativeTax(
  items: TaxCalculationItem[],
  orderDiscount: number = 0,
  taxScenario: TaxScenario = 'INTRA_STATE'
): TaxCalculationResult {
  let rawSubtotal = 0;
  let rawItemsDiscount = 0;

  for (const item of items) {
    rawSubtotal += item.unitPrice * item.quantity;
    rawItemsDiscount += (item.discount || 0);
  }

  const subtotal = roundCurrency(rawSubtotal);
  const boundedOrderDiscount = Math.min(subtotal, Math.max(0, Number.isFinite(orderDiscount) ? orderDiscount : 0));
  const boundedItemsDiscount = Math.min(subtotal, Math.max(0, Number.isFinite(rawItemsDiscount) ? rawItemsDiscount : 0));
  const totalDiscount = Math.min(subtotal, roundCurrency(boundedItemsDiscount + boundedOrderDiscount));

  // Distribute order discount proportionally across items if orderDiscount is present
  const discountRatio = subtotal > 0 ? Math.max(0, (subtotal - totalDiscount) / subtotal) : 0;

  let totalTaxable = 0;
  let totalTax = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const itemBreakdowns = items.map((item) => {
    const itemGross = item.unitPrice * item.quantity;
    const itemDirectDiscount = item.discount || 0;
    let itemTaxable = Math.max(0, itemGross - itemDirectDiscount);

    if (orderDiscount > 0 && subtotal > 0) {
      itemTaxable = roundCurrency(itemGross * discountRatio);
    } else {
      itemTaxable = roundCurrency(itemTaxable);
    }

    const itemTax = roundCurrency(itemTaxable * (item.taxRate / 100));
    let itemCgst = 0;
    let itemSgst = 0;
    let itemIgst = 0;

    if (taxScenario === 'INTRA_STATE') {
      itemCgst = roundCurrency(itemTax / 2);
      itemSgst = roundCurrency(itemTax - itemCgst); // Exact penny balance
    } else {
      itemIgst = itemTax;
    }

    const lineTotal = roundCurrency(itemTaxable + itemTax);

    totalTaxable += itemTaxable;
    totalTax += itemTax;
    totalCgst += itemCgst;
    totalSgst += itemSgst;
    totalIgst += itemIgst;

    return {
      taxableAmount: itemTaxable,
      tax: itemTax,
      cgst: itemCgst,
      sgst: itemSgst,
      igst: itemIgst,
      lineTotal,
    };
  });

  const taxableAmount = roundCurrency(totalTaxable);
  const taxAmount = roundCurrency(totalTax);
  const cgstAmount = roundCurrency(totalCgst);
  const sgstAmount = roundCurrency(totalSgst);
  const igstAmount = roundCurrency(totalIgst);
  const totalAmount = roundCurrency(taxableAmount + taxAmount);

  return {
    subtotal,
    discount: totalDiscount,
    taxableAmount,
    taxAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount,
    itemBreakdowns,
  };
}
