import {expect,test} from "bun:test";
import {financialImportAmount,financialImportDate} from "../../../../src/lib/caixa-importacao";
test("import Brazilian money without losing thousands",()=>{expect(financialImportAmount("R$ 1.234,56")).toBe(1234.56);expect(financialImportAmount("1.000")).toBe(1000);expect(financialImportAmount(20.50)).toBe(20.5);});
test("import exact dates, reject impossible dates",()=>{expect(financialImportDate("24/11/2026")).toBe("2026-11-24");expect(financialImportDate("2026-11-24")).toBe("2026-11-24");expect(()=>financialImportDate("31/02/2026")).toThrow();});