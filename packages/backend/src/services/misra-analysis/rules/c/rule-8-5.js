"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_8_5 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 8.5
 * An external object or function shall be declared once in one and only one file.
 */
class Rule_C_8_5 {
    id = 'MISRA-C-8.5';
    description = 'An external object or function shall be declared once in one and only one file';
    severity = 'required';
    category = 'Declarations';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const externDecls = new Map();
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Match extern declarations
            const externMatch = line.match(/extern\s+\w+\s+(\w+)/);
            if (externMatch) {
                const name = externMatch[1];
                if (externDecls.has(name)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `External declaration '${name}' already declared at line ${externDecls.get(name)}`, line));
                }
                else {
                    externDecls.set(name, i + 1);
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_8_5 = Rule_C_8_5;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTgtNS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLGdGQUFnRixDQUFDO0lBQy9GLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBRTlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFakMsNEJBQTRCO1lBQzVCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUN2RCxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNoQixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRTVCLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUMxQixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QseUJBQXlCLElBQUksOEJBQThCLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFDbEYsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO3FCQUFNLENBQUM7b0JBQ04sV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFyQ0QsZ0NBcUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDguNVxyXG4gKiBBbiBleHRlcm5hbCBvYmplY3Qgb3IgZnVuY3Rpb24gc2hhbGwgYmUgZGVjbGFyZWQgb25jZSBpbiBvbmUgYW5kIG9ubHkgb25lIGZpbGUuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzhfNSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy04LjUnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0FuIGV4dGVybmFsIG9iamVjdCBvciBmdW5jdGlvbiBzaGFsbCBiZSBkZWNsYXJlZCBvbmNlIGluIG9uZSBhbmQgb25seSBvbmUgZmlsZSc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0RlY2xhcmF0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgZXh0ZXJuRGVjbHMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gTWF0Y2ggZXh0ZXJuIGRlY2xhcmF0aW9uc1xyXG4gICAgICBjb25zdCBleHRlcm5NYXRjaCA9IGxpbmUubWF0Y2goL2V4dGVyblxccytcXHcrXFxzKyhcXHcrKS8pO1xyXG4gICAgICBpZiAoZXh0ZXJuTWF0Y2gpIHtcclxuICAgICAgICBjb25zdCBuYW1lID0gZXh0ZXJuTWF0Y2hbMV07XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGV4dGVybkRlY2xzLmhhcyhuYW1lKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgIGBFeHRlcm5hbCBkZWNsYXJhdGlvbiAnJHtuYW1lfScgYWxyZWFkeSBkZWNsYXJlZCBhdCBsaW5lICR7ZXh0ZXJuRGVjbHMuZ2V0KG5hbWUpfWAsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBleHRlcm5EZWNscy5zZXQobmFtZSwgaSArIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=