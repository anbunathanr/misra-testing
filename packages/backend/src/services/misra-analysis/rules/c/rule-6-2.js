"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_6_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 6.2
 * Single-bit named bit fields shall not be of a signed type.
 */
class Rule_C_6_2 {
    id = 'MISRA-C-6.2';
    description = 'Single-bit named bit fields shall not be of a signed type';
    severity = 'required';
    category = 'Types';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Match single-bit signed bit-fields
            const bitfieldMatch = line.match(/(signed\s+int|signed|int)\s+(\w+)\s*:\s*1/);
            if (bitfieldMatch) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Single-bit field '${bitfieldMatch[2]}' should not be signed`, line));
            }
        }
        return violations;
    }
}
exports.Rule_C_6_2 = Rule_C_6_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS02LTIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTYtMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLDJEQUEyRCxDQUFDO0lBQzFFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxPQUFPLENBQUM7SUFDbkIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBRW5DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFakMscUNBQXFDO1lBQ3JDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQztZQUM5RSxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNsQixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QscUJBQXFCLGFBQWEsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLEVBQzdELElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTlCRCxnQ0E4QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgNi4yXHJcbiAqIFNpbmdsZS1iaXQgbmFtZWQgYml0IGZpZWxkcyBzaGFsbCBub3QgYmUgb2YgYSBzaWduZWQgdHlwZS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfNl8yIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTYuMic7XHJcbiAgZGVzY3JpcHRpb24gPSAnU2luZ2xlLWJpdCBuYW1lZCBiaXQgZmllbGRzIHNoYWxsIG5vdCBiZSBvZiBhIHNpZ25lZCB0eXBlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnVHlwZXMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIE1hdGNoIHNpbmdsZS1iaXQgc2lnbmVkIGJpdC1maWVsZHNcclxuICAgICAgY29uc3QgYml0ZmllbGRNYXRjaCA9IGxpbmUubWF0Y2goLyhzaWduZWRcXHMraW50fHNpZ25lZHxpbnQpXFxzKyhcXHcrKVxccyo6XFxzKjEvKTtcclxuICAgICAgaWYgKGJpdGZpZWxkTWF0Y2gpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICBgU2luZ2xlLWJpdCBmaWVsZCAnJHtiaXRmaWVsZE1hdGNoWzJdfScgc2hvdWxkIG5vdCBiZSBzaWduZWRgLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=