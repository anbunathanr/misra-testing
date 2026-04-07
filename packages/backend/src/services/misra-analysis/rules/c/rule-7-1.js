"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_7_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 7.1
 * Octal constants shall not be used.
 */
class Rule_C_7_1 {
    id = 'MISRA-C-7.1';
    description = 'Octal constants shall not be used';
    severity = 'required';
    category = 'Literals';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i];
            // Match octal constants (0 followed by digits)
            const octalMatch = line.match(/\b0[0-7]+\b/g);
            if (octalMatch) {
                for (const octal of octalMatch) {
                    // Exclude single 0
                    if (octal !== '0') {
                        violations.push((0, rule_engine_1.createViolation)(this, i + 1, line.indexOf(octal), `Octal constant '${octal}' used`, line.trim()));
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_7_1 = Rule_C_7_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS03LTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTctMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLG1DQUFtQyxDQUFDO0lBQ2xELFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxVQUFVLENBQUM7SUFDdEIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBRW5DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFMUIsK0NBQStDO1lBQy9DLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDOUMsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDZixLQUFLLE1BQU0sS0FBSyxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUMvQixtQkFBbUI7b0JBQ25CLElBQUksS0FBSyxLQUFLLEdBQUcsRUFBRSxDQUFDO3dCQUNsQixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUNuQixtQkFBbUIsS0FBSyxRQUFRLEVBQ2hDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FDWixDQUNGLENBQUM7b0JBQ0osQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFuQ0QsZ0NBbUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDcuMVxyXG4gKiBPY3RhbCBjb25zdGFudHMgc2hhbGwgbm90IGJlIHVzZWQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzdfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy03LjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ09jdGFsIGNvbnN0YW50cyBzaGFsbCBub3QgYmUgdXNlZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0xpdGVyYWxzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QubGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXTtcclxuICAgICAgXHJcbiAgICAgIC8vIE1hdGNoIG9jdGFsIGNvbnN0YW50cyAoMCBmb2xsb3dlZCBieSBkaWdpdHMpXHJcbiAgICAgIGNvbnN0IG9jdGFsTWF0Y2ggPSBsaW5lLm1hdGNoKC9cXGIwWzAtN10rXFxiL2cpO1xyXG4gICAgICBpZiAob2N0YWxNYXRjaCkge1xyXG4gICAgICAgIGZvciAoY29uc3Qgb2N0YWwgb2Ygb2N0YWxNYXRjaCkge1xyXG4gICAgICAgICAgLy8gRXhjbHVkZSBzaW5nbGUgMFxyXG4gICAgICAgICAgaWYgKG9jdGFsICE9PSAnMCcpIHtcclxuICAgICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAgIGxpbmUuaW5kZXhPZihvY3RhbCksXHJcbiAgICAgICAgICAgICAgICBgT2N0YWwgY29uc3RhbnQgJyR7b2N0YWx9JyB1c2VkYCxcclxuICAgICAgICAgICAgICAgIGxpbmUudHJpbSgpXHJcbiAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=