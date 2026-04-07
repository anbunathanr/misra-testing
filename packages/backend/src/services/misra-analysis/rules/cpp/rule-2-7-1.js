"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_2_7_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 2-7-1
 * The character sequence /* shall not be used within a C-style comment.
 * Also: Trigraphs shall not be used.
 * Detects trigraph sequences like ??=, ??/, ??', etc.
 */
class Rule_CPP_2_7_1 {
    id = 'MISRA-CPP-2.7.1';
    description = 'Trigraphs shall not be used';
    severity = 'required';
    category = 'Lexical conventions';
    language = 'CPP';
    trigraphs = ['??=', '??/', "??'", '??(', '??)', '??!', '??<', '??>', '??-'];
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const trigraph of this.trigraphs) {
                if (line.includes(trigraph)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, line.indexOf(trigraph), `Trigraph '${trigraph}' shall not be used`, line.trim()));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_2_7_1 = Rule_CPP_2_7_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yLTctMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMi03LTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7OztHQUtHO0FBQ0gsTUFBYSxjQUFjO0lBQ3pCLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQztJQUN2QixXQUFXLEdBQUcsNkJBQTZCLENBQUM7SUFDNUMsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLHFCQUFxQixDQUFDO0lBQ2pDLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFVCxTQUFTLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRTdGLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQzVCLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQ3RCLGFBQWEsUUFBUSxxQkFBcUIsRUFDMUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUNaLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFoQ0Qsd0NBZ0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgMi03LTFcclxuICogVGhlIGNoYXJhY3RlciBzZXF1ZW5jZSAvKiBzaGFsbCBub3QgYmUgdXNlZCB3aXRoaW4gYSBDLXN0eWxlIGNvbW1lbnQuXHJcbiAqIEFsc286IFRyaWdyYXBocyBzaGFsbCBub3QgYmUgdXNlZC5cclxuICogRGV0ZWN0cyB0cmlncmFwaCBzZXF1ZW5jZXMgbGlrZSA/Pz0sID8/LywgPz8nLCBldGMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfMl83XzEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC0yLjcuMSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVHJpZ3JhcGhzIHNoYWxsIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnTGV4aWNhbCBjb252ZW50aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgcHJpdmF0ZSByZWFkb25seSB0cmlncmFwaHMgPSBbJz8/PScsICc/Py8nLCBcIj8/J1wiLCAnPz8oJywgJz8/KScsICc/PyEnLCAnPz88JywgJz8/PicsICc/Py0nXTtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuICAgICAgZm9yIChjb25zdCB0cmlncmFwaCBvZiB0aGlzLnRyaWdyYXBocykge1xyXG4gICAgICAgIGlmIChsaW5lLmluY2x1ZGVzKHRyaWdyYXBoKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICBsaW5lLmluZGV4T2YodHJpZ3JhcGgpLFxyXG4gICAgICAgICAgICAgIGBUcmlncmFwaCAnJHt0cmlncmFwaH0nIHNoYWxsIG5vdCBiZSB1c2VkYCxcclxuICAgICAgICAgICAgICBsaW5lLnRyaW0oKVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=