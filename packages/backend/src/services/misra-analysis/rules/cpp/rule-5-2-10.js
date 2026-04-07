"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_5_2_10 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 5-2-10
 * The increment (++) and decrement (--) operators should not be mixed with other operators in an expression.
 */
class Rule_CPP_5_2_10 {
    id = 'MISRA-CPP-5.2.10';
    description = 'Increment/decrement operators shall not be mixed with other operators';
    severity = 'advisory';
    category = 'Expressions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // ++ or -- mixed with other operators: a = b++; x = ++y + z;
            if (/(\+\+|--)/.test(line) && /[+\-*\/=]/.test(line) && !/^\s*\w+\s*(\+\+|--)\s*;/.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Increment/decrement operator mixed with other operators', line));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_5_2_10 = Rule_CPP_5_2_10;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTItMTAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTUtMi0xMC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxlQUFlO0lBQzFCLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQztJQUN4QixXQUFXLEdBQUcsdUVBQXVFLENBQUM7SUFDdEYsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGFBQWEsQ0FBQztJQUN6QixRQUFRLEdBQUcsS0FBYyxDQUFDO0lBRTFCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSw2REFBNkQ7WUFDN0QsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDOUYsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELHlEQUF5RCxFQUN6RCxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUEvQkQsMENBK0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgNS0yLTEwXHJcbiAqIFRoZSBpbmNyZW1lbnQgKCsrKSBhbmQgZGVjcmVtZW50ICgtLSkgb3BlcmF0b3JzIHNob3VsZCBub3QgYmUgbWl4ZWQgd2l0aCBvdGhlciBvcGVyYXRvcnMgaW4gYW4gZXhwcmVzc2lvbi5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF81XzJfMTAgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC01LjIuMTAnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0luY3JlbWVudC9kZWNyZW1lbnQgb3BlcmF0b3JzIHNoYWxsIG5vdCBiZSBtaXhlZCB3aXRoIG90aGVyIG9wZXJhdG9ycyc7XHJcbiAgc2V2ZXJpdHkgPSAnYWR2aXNvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0V4cHJlc3Npb25zJztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyArKyBvciAtLSBtaXhlZCB3aXRoIG90aGVyIG9wZXJhdG9yczogYSA9IGIrKzsgeCA9ICsreSArIHo7XHJcbiAgICAgIGlmICgvKFxcK1xcK3wtLSkvLnRlc3QobGluZSkgJiYgL1srXFwtKlxcLz1dLy50ZXN0KGxpbmUpICYmICEvXlxccypcXHcrXFxzKihcXCtcXCt8LS0pXFxzKjsvLnRlc3QobGluZSkpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAnSW5jcmVtZW50L2RlY3JlbWVudCBvcGVyYXRvciBtaXhlZCB3aXRoIG90aGVyIG9wZXJhdG9ycycsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==