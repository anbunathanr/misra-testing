"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_21_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 21.3
 * The memory allocation and deallocation functions of <stdlib.h> shall not be used.
 * Detects use of malloc, calloc, realloc, free.
 */
class Rule_C_21_3 {
    id = 'MISRA-C-21.3';
    description = 'The memory allocation and deallocation functions of <stdlib.h> shall not be used';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    forbiddenFunctions = ['malloc', 'calloc', 'realloc', 'free'];
    async check(ast, sourceCode) {
        const violations = [];
        for (const token of ast.tokens) {
            if (token.type === 'identifier' && this.forbiddenFunctions.includes(token.value)) {
                const line = ast.lines[token.line - 1] || '';
                // Make sure it's a function call (followed by '(')
                const lineAfter = line.slice(line.indexOf(token.value) + token.value.length).trim();
                if (lineAfter.startsWith('(')) {
                    violations.push((0, rule_engine_1.createViolation)(this, token.line, token.column, `Use of '${token.value}' is not permitted (MISRA C 21.3)`, line.trim()));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_21_3 = Rule_C_21_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yMS0zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0yMS0zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7OztHQUlHO0FBQ0gsTUFBYSxXQUFXO0lBQ3RCLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFDcEIsV0FBVyxHQUFHLGtGQUFrRixDQUFDO0lBQ2pHLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQztJQUNoQyxRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRVAsa0JBQWtCLEdBQUcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUU5RSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBRW5DLEtBQUssTUFBTSxLQUFLLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQy9CLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxZQUFZLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakYsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDN0MsbURBQW1EO2dCQUNuRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3BGLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUM5QixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osS0FBSyxDQUFDLElBQUksRUFDVixLQUFLLENBQUMsTUFBTSxFQUNaLFdBQVcsS0FBSyxDQUFDLEtBQUssbUNBQW1DLEVBQ3pELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FDWixDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBakNELGtDQWlDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAyMS4zXHJcbiAqIFRoZSBtZW1vcnkgYWxsb2NhdGlvbiBhbmQgZGVhbGxvY2F0aW9uIGZ1bmN0aW9ucyBvZiA8c3RkbGliLmg+IHNoYWxsIG5vdCBiZSB1c2VkLlxyXG4gKiBEZXRlY3RzIHVzZSBvZiBtYWxsb2MsIGNhbGxvYywgcmVhbGxvYywgZnJlZS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjFfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMS4zJztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgbWVtb3J5IGFsbG9jYXRpb24gYW5kIGRlYWxsb2NhdGlvbiBmdW5jdGlvbnMgb2YgPHN0ZGxpYi5oPiBzaGFsbCBub3QgYmUgdXNlZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1N0YW5kYXJkIGxpYnJhcmllcyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIHByaXZhdGUgcmVhZG9ubHkgZm9yYmlkZGVuRnVuY3Rpb25zID0gWydtYWxsb2MnLCAnY2FsbG9jJywgJ3JlYWxsb2MnLCAnZnJlZSddO1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IHRva2VuIG9mIGFzdC50b2tlbnMpIHtcclxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09ICdpZGVudGlmaWVyJyAmJiB0aGlzLmZvcmJpZGRlbkZ1bmN0aW9ucy5pbmNsdWRlcyh0b2tlbi52YWx1ZSkpIHtcclxuICAgICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW3Rva2VuLmxpbmUgLSAxXSB8fCAnJztcclxuICAgICAgICAvLyBNYWtlIHN1cmUgaXQncyBhIGZ1bmN0aW9uIGNhbGwgKGZvbGxvd2VkIGJ5ICcoJylcclxuICAgICAgICBjb25zdCBsaW5lQWZ0ZXIgPSBsaW5lLnNsaWNlKGxpbmUuaW5kZXhPZih0b2tlbi52YWx1ZSkgKyB0b2tlbi52YWx1ZS5sZW5ndGgpLnRyaW0oKTtcclxuICAgICAgICBpZiAobGluZUFmdGVyLnN0YXJ0c1dpdGgoJygnKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICB0b2tlbi5saW5lLFxyXG4gICAgICAgICAgICAgIHRva2VuLmNvbHVtbixcclxuICAgICAgICAgICAgICBgVXNlIG9mICcke3Rva2VuLnZhbHVlfScgaXMgbm90IHBlcm1pdHRlZCAoTUlTUkEgQyAyMS4zKWAsXHJcbiAgICAgICAgICAgICAgbGluZS50cmltKClcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19