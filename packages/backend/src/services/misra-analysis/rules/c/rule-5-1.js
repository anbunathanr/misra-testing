"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_5_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 5.1
 * External identifiers shall be distinct.
 */
class Rule_C_5_1 {
    id = 'MISRA-C-5.1';
    description = 'External identifiers shall be distinct';
    severity = 'required';
    category = 'Identifiers';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const externalIds = new Map();
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Find external declarations
            const externMatch = line.match(/extern\s+(?:\w+\s+)*(\w+)\s*[;(]/);
            if (externMatch) {
                const id = externMatch[1];
                const prefix = id.substring(0, 31); // C99 requires 31 char significance
                if (externalIds.has(prefix)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `External identifier '${id}' not distinct from identifier at line ${externalIds.get(prefix)}`, line));
                }
                else {
                    externalIds.set(prefix, i + 1);
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_5_1 = Rule_C_5_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTUtMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLHdDQUF3QyxDQUFDO0lBQ3ZELFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBRTlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFakMsNkJBQTZCO1lBQzdCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztZQUNuRSxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNoQixNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0NBQW9DO2dCQUV4RSxJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDNUIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELHdCQUF3QixFQUFFLDBDQUEwQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQzdGLElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztxQkFBTSxDQUFDO29CQUNOLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDakMsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBdENELGdDQXNDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSA1LjFcclxuICogRXh0ZXJuYWwgaWRlbnRpZmllcnMgc2hhbGwgYmUgZGlzdGluY3QuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzVfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy01LjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0V4dGVybmFsIGlkZW50aWZpZXJzIHNoYWxsIGJlIGRpc3RpbmN0JztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnSWRlbnRpZmllcnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGV4dGVybmFsSWRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIEZpbmQgZXh0ZXJuYWwgZGVjbGFyYXRpb25zXHJcbiAgICAgIGNvbnN0IGV4dGVybk1hdGNoID0gbGluZS5tYXRjaCgvZXh0ZXJuXFxzKyg/OlxcdytcXHMrKSooXFx3KylcXHMqWzsoXS8pO1xyXG4gICAgICBpZiAoZXh0ZXJuTWF0Y2gpIHtcclxuICAgICAgICBjb25zdCBpZCA9IGV4dGVybk1hdGNoWzFdO1xyXG4gICAgICAgIGNvbnN0IHByZWZpeCA9IGlkLnN1YnN0cmluZygwLCAzMSk7IC8vIEM5OSByZXF1aXJlcyAzMSBjaGFyIHNpZ25pZmljYW5jZVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChleHRlcm5hbElkcy5oYXMocHJlZml4KSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgIGBFeHRlcm5hbCBpZGVudGlmaWVyICcke2lkfScgbm90IGRpc3RpbmN0IGZyb20gaWRlbnRpZmllciBhdCBsaW5lICR7ZXh0ZXJuYWxJZHMuZ2V0KHByZWZpeCl9YCxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGV4dGVybmFsSWRzLnNldChwcmVmaXgsIGkgKyAxKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19