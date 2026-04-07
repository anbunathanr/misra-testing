"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_8_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 8.4
 * A compatible declaration shall be visible when an object or function with
 * external linkage is defined.
 * Detects function definitions without a prior prototype declaration.
 */
class Rule_C_8_4 {
    id = 'MISRA-C-8.4';
    description = 'A compatible declaration shall be visible when an object or function with external linkage is defined';
    severity = 'required';
    category = 'Declarations';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        // Collect all prototype declarations (lines ending with ;)
        const declaredFunctions = new Set();
        const lines = ast.lines;
        const protoRegex = /^(?:(?:static|extern|inline)\s+)*[\w\s*]+\s+(\w+)\s*\([^)]*\)\s*;/;
        for (const line of lines) {
            const match = line.trim().match(protoRegex);
            if (match) {
                declaredFunctions.add(match[1]);
            }
        }
        // Check function definitions against declarations
        for (const func of ast.functions) {
            // Skip static functions (internal linkage) and main
            if (func.name === 'main')
                continue;
            const funcLine = lines[func.line - 1] || '';
            if (funcLine.includes('static'))
                continue;
            if (!declaredFunctions.has(func.name)) {
                violations.push((0, rule_engine_1.createViolation)(this, func.line, 0, `Function '${func.name}' defined without a prior declaration`, funcLine.trim()));
            }
        }
        return violations;
    }
}
exports.Rule_C_8_4 = Rule_C_8_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTgtNC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7Ozs7O0dBS0c7QUFDSCxNQUFhLFVBQVU7SUFDckIsRUFBRSxHQUFHLGFBQWEsQ0FBQztJQUNuQixXQUFXLEdBQUcsdUdBQXVHLENBQUM7SUFDdEgsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsMkRBQTJEO1FBQzNELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUM1QyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLE1BQU0sVUFBVSxHQUFHLG1FQUFtRSxDQUFDO1FBQ3ZGLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM1QyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNWLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQyxDQUFDO1FBQ0gsQ0FBQztRQUVELGtEQUFrRDtRQUNsRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNqQyxvREFBb0Q7WUFDcEQsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU07Z0JBQUUsU0FBUztZQUVuQyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDNUMsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztnQkFBRSxTQUFTO1lBRTFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixJQUFJLENBQUMsSUFBSSxFQUNULENBQUMsRUFDRCxhQUFhLElBQUksQ0FBQyxJQUFJLHVDQUF1QyxFQUM3RCxRQUFRLENBQUMsSUFBSSxFQUFFLENBQ2hCLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBN0NELGdDQTZDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSA4LjRcclxuICogQSBjb21wYXRpYmxlIGRlY2xhcmF0aW9uIHNoYWxsIGJlIHZpc2libGUgd2hlbiBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gd2l0aFxyXG4gKiBleHRlcm5hbCBsaW5rYWdlIGlzIGRlZmluZWQuXHJcbiAqIERldGVjdHMgZnVuY3Rpb24gZGVmaW5pdGlvbnMgd2l0aG91dCBhIHByaW9yIHByb3RvdHlwZSBkZWNsYXJhdGlvbi5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfOF80IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTguNCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQSBjb21wYXRpYmxlIGRlY2xhcmF0aW9uIHNoYWxsIGJlIHZpc2libGUgd2hlbiBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gd2l0aCBleHRlcm5hbCBsaW5rYWdlIGlzIGRlZmluZWQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdEZWNsYXJhdGlvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICAvLyBDb2xsZWN0IGFsbCBwcm90b3R5cGUgZGVjbGFyYXRpb25zIChsaW5lcyBlbmRpbmcgd2l0aCA7KVxyXG4gICAgY29uc3QgZGVjbGFyZWRGdW5jdGlvbnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIGNvbnN0IHByb3RvUmVnZXggPSAvXig/Oig/OnN0YXRpY3xleHRlcm58aW5saW5lKVxccyspKltcXHdcXHMqXStcXHMrKFxcdyspXFxzKlxcKFteKV0qXFwpXFxzKjsvO1xyXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XHJcbiAgICAgIGNvbnN0IG1hdGNoID0gbGluZS50cmltKCkubWF0Y2gocHJvdG9SZWdleCk7XHJcbiAgICAgIGlmIChtYXRjaCkge1xyXG4gICAgICAgIGRlY2xhcmVkRnVuY3Rpb25zLmFkZChtYXRjaFsxXSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBmdW5jdGlvbiBkZWZpbml0aW9ucyBhZ2FpbnN0IGRlY2xhcmF0aW9uc1xyXG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGFzdC5mdW5jdGlvbnMpIHtcclxuICAgICAgLy8gU2tpcCBzdGF0aWMgZnVuY3Rpb25zIChpbnRlcm5hbCBsaW5rYWdlKSBhbmQgbWFpblxyXG4gICAgICBpZiAoZnVuYy5uYW1lID09PSAnbWFpbicpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgZnVuY0xpbmUgPSBsaW5lc1tmdW5jLmxpbmUgLSAxXSB8fCAnJztcclxuICAgICAgaWYgKGZ1bmNMaW5lLmluY2x1ZGVzKCdzdGF0aWMnKSkgY29udGludWU7XHJcblxyXG4gICAgICBpZiAoIWRlY2xhcmVkRnVuY3Rpb25zLmhhcyhmdW5jLm5hbWUpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBmdW5jLmxpbmUsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgIGBGdW5jdGlvbiAnJHtmdW5jLm5hbWV9JyBkZWZpbmVkIHdpdGhvdXQgYSBwcmlvciBkZWNsYXJhdGlvbmAsXHJcbiAgICAgICAgICAgIGZ1bmNMaW5lLnRyaW0oKVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19