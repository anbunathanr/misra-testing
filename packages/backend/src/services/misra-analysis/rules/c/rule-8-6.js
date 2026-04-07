"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_8_6 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 8.6
 * An identifier with external linkage shall have exactly one external definition.
 */
class Rule_C_8_6 {
    id = 'MISRA-C-8.6';
    description = 'An identifier with external linkage shall have exactly one external definition';
    severity = 'required';
    category = 'Declarations';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const definitions = new Map();
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Match function definitions (not declarations)
            if (line.includes('{') && !line.includes(';')) {
                const funcMatch = line.match(/\w+\s+(\w+)\s*\(/);
                if (funcMatch) {
                    const name = funcMatch[1];
                    if (definitions.has(name)) {
                        violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Multiple definitions of '${name}' (first at line ${definitions.get(name)})`, line));
                    }
                    else {
                        definitions.set(name, i + 1);
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_8_6 = Rule_C_8_6;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTgtNi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLGdGQUFnRixDQUFDO0lBQy9GLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBRTlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFakMsZ0RBQWdEO1lBQ2hELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUNqRCxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNkLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFFMUIsSUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQzFCLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCw0QkFBNEIsSUFBSSxvQkFBb0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUM1RSxJQUFJLENBQ0wsQ0FDRixDQUFDO29CQUNKLENBQUM7eUJBQU0sQ0FBQzt3QkFDTixXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQy9CLENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBdkNELGdDQXVDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSA4LjZcclxuICogQW4gaWRlbnRpZmllciB3aXRoIGV4dGVybmFsIGxpbmthZ2Ugc2hhbGwgaGF2ZSBleGFjdGx5IG9uZSBleHRlcm5hbCBkZWZpbml0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ184XzYgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtOC42JztcclxuICBkZXNjcmlwdGlvbiA9ICdBbiBpZGVudGlmaWVyIHdpdGggZXh0ZXJuYWwgbGlua2FnZSBzaGFsbCBoYXZlIGV4YWN0bHkgb25lIGV4dGVybmFsIGRlZmluaXRpb24nO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdEZWNsYXJhdGlvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGRlZmluaXRpb25zID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIE1hdGNoIGZ1bmN0aW9uIGRlZmluaXRpb25zIChub3QgZGVjbGFyYXRpb25zKVxyXG4gICAgICBpZiAobGluZS5pbmNsdWRlcygneycpICYmICFsaW5lLmluY2x1ZGVzKCc7JykpIHtcclxuICAgICAgICBjb25zdCBmdW5jTWF0Y2ggPSBsaW5lLm1hdGNoKC9cXHcrXFxzKyhcXHcrKVxccypcXCgvKTtcclxuICAgICAgICBpZiAoZnVuY01hdGNoKSB7XHJcbiAgICAgICAgICBjb25zdCBuYW1lID0gZnVuY01hdGNoWzFdO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoZGVmaW5pdGlvbnMuaGFzKG5hbWUpKSB7XHJcbiAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICAgYE11bHRpcGxlIGRlZmluaXRpb25zIG9mICcke25hbWV9JyAoZmlyc3QgYXQgbGluZSAke2RlZmluaXRpb25zLmdldChuYW1lKX0pYCxcclxuICAgICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkZWZpbml0aW9ucy5zZXQobmFtZSwgaSArIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=