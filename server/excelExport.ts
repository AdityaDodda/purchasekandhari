import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from './storage';
import { PrismaClient, inventory, warehouse_delivery } from '@prisma/client';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generatePurchaseRequestExcel(prNumber: string): Promise<string> {
  // 1. Read PR Master Template.xlsx
  const templatePath = path.join(__dirname, '../PR Master Template.xlsx');
  const workbook = xlsx.readFile(templatePath);

  // 2. Fetch purchase request and line items data
  const prData = await storage.getPurchaseRequestWithLineItems(prNumber);
  if (!prData) throw new Error('Purchase request not found');

  // Sheet 1: PR Record
  const prSheet = workbook.Sheets[workbook.SheetNames[0]];
  // Write PR fields to row 2
  prSheet['A2'] = { t: 's', v: prData.pr_number };
  prSheet['B2'] = { t: 's', v: prData.request_date ? new Date(prData.request_date).toISOString().split('T')[0] : '' };
  prSheet['C2'] = { t: 's', v: '' };
  // prData.request_date ? new Date(prData.request_date).toISOString().split('T')[0] :
  prSheet['D2'] = { t: 's', v: 'No' };
  prSheet['E2'] = { t: 's', v: '' };
  prSheet['F2'] = { t: 's', v: prData.title || '' };
  prSheet['G2'] = { t: 's', v: 'Consumption' };

  // Sheet 2: Line Items
  const lineItemsSheet = workbook.Sheets[workbook.SheetNames[1]];
  const startRow = 2; // Data starts at row 2
  for (let i = 0; i < prData.line_items.length; i++) {
    const item = prData.line_items[i];
    const row = startRow + i;
    // Fetch inventory by item_number
    let inventoryData: inventory | null = null;
    const itemNumber = item.item_number || item.itemnumber || '';
    if (itemNumber) {
      inventoryData = await prisma.inventory.findUnique({ where: { itemnumber: itemNumber } });
    }
    // Fetch warehouse_delivery by receiving_warehouse_id (primary key)
    let warehouse: warehouse_delivery | null = null;
    if (item.receiving_warehouse_id) {
      warehouse = await prisma.warehouse_delivery.findUnique({ where: { receiving_warehouse_id: item.receiving_warehouse_id } });
    }
    // Write mapped fields (prefer line_items fields, fallback to inventory if needed)
    lineItemsSheet[`A${row}`] = { t: 's', v: item.pr_number || '' };
    lineItemsSheet[`B${row}`] = { t: 'n', v: i + 1 };
    lineItemsSheet[`C${row}`] = { t: 's', v: prData.request_date ? new Date(prData.request_date).toISOString().split('T')[0] : '' };
    lineItemsSheet[`D${row}`] = { t: 's', v: prData.users_purchase_requests_created_byTousers?.entity || '' };
    lineItemsSheet[`E${row}`] = { t: 's', v: 'INR' };
    lineItemsSheet[`F${row}`] = { t: 's', v: warehouse?.delivery_address_name || '' };
    lineItemsSheet[`G${row}`] = { t: 's', v: warehouse?.delivery_address_name || '' };
    lineItemsSheet[`H${row}`] = { t: 's', v: warehouse?.delivery_address_state_id || '' };
    lineItemsSheet[`I${row}`] = { t: 's', v: warehouse?.delivery_address_street || '' };
    lineItemsSheet[`J${row}`] = { t: 's', v: warehouse?.delivery_address_zipcode || '' };
    lineItemsSheet[`K${row}`] = { t: 's', v: warehouse?.formatted_delivery_address || '' };
    lineItemsSheet[`L${row}`] = { t: 's', v: itemNumber };
    lineItemsSheet[`M${row}`] = { t: 'n', v: 0 };
    lineItemsSheet[`N${row}`] = { t: 's', v: item.productname || inventoryData?.productname || '' };
    lineItemsSheet[`O${row}`] = { t: 's', v: prData.status || '' };
    lineItemsSheet[`P${row}`] = { t: 's', v: inventoryData?.producttype || '' };
    lineItemsSheet[`Q${row}`] = { t: 's', v: 'MISCELLANEOUS' };
    // lineItemsSheet[`Q${row}`] = { t: 's', v: inventoryData?.productcategoryname || '' };
    lineItemsSheet[`R${row}`] = { t: 's', v: inventoryData?.inventoryunitsymbol || '' };
    lineItemsSheet[`S${row}`] = { t: 's', v: prData.department || '' };
    lineItemsSheet[`T${row}`] = { t: 's', v: warehouse?.receiving_site_id || '' };
    lineItemsSheet[`U${row}`] = { t: 's', v: warehouse?.receiving_warehouse_id || '' };
    lineItemsSheet[`V${row}`] = { t: 'n', v: item.requiredquantity || 0 };
    lineItemsSheet[`W${row}`] = { t: 's', v: '' };
    // lineItemsSheet[`X${row}`] = { t: 's', v: item.vendoraccountnumber || '' };
  }

  // 4. Save as {prNumber}.xlsx
  const outputPath = path.join(__dirname, `../uploads/${prNumber}.xlsx`);
  xlsx.writeFile(workbook, outputPath);
  return outputPath;
} 