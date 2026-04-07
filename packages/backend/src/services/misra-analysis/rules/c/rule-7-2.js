"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_7_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 7.2
 * A "u" or "U" suffix shall be applied to all integer constants that are represented in an unsigned type.
 */
class Rule_C_7_2 {
    id = 'MISRA-C-7.2';
    description = 'A "u" or "U" suffix shall be applied to all integer constants that are represented in an unsigned type';
    severity = 'required';
    category = 'Literals';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i];
            // Check for unsigned variable initialization without U suffix
            const unsignedMatch = line.match(/unsigned\s+(?:int|long|short|char)\s+\w+\s*=\s*(\d+)(?![uUlL])/);
            if (unsignedMatch) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Unsigned constant '${unsignedMatch[1]}' should have 'U' suffix`, line.trim()));
            }
        }
        return violations;
    }
}
exports.Rule_C_7_2 = Rule_C_7_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS03LTIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTctMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLHdHQUF3RyxDQUFDO0lBQ3ZILFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxVQUFVLENBQUM7SUFDdEIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBRW5DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFMUIsOERBQThEO1lBQzlELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZ0VBQWdFLENBQUMsQ0FBQztZQUNuRyxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNsQixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0Qsc0JBQXNCLGFBQWEsQ0FBQyxDQUFDLENBQUMsMEJBQTBCLEVBQ2hFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FDWixDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTlCRCxnQ0E4QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgNy4yXHJcbiAqIEEgXCJ1XCIgb3IgXCJVXCIgc3VmZml4IHNoYWxsIGJlIGFwcGxpZWQgdG8gYWxsIGludGVnZXIgY29uc3RhbnRzIHRoYXQgYXJlIHJlcHJlc2VudGVkIGluIGFuIHVuc2lnbmVkIHR5cGUuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzdfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy03LjInO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0EgXCJ1XCIgb3IgXCJVXCIgc3VmZml4IHNoYWxsIGJlIGFwcGxpZWQgdG8gYWxsIGludGVnZXIgY29uc3RhbnRzIHRoYXQgYXJlIHJlcHJlc2VudGVkIGluIGFuIHVuc2lnbmVkIHR5cGUnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdMaXRlcmFscyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV07XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3IgdW5zaWduZWQgdmFyaWFibGUgaW5pdGlhbGl6YXRpb24gd2l0aG91dCBVIHN1ZmZpeFxyXG4gICAgICBjb25zdCB1bnNpZ25lZE1hdGNoID0gbGluZS5tYXRjaCgvdW5zaWduZWRcXHMrKD86aW50fGxvbmd8c2hvcnR8Y2hhcilcXHMrXFx3K1xccyo9XFxzKihcXGQrKSg/IVt1VWxMXSkvKTtcclxuICAgICAgaWYgKHVuc2lnbmVkTWF0Y2gpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICBgVW5zaWduZWQgY29uc3RhbnQgJyR7dW5zaWduZWRNYXRjaFsxXX0nIHNob3VsZCBoYXZlICdVJyBzdWZmaXhgLFxyXG4gICAgICAgICAgICBsaW5lLnRyaW0oKVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19