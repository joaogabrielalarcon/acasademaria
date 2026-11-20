import { expect, test } from "bun:test";
import { FINANCIAL_RECEIPT_MAX_BYTES, FINANCIAL_RECEIPT_URL_SECONDS, validateFinancialReceipt } from "../../../../src/lib/financeiro-comprovantes";

test("financial receipts accept exactly ten MB, refuse eleven MB", () => {
  expect(FINANCIAL_RECEIPT_MAX_BYTES).toBe(10485760);
  expect(validateFinancialReceipt({ size: 10485760, type: "application/pdf" })).toBe("pdf");
  expect(() => validateFinancialReceipt({ size: 10485761, type: "application/pdf" })).toThrow();
});
test("receipts reject empty or executable files", () => {
  expect(() => validateFinancialReceipt({ size: 0, type: "image/png" })).toThrow();
  expect(() => validateFinancialReceipt({ size: 100, type: "application/javascript" })).toThrow();
});
test("signed receipt links last five minutes", () => expect(FINANCIAL_RECEIPT_URL_SECONDS).toBe(300));