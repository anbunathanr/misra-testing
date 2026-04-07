"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_5_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 5.2
 * Identifiers declared in the same scope shall be distinct.
 */
class Rule_C_5_2 {
    id = 'MISRA-C-5.2';
    description = 'Identifiers declared in the same scope shall be distinct';
    severity = 'required';
    category = 'Identifiers';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const identifiers = new Map();
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Find variable declarations
            const declMatch = line.match(/(?:int|char|float|double|long|short|void)\s+(\w+)/);
            if (declMatch) {
                const id = declMatch[1];
                const prefix = id.substring(0, 63); // Internal identifiers: 63 chars
                if (identifiers.has(prefix)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Identifier '${id}' not distinct from identifier at line ${identifiers.get(prefix)}`, line));
                }
                else {
                    identifiers.set(prefix, i + 1);
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_5_2 = Rule_C_5_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTUtMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLDBEQUEwRCxDQUFDO0lBQ3pFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBRTlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFakMsNkJBQTZCO1lBQzdCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsbURBQW1ELENBQUMsQ0FBQztZQUNsRixJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNkLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEIsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxpQ0FBaUM7Z0JBRXJFLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUM1QixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsZUFBZSxFQUFFLDBDQUEwQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQ3BGLElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztxQkFBTSxDQUFDO29CQUNOLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDakMsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBdENELGdDQXNDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSA1LjJcclxuICogSWRlbnRpZmllcnMgZGVjbGFyZWQgaW4gdGhlIHNhbWUgc2NvcGUgc2hhbGwgYmUgZGlzdGluY3QuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzVfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy01LjInO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0lkZW50aWZpZXJzIGRlY2xhcmVkIGluIHRoZSBzYW1lIHNjb3BlIHNoYWxsIGJlIGRpc3RpbmN0JztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnSWRlbnRpZmllcnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGlkZW50aWZpZXJzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIEZpbmQgdmFyaWFibGUgZGVjbGFyYXRpb25zXHJcbiAgICAgIGNvbnN0IGRlY2xNYXRjaCA9IGxpbmUubWF0Y2goLyg/OmludHxjaGFyfGZsb2F0fGRvdWJsZXxsb25nfHNob3J0fHZvaWQpXFxzKyhcXHcrKS8pO1xyXG4gICAgICBpZiAoZGVjbE1hdGNoKSB7XHJcbiAgICAgICAgY29uc3QgaWQgPSBkZWNsTWF0Y2hbMV07XHJcbiAgICAgICAgY29uc3QgcHJlZml4ID0gaWQuc3Vic3RyaW5nKDAsIDYzKTsgLy8gSW50ZXJuYWwgaWRlbnRpZmllcnM6IDYzIGNoYXJzXHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGlkZW50aWZpZXJzLmhhcyhwcmVmaXgpKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgYElkZW50aWZpZXIgJyR7aWR9JyBub3QgZGlzdGluY3QgZnJvbSBpZGVudGlmaWVyIGF0IGxpbmUgJHtpZGVudGlmaWVycy5nZXQocHJlZml4KX1gLFxyXG4gICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgaWRlbnRpZmllcnMuc2V0KHByZWZpeCwgaSArIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=