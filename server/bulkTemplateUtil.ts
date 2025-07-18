import XLSX from "xlsx";

// Field definitions based on schema.prisma
const masterFields: Record<string, { label: string; key: string }[]> = {
  users: [
    { label: "Employee Code", key: "emp_code" },
    { label: "Name", key: "name" },
    { label: "Email", key: "email" },
    { label: "Mobile No", key: "mobile_no" },
    { label: "Department", key: "department" },
    { label: "Manager Name", key: "manager_name" },
    { label: "Manager Email", key: "manager_email" },
    { label: "Entity", key: "entity" },
    { label: "Location", key: "location" },
    { label: "Site", key: "site" },
    { label: "Role", key: "role" },
    { label: "Description", key: "description" },
    { label: "ERP ID", key: "erp_id" },
    // password and must_reset_password are not included for import template
  ],
  departments: [
    { label: "Department Number", key: "dept_number" },
    { label: "Department Name", key: "dept_name" },
  ],
  sites: [
    { label: "ID", key: "id" },
    { label: "Legal Entity", key: "Legal_Entity" },
    { label: "Site ID", key: "Site_ID" },
    { label: "Site Name", key: "Site_Name" },
  ],
  approval_matrix: [
    { label: "Employee Code", key: "emp_code" },
    { label: "Name", key: "name" },
    { label: "Email", key: "email" },
    { label: "Mobile No", key: "mobile_no" },
    { label: "Site", key: "site" },
    { label: "Department", key: "department" },
    { label: "Approver 1 Name", key: "approver_1_name" },
    { label: "Approver 1 Email", key: "approver_1_email" },
    { label: "Approver 1 Employee Code", key: "approver_1_emp_code" },
    { label: "Approver 2 Name", key: "approver_2_name" },
    { label: "Approver 2 Email", key: "approver_2_email" },
    { label: "Approver 2 Employee Code", key: "approver_2_emp_code" },
    { label: "Approver 3A Name", key: "approver_3a_name" },
    { label: "Approver 3A Email", key: "approver_3a_email" },
    { label: "Approver 3A Employee Code", key: "approver_3a_emp_code" },
    { label: "Approver 3B Name", key: "approver_3b_name" },
    { label: "Approver 3B Email", key: "approver_3b_email" },
    { label: "Approver 3B Employee Code", key: "approver_3b_emp_code" },
  ],
  inventory: [
    { label: "Item Number", key: "itemnumber" },
    { label: "BOM Unit Symbol", key: "bomunitsymbol" },
    { label: "Inventory Reservation Hierarchy Name", key: "inventoryreservationhierarchyname" },
    { label: "Inventory Unit Symbol", key: "inventoryunitsymbol" },
    { label: "Is Catch Weight Product", key: "iscatchweightproduct" },
    { label: "Is Product Kit", key: "isproductkit" },
    { label: "Item Model Group ID", key: "itemmodelgroupid" },
    { label: "Lower Warrantable Price Range Limit", key: "lowerwarrantablepricerangelimit" },
    { label: "Product Category Name", key: "productcategoryname" },
    { label: "Product Description", key: "productdescription" },
    { label: "Product Dimension Group Name", key: "productdimensiongroupname" },
    { label: "Product Group ID", key: "productgroupid" },
    { label: "Product Name", key: "productname" },
    { label: "Product Number", key: "productnumber" },
    { label: "Product Search Name", key: "productsearchname" },
    { label: "Product Subtype", key: "productsubtype" },
    { label: "Product Type", key: "producttype" },
    { label: "Purchase Sales Tax Item Group Code", key: "purchasesalestaxitemgroupcode" },
    { label: "Purchase Unit Symbol", key: "purchaseunitsymbol" },
    { label: "Retail Product Category Name", key: "retailproductcategoryname" },
    { label: "Sales Sales Tax Item Group Code", key: "salessalestaxitemgroupcode" },
    { label: "Sales Unit Symbol", key: "salesunitsymbol" },
    { label: "Search Name", key: "searchname" },
    { label: "Service Type", key: "servicetype" },
    { label: "Storage Dimension Group Name", key: "storagedimensiongroupname" },
    { label: "Tracking Dimension Group Name", key: "trackingdimensiongroupname" },
    { label: "Upper Warrantable Price Range Limit", key: "upperwarrantablepricerangelimit" },
    { label: "Variant Configuration Technology", key: "variantconfigurationtechnology" },
    { label: "Warrantable Price Range Base Type", key: "warrantablepricerangebasetype" },
    { label: "Warranty Duration Time", key: "warrantydurationtime" },
    { label: "Warranty Duration Time Unit", key: "warrantydurationtimeunit" },
  ],
  vendors: [
    { label: "Vendor Account Number", key: "vendoraccountnumber" },
    { label: "Address City", key: "addresscity" },
    { label: "Address Country/Region ID", key: "addresscountryregionid" },
    { label: "Address State ID", key: "addressstateid" },
    { label: "Address Street", key: "addressstreet" },
    { label: "Address Zip Code", key: "addresszipcode" },
    { label: "Currency Code", key: "currencycode" },
    { label: "PAN Number", key: "pannumber" },
    { label: "PAN Status", key: "panstatus" },
    { label: "Vendor Group ID", key: "vendorgroupid" },
    { label: "Vendor Organization Name", key: "vendororganizationname" },
    { label: "Vendor Search Name", key: "vendorsearchname" },
  ],
};

export function generateBulkTemplateXLSX(masterType: string): Buffer {
  const fields = masterFields[masterType];
  if (!fields) throw new Error("Unknown master type");
  // Use keys as headers for import compatibility
  const ws = XLSX.utils.aoa_to_sheet([fields.map(f => f.key)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export { masterFields };