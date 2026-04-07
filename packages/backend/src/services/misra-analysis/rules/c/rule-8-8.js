"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_8_8 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 8.8
 * The static storage class specifier shall be used in all declarations of objects and functions that have internal linkage.
 */
class Rule_C_8_8 {
    id = 'MISRA-C-8.8';
    description = 'The static storage class specifier shall be used in all declarations of objects and functions that have internal linkage';
    severity = 'required';
    category = 'Declarations';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const internalFuncs = new Map();
        // First pass: find function definitions
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            if (line.includes('{') && !line.includes(';')) {
                const funcMatch = line.match(/\w+\s+(\w+)\s*\(/);
                if (funcMatch && !line.includes('extern')) {
                    internalFuncs.set(funcMatch[1], i);
                }
            }
        }
        // Second pass: check declarations
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            if (line.endsWith(';') && !line.includes('static')) {
                const declMatch = line.match(/\w+\s+(\w+)\s*\(/);
                if (declMatch && internalFuncs.has(declMatch[1])) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Internal function '${declMatch[1]}' declaration should be static`, line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_8_8 = Rule_C_8_8;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTgtOC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLDBIQUEwSCxDQUFDO0lBQ3pJLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBRWhELHdDQUF3QztRQUN4QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMxQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2pDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUNqRCxJQUFJLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDMUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JDLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELGtDQUFrQztRQUNsQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMxQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2pDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDbkQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUNqRCxJQUFJLFNBQVMsSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ2pELFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxzQkFBc0IsU0FBUyxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsRUFDbEUsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUEzQ0QsZ0NBMkNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDguOFxyXG4gKiBUaGUgc3RhdGljIHN0b3JhZ2UgY2xhc3Mgc3BlY2lmaWVyIHNoYWxsIGJlIHVzZWQgaW4gYWxsIGRlY2xhcmF0aW9ucyBvZiBvYmplY3RzIGFuZCBmdW5jdGlvbnMgdGhhdCBoYXZlIGludGVybmFsIGxpbmthZ2UuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzhfOCBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy04LjgnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBzdGF0aWMgc3RvcmFnZSBjbGFzcyBzcGVjaWZpZXIgc2hhbGwgYmUgdXNlZCBpbiBhbGwgZGVjbGFyYXRpb25zIG9mIG9iamVjdHMgYW5kIGZ1bmN0aW9ucyB0aGF0IGhhdmUgaW50ZXJuYWwgbGlua2FnZSc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0RlY2xhcmF0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgaW50ZXJuYWxGdW5jcyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcblxyXG4gICAgLy8gRmlyc3QgcGFzczogZmluZCBmdW5jdGlvbiBkZWZpbml0aW9uc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QubGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXS50cmltKCk7XHJcbiAgICAgIGlmIChsaW5lLmluY2x1ZGVzKCd7JykgJiYgIWxpbmUuaW5jbHVkZXMoJzsnKSkge1xyXG4gICAgICAgIGNvbnN0IGZ1bmNNYXRjaCA9IGxpbmUubWF0Y2goL1xcdytcXHMrKFxcdyspXFxzKlxcKC8pO1xyXG4gICAgICAgIGlmIChmdW5jTWF0Y2ggJiYgIWxpbmUuaW5jbHVkZXMoJ2V4dGVybicpKSB7XHJcbiAgICAgICAgICBpbnRlcm5hbEZ1bmNzLnNldChmdW5jTWF0Y2hbMV0sIGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFNlY29uZCBwYXNzOiBjaGVjayBkZWNsYXJhdGlvbnNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBpZiAobGluZS5lbmRzV2l0aCgnOycpICYmICFsaW5lLmluY2x1ZGVzKCdzdGF0aWMnKSkge1xyXG4gICAgICAgIGNvbnN0IGRlY2xNYXRjaCA9IGxpbmUubWF0Y2goL1xcdytcXHMrKFxcdyspXFxzKlxcKC8pO1xyXG4gICAgICAgIGlmIChkZWNsTWF0Y2ggJiYgaW50ZXJuYWxGdW5jcy5oYXMoZGVjbE1hdGNoWzFdKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgIGBJbnRlcm5hbCBmdW5jdGlvbiAnJHtkZWNsTWF0Y2hbMV19JyBkZWNsYXJhdGlvbiBzaG91bGQgYmUgc3RhdGljYCxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==