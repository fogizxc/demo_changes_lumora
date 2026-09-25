import { db } from '../db.js';
import { logAuditEvent } from './audit.js';

export type StockMovementType =
  | 'SALE'
  | 'PURCHASE'
  | 'STOCK_ADJUSTMENT'
  | 'RETURN'
  | 'VOID_REVERSAL'
  | 'RECONCILIATION';

export type AdjustmentReason =
  | 'DAMAGED'
  | 'LOST'
  | 'COUNT_CORRECTION'
  | 'EXPIRED'
  | 'INTERNAL_USE'
  | 'OTHER';

export interface RecordMovementParams {
  shopId: string;
  productId: string;
  movementType: StockMovementType;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  costPrice?: number | null;
  referenceId?: string | null;
  referenceNote?: string | null;
  actorId: string;
  actorName?: string | null;
  createdAt?: string;
}

/**
 * Authoritative stock movement recorder.
 * Every stock change MUST create an immutable record in stock_movements.
 */
export function recordStockMovement(params: RecordMovementParams): string {
  const movementId = 'mov_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  const now = params.createdAt || new Date().toISOString();

  db.prepare(`
    INSERT INTO stock_movements (
      id, shop_id, product_id, movement_type, quantity_change,
      previous_stock, new_stock, cost_price, reference_id,
      reference_note, actor_id, actor_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    movementId,
    params.shopId,
    params.productId,
    params.movementType,
    params.quantityChange,
    params.previousStock,
    params.newStock,
    params.costPrice ?? null,
    params.referenceId ?? null,
    params.referenceNote ?? null,
    params.actorId,
    params.actorName ?? null,
    now
  );

  return movementId;
}

/**
 * Checks if a product can be sold at POS:
 * 1. Product must be ACTIVE.
 * 2. Product must have sufficient stock.
 * 3. Expired batches must not be sold.
 */
export function checkProductSaleability(
  shopId: string,
  productId: string,
  requestedQuantity: number
): { allowed: boolean; reason?: string; product?: any } {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(productId, shopId) as any;
  if (!product) {
    return { allowed: false, reason: 'Product not found in this shop.' };
  }

  if (product.status !== 'ACTIVE') {
    return { allowed: false, reason: `Product "${product.name}" is inactive and cannot be sold.` };
  }

  if (product.stock < requestedQuantity) {
    return {
      allowed: false,
      reason: `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${requestedQuantity}.`,
    };
  }

  // Check batch expiry if product has batches
  const today = new Date().toISOString().split('T')[0];
  const batches = db.prepare(`
    SELECT * FROM product_batches 
    WHERE shop_id = ? AND product_id = ? AND quantity > 0
    ORDER BY expiry_date ASC
  `).all(shopId, productId) as any[];

  if (batches.length > 0) {
    const validBatches = batches.filter(b => b.expiry_date >= today && b.status === 'ACTIVE');
    const validStock = validBatches.reduce((acc, b) => acc + b.quantity, 0);

    if (validStock < requestedQuantity) {
      const expiredBatches = batches.filter(b => b.expiry_date < today);
      if (expiredBatches.length > 0) {
        return {
          allowed: false,
          reason: `Cannot sell expired stock for "${product.name}". Batch ${expiredBatches[0].batch_number} expired on ${expiredBatches[0].expiry_date}. Non-expired available: ${validStock}.`,
        };
      }
      return {
        allowed: false,
        reason: `Insufficient valid batch stock for "${product.name}". Available: ${validStock}.`,
      };
    }
  }

  return { allowed: true, product };
}

/**
 * Deducts batch quantities using FEFO (First Expire, First Out).
 */
export function deductBatchesFEFO(shopId: string, productId: string, quantityToDeduct: number) {
  const today = new Date().toISOString().split('T')[0];
  const batches = db.prepare(`
    SELECT * FROM product_batches
    WHERE shop_id = ? AND product_id = ? AND quantity > 0 AND expiry_date >= ? AND status = 'ACTIVE'
    ORDER BY expiry_date ASC
  `).all(shopId, productId, today) as any[];

  let remaining = quantityToDeduct;
  const now = new Date().toISOString();

  for (const batch of batches) {
    if (remaining <= 0) break;

    const deduct = Math.min(batch.quantity, remaining);
    const newQty = batch.quantity - deduct;
    const newStatus = newQty === 0 ? 'DEPLETED' : 'ACTIVE';

    db.prepare(`
      UPDATE product_batches 
      SET quantity = ?, status = ?, updated_at = ?
      WHERE id = ? AND shop_id = ?
    `).run(newQty, newStatus, now, batch.id, shopId);

    remaining -= deduct;
  }
}

/**
 * Controlled manual stock adjustment with mandatory audit logging and stock movement.
 */
export function adjustStock(params: {
  shopId: string;
  productId: string;
  newStock: number;
  reason: AdjustmentReason;
  notes?: string;
  actorId: string;
  actorRole: string;
  actorName: string;
}) {
  const { shopId, productId, newStock, reason, notes, actorId, actorRole, actorName } = params;

  if (newStock < 0) {
    throw new Error('Stock level cannot be negative.');
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(productId, shopId) as any;
  if (!product) {
    throw new Error('Product not found.');
  }

  const previousStock = product.stock;
  const quantityChange = newStock - previousStock;

  if (quantityChange === 0) {
    return { success: true, message: 'Stock level unchanged.', product };
  }

  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    // 1. Update product stock
    db.prepare(`
      UPDATE products 
      SET stock = ?, updated_at = ?
      WHERE id = ? AND shop_id = ?
    `).run(newStock, now, productId, shopId);

    // 2. Record stock movement
    const refNote = `Reason: ${reason}${notes ? ` - ${notes}` : ''}`;
    recordStockMovement({
      shopId,
      productId,
      movementType: 'STOCK_ADJUSTMENT',
      quantityChange,
      previousStock,
      newStock,
      costPrice: product.cost_price,
      referenceId: 'adj_' + Date.now(),
      referenceNote: refNote,
      actorId,
      actorName,
      createdAt: now,
    });

    // 3. Log Audit Event
    logAuditEvent({
      actorId,
      actorRole,
      shopId,
      action: 'STOCK_ADJUSTED',
      targetType: 'PRODUCT',
      targetId: productId,
      before: { stock: previousStock, sku: product.sku, name: product.name },
      after: { stock: newStock, diff: quantityChange, reason, notes },
    });
  });

  tx();

  const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(productId, shopId);
  return { success: true, previousStock, newStock, quantityChange, product: updatedProduct };
}

/**
 * Receive stock purchase / inward from a supplier.
 */
export function receiveStockPurchase(params: {
  shopId: string;
  supplierId?: string;
  invoiceReference?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    costPrice: number;
    batchNumber?: string;
    expiryDate?: string;
  }>;
  actorId: string;
  actorRole: string;
  actorName: string;
}) {
  const { shopId, supplierId, invoiceReference, notes, items, actorId, actorRole, actorName } = params;

  if (!items || items.length === 0) {
    throw new Error('Purchase must contain at least one item.');
  }

  const now = new Date().toISOString();
  const year = new Date().getFullYear();

  // Generate sequence purchase number
  const count = (db.prepare('SELECT COUNT(*) as cnt FROM purchases WHERE shop_id = ?').get(shopId) as any)?.cnt || 0;
  const purchaseNumber = `PO-${year}-${String(count + 1).padStart(5, '0')}`;
  const purchaseId = 'pur_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

  let totalAmount = 0;
  for (const it of items) {
    if (it.quantity <= 0) throw new Error('Quantity must be greater than zero.');
    if (it.costPrice < 0) throw new Error('Cost price cannot be negative.');
    totalAmount += it.quantity * it.costPrice;
  }

  const tx = db.transaction(() => {
    // 1. Insert purchase header
    db.prepare(`
      INSERT INTO purchases (
        id, shop_id, supplier_id, purchase_number, invoice_reference,
        total_amount, items_count, status, notes, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?)
    `).run(
      purchaseId,
      shopId,
      supplierId || null,
      purchaseNumber,
      invoiceReference || null,
      Math.round(totalAmount * 100) / 100,
      items.length,
      notes || null,
      actorName || actorId,
      now
    );

    // 2. Process each item
    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(item.productId, shopId) as any;
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const lineTotal = Math.round(item.quantity * item.costPrice * 100) / 100;
      const itemId = 'pit_' + Math.random().toString(36).substring(2, 10);

      // Insert purchase item
      db.prepare(`
        INSERT INTO purchase_items (
          id, purchase_id, product_id, product_name, quantity,
          cost_price, line_total, batch_number, expiry_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        itemId,
        purchaseId,
        product.id,
        product.name,
        item.quantity,
        item.costPrice,
        lineTotal,
        item.batchNumber || null,
        item.expiryDate || null
      );

      const previousStock = product.stock;
      const newStock = previousStock + item.quantity;

      // Update product stock and cost_price
      db.prepare(`
        UPDATE products 
        SET stock = ?, cost_price = ?, updated_at = ?
        WHERE id = ? AND shop_id = ?
      `).run(newStock, item.costPrice, now, product.id, shopId);

      // Upsert batch if batchNumber provided
      if (item.batchNumber && item.expiryDate) {
        const existingBatch = db.prepare(`
          SELECT * FROM product_batches 
          WHERE shop_id = ? AND product_id = ? AND batch_number = ?
        `).get(shopId, product.id, item.batchNumber) as any;

        if (existingBatch) {
          db.prepare(`
            UPDATE product_batches 
            SET quantity = quantity + ?, cost_price = ?, expiry_date = ?, status = 'ACTIVE', updated_at = ?
            WHERE id = ?
          `).run(item.quantity, item.costPrice, item.expiryDate, now, existingBatch.id);
        } else {
          const batchId = 'pb_' + Math.random().toString(36).substring(2, 10);
          db.prepare(`
            INSERT INTO product_batches (
              id, shop_id, product_id, batch_number, quantity,
              cost_price, received_at, expiry_date, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
          `).run(batchId, shopId, product.id, item.batchNumber, item.quantity, item.costPrice, now, item.expiryDate, now, now);
        }
      }

      // Record stock movement
      recordStockMovement({
        shopId,
        productId: product.id,
        movementType: 'PURCHASE',
        quantityChange: item.quantity,
        previousStock,
        newStock,
        costPrice: item.costPrice,
        referenceId: purchaseId,
        referenceNote: `${purchaseNumber}${invoiceReference ? ` (Bill: ${invoiceReference})` : ''}`,
        actorId,
        actorName,
        createdAt: now,
      });
    }

    // 3. Log audit event
    logAuditEvent({
      actorId,
      actorRole,
      shopId,
      action: 'PURCHASE_STOCK_IN',
      targetType: 'PURCHASE',
      targetId: purchaseId,
      before: null,
      after: {
        purchaseNumber,
        totalAmount,
        itemsCount: items.length,
        supplierId,
        invoiceReference,
      },
    });
  });

  tx();

  const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId);
  const purchaseItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(purchaseId);
  return { purchase, items: purchaseItems };
}

/**
 * Reconciles inventory count from physical stock take.
 */
export function reconcilePhysicalStock(params: {
  shopId: string;
  items: Array<{
    productId: string;
    countedStock: number;
    reason?: AdjustmentReason;
    notes?: string;
  }>;
  actorId: string;
  actorRole: string;
  actorName: string;
}) {
  const { shopId, items, actorId, actorRole, actorName } = params;
  const results: any[] = [];
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(item.productId, shopId) as any;
      if (!product) continue;

      const previousStock = product.stock;
      const newStock = Math.max(0, item.countedStock);
      const diff = newStock - previousStock;

      if (diff !== 0) {
        db.prepare(`
          UPDATE products 
          SET stock = ?, updated_at = ?
          WHERE id = ? AND shop_id = ?
        `).run(newStock, now, product.id, shopId);

        recordStockMovement({
          shopId,
          productId: product.id,
          movementType: 'RECONCILIATION',
          quantityChange: diff,
          previousStock,
          newStock,
          costPrice: product.cost_price,
          referenceId: 'rec_' + Date.now(),
          referenceNote: `Physical Count: ${newStock} (Diff: ${diff >= 0 ? '+' : ''}${diff}) - ${item.notes || item.reason || 'Annual reconciliation'}`,
          actorId,
          actorName,
          createdAt: now,
        });

        logAuditEvent({
          actorId,
          actorRole,
          shopId,
          action: 'STOCK_RECONCILED',
          targetType: 'PRODUCT',
          targetId: product.id,
          before: { stock: previousStock, name: product.name, sku: product.sku },
          after: { stock: newStock, diff, reason: item.reason || 'COUNT_CORRECTION', notes: item.notes },
        });

        results.push({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          previousStock,
          newStock,
          diff,
        });
      }
    }
  });

  tx();

  return { success: true, adjustedCount: results.length, adjustments: results };
}

/**
 * Computes authoritative inventory valuation and operational counts.
 */
export function getInventorySummary(shopId: string) {
  const products = db.prepare('SELECT id, stock, cost_price, price, low_stock_threshold, status FROM products WHERE shop_id = ?').all(shopId) as any[];

  let totalProducts = products.length;
  let activeProducts = 0;
  let totalStockUnits = 0;
  let totalValuation = 0;
  let totalRetailValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    if (p.status === 'ACTIVE') activeProducts++;
    totalStockUnits += p.stock;
    totalValuation += p.stock * (p.cost_price || 0);
    totalRetailValue += p.stock * (p.price || 0);

    if (p.stock === 0) {
      outOfStockCount++;
    } else if (p.stock <= (p.low_stock_threshold || 5)) {
      lowStockCount++;
    }
  }

  // Batches expiry counts
  const today = new Date().toISOString().split('T')[0];
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const expiredBatches = db.prepare(`
    SELECT COUNT(*) as cnt FROM product_batches
    WHERE shop_id = ? AND quantity > 0 AND expiry_date < ?
  `).get(shopId, today) as any;

  const expiringSoonBatches = db.prepare(`
    SELECT COUNT(*) as cnt FROM product_batches
    WHERE shop_id = ? AND quantity > 0 AND expiry_date >= ? AND expiry_date <= ?
  `).get(shopId, today, in30Days) as any;

  return {
    totalProducts,
    activeProducts,
    totalStockUnits,
    totalValuation: Math.round(totalValuation * 100) / 100,
    totalRetailValue: Math.round(totalRetailValue * 100) / 100,
    lowStockCount,
    outOfStockCount,
    expiredBatchesCount: expiredBatches?.cnt || 0,
    expiringSoonBatchesCount: expiringSoonBatches?.cnt || 0,
  };
}
