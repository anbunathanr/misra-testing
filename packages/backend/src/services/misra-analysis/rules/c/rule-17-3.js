"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_17_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 17.3
 * A function shall not be declared implicitly.
 */
class Rule_C_17_3 {
    id = 'MISRA-C-17.3';
    description = 'A function shall not be declared implicitly';
    severity = 'mandatory';
    category = 'Functions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const declaredFunctions = new Set();
        // Collect all declared functions
        for (const func of ast.functions) {
            declaredFunctions.add(func.name);
        }
        // Check for function calls without declarations
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Look for function calls
            const callMatch = line.match(/\b(\w+)\s*\(/);
            if (callMatch) {
                const funcName = callMatch[1];
                // Skip standard library functions and keywords
                const stdFunctions = ['printf', 'scanf', 'malloc', 'free', 'sizeof', 'if', 'while', 'for', 'switch'];
                if (stdFunctions.includes(funcName))
                    continue;
                // Check if function was declared
                if (!declaredFunctions.has(funcName)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Function '${funcName}' called without explicit declaration`, line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_17_3 = Rule_C_17_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNy0zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNy0zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsNkNBQTZDLENBQUM7SUFDNUQsUUFBUSxHQUFHLFdBQW9CLENBQUM7SUFDaEMsUUFBUSxHQUFHLFdBQVcsQ0FBQztJQUN2QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBRTVDLGlDQUFpQztRQUNqQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNqQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLENBQUM7UUFFRCxnREFBZ0Q7UUFDaEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQywwQkFBMEI7WUFDMUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM3QyxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNkLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFOUIsK0NBQStDO2dCQUMvQyxNQUFNLFlBQVksR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3JHLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7b0JBQUUsU0FBUztnQkFFOUMsaUNBQWlDO2dCQUNqQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQ3JDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxhQUFhLFFBQVEsdUNBQXVDLEVBQzVELElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBOUNELGtDQThDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAxNy4zXHJcbiAqIEEgZnVuY3Rpb24gc2hhbGwgbm90IGJlIGRlY2xhcmVkIGltcGxpY2l0bHkuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzE3XzMgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTcuMyc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQSBmdW5jdGlvbiBzaGFsbCBub3QgYmUgZGVjbGFyZWQgaW1wbGljaXRseSc7XHJcbiAgc2V2ZXJpdHkgPSAnbWFuZGF0b3J5JyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdGdW5jdGlvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGRlY2xhcmVkRnVuY3Rpb25zID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblxyXG4gICAgLy8gQ29sbGVjdCBhbGwgZGVjbGFyZWQgZnVuY3Rpb25zXHJcbiAgICBmb3IgKGNvbnN0IGZ1bmMgb2YgYXN0LmZ1bmN0aW9ucykge1xyXG4gICAgICBkZWNsYXJlZEZ1bmN0aW9ucy5hZGQoZnVuYy5uYW1lKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBmb3IgZnVuY3Rpb24gY2FsbHMgd2l0aG91dCBkZWNsYXJhdGlvbnNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gTG9vayBmb3IgZnVuY3Rpb24gY2FsbHNcclxuICAgICAgY29uc3QgY2FsbE1hdGNoID0gbGluZS5tYXRjaCgvXFxiKFxcdyspXFxzKlxcKC8pO1xyXG4gICAgICBpZiAoY2FsbE1hdGNoKSB7XHJcbiAgICAgICAgY29uc3QgZnVuY05hbWUgPSBjYWxsTWF0Y2hbMV07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gU2tpcCBzdGFuZGFyZCBsaWJyYXJ5IGZ1bmN0aW9ucyBhbmQga2V5d29yZHNcclxuICAgICAgICBjb25zdCBzdGRGdW5jdGlvbnMgPSBbJ3ByaW50ZicsICdzY2FuZicsICdtYWxsb2MnLCAnZnJlZScsICdzaXplb2YnLCAnaWYnLCAnd2hpbGUnLCAnZm9yJywgJ3N3aXRjaCddO1xyXG4gICAgICAgIGlmIChzdGRGdW5jdGlvbnMuaW5jbHVkZXMoZnVuY05hbWUpKSBjb250aW51ZTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBpZiBmdW5jdGlvbiB3YXMgZGVjbGFyZWRcclxuICAgICAgICBpZiAoIWRlY2xhcmVkRnVuY3Rpb25zLmhhcyhmdW5jTmFtZSkpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICBgRnVuY3Rpb24gJyR7ZnVuY05hbWV9JyBjYWxsZWQgd2l0aG91dCBleHBsaWNpdCBkZWNsYXJhdGlvbmAsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=