"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_6_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 6.1
 * Bit-fields shall only be declared with an appropriate type.
 */
class Rule_C_6_1 {
    id = 'MISRA-C-6.1';
    description = 'Bit-fields shall only be declared with an appropriate type';
    severity = 'required';
    category = 'Types';
    language = 'C';
    allowedTypes = new Set([
        'unsigned int', 'signed int', '_Bool', 'unsigned', 'signed'
    ]);
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Match bit-field declarations: type name : width;
            const bitfieldMatch = line.match(/(\w+(?:\s+\w+)?)\s+\w+\s*:\s*\d+/);
            if (bitfieldMatch) {
                const type = bitfieldMatch[1].trim();
                if (!this.allowedTypes.has(type)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Bit-field declared with inappropriate type '${type}'`, line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_6_1 = Rule_C_6_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS02LTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTYtMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLDREQUE0RCxDQUFDO0lBQzNFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxPQUFPLENBQUM7SUFDbkIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUVQLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQztRQUN0QyxjQUFjLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUTtLQUM1RCxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBRW5DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFakMsbURBQW1EO1lBQ25ELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztZQUNyRSxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNsQixNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBRXJDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUNqQyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsK0NBQStDLElBQUksR0FBRyxFQUN0RCxJQUFJLENBQ0wsQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQXRDRCxnQ0FzQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgNi4xXHJcbiAqIEJpdC1maWVsZHMgc2hhbGwgb25seSBiZSBkZWNsYXJlZCB3aXRoIGFuIGFwcHJvcHJpYXRlIHR5cGUuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzZfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy02LjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0JpdC1maWVsZHMgc2hhbGwgb25seSBiZSBkZWNsYXJlZCB3aXRoIGFuIGFwcHJvcHJpYXRlIHR5cGUnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdUeXBlcyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIHByaXZhdGUgcmVhZG9ubHkgYWxsb3dlZFR5cGVzID0gbmV3IFNldChbXHJcbiAgICAndW5zaWduZWQgaW50JywgJ3NpZ25lZCBpbnQnLCAnX0Jvb2wnLCAndW5zaWduZWQnLCAnc2lnbmVkJ1xyXG4gIF0pO1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIE1hdGNoIGJpdC1maWVsZCBkZWNsYXJhdGlvbnM6IHR5cGUgbmFtZSA6IHdpZHRoO1xyXG4gICAgICBjb25zdCBiaXRmaWVsZE1hdGNoID0gbGluZS5tYXRjaCgvKFxcdysoPzpcXHMrXFx3Kyk/KVxccytcXHcrXFxzKjpcXHMqXFxkKy8pO1xyXG4gICAgICBpZiAoYml0ZmllbGRNYXRjaCkge1xyXG4gICAgICAgIGNvbnN0IHR5cGUgPSBiaXRmaWVsZE1hdGNoWzFdLnRyaW0oKTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoIXRoaXMuYWxsb3dlZFR5cGVzLmhhcyh0eXBlKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgIGBCaXQtZmllbGQgZGVjbGFyZWQgd2l0aCBpbmFwcHJvcHJpYXRlIHR5cGUgJyR7dHlwZX0nYCxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==