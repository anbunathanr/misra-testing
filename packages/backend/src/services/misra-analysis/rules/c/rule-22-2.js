"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_22_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 22.2
 * A block of memory shall only be freed if it was allocated by means of a
 * Standard Library function.
 * Detects free() calls on variables that were not allocated with malloc/calloc/realloc.
 */
class Rule_C_22_2 {
    id = 'MISRA-C-22.2';
    description = 'A block of memory shall only be freed if it was allocated by means of a Standard Library function';
    severity = 'mandatory';
    category = 'Resources';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Track variables allocated with malloc/calloc/realloc
        const allocatedVars = new Set();
        const allocRegex = /\b(\w+)\s*=\s*(?:malloc|calloc|realloc)\s*\(/;
        const freeRegex = /\bfree\s*\(\s*(\w+)\s*\)/;
        for (const line of lines) {
            const allocMatch = line.match(allocRegex);
            if (allocMatch) {
                allocatedVars.add(allocMatch[1]);
            }
        }
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const freeMatch = line.match(freeRegex);
            if (freeMatch) {
                const varName = freeMatch[1];
                if (!allocatedVars.has(varName) && varName !== 'NULL' && varName !== '0') {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `free() called on '${varName}' which may not have been dynamically allocated`, line.trim()));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_22_2 = Rule_C_22_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yMi0yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0yMi0yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7Ozs7R0FLRztBQUNILE1BQWEsV0FBVztJQUN0QixFQUFFLEdBQUcsY0FBYyxDQUFDO0lBQ3BCLFdBQVcsR0FBRyxtR0FBbUcsQ0FBQztJQUNsSCxRQUFRLEdBQUcsV0FBb0IsQ0FBQztJQUNoQyxRQUFRLEdBQUcsV0FBVyxDQUFDO0lBQ3ZCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFFeEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLHVEQUF1RDtRQUN2RCxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ3hDLE1BQU0sVUFBVSxHQUFHLDhDQUE4QyxDQUFDO1FBQ2xFLE1BQU0sU0FBUyxHQUFHLDBCQUEwQixDQUFDO1FBRTdDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDekIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMxQyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNmLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkMsQ0FBQztRQUNILENBQUM7UUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3hDLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3QixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxPQUFPLEtBQUssTUFBTSxJQUFJLE9BQU8sS0FBSyxHQUFHLEVBQUUsQ0FBQztvQkFDekUsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELHFCQUFxQixPQUFPLGlEQUFpRCxFQUM3RSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQ1osQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTVDRCxrQ0E0Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMjIuMlxyXG4gKiBBIGJsb2NrIG9mIG1lbW9yeSBzaGFsbCBvbmx5IGJlIGZyZWVkIGlmIGl0IHdhcyBhbGxvY2F0ZWQgYnkgbWVhbnMgb2YgYVxyXG4gKiBTdGFuZGFyZCBMaWJyYXJ5IGZ1bmN0aW9uLlxyXG4gKiBEZXRlY3RzIGZyZWUoKSBjYWxscyBvbiB2YXJpYWJsZXMgdGhhdCB3ZXJlIG5vdCBhbGxvY2F0ZWQgd2l0aCBtYWxsb2MvY2FsbG9jL3JlYWxsb2MuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzIyXzIgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjIuMic7XHJcbiAgZGVzY3JpcHRpb24gPSAnQSBibG9jayBvZiBtZW1vcnkgc2hhbGwgb25seSBiZSBmcmVlZCBpZiBpdCB3YXMgYWxsb2NhdGVkIGJ5IG1lYW5zIG9mIGEgU3RhbmRhcmQgTGlicmFyeSBmdW5jdGlvbic7XHJcbiAgc2V2ZXJpdHkgPSAnbWFuZGF0b3J5JyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdSZXNvdXJjZXMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIFRyYWNrIHZhcmlhYmxlcyBhbGxvY2F0ZWQgd2l0aCBtYWxsb2MvY2FsbG9jL3JlYWxsb2NcclxuICAgIGNvbnN0IGFsbG9jYXRlZFZhcnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuICAgIGNvbnN0IGFsbG9jUmVnZXggPSAvXFxiKFxcdyspXFxzKj1cXHMqKD86bWFsbG9jfGNhbGxvY3xyZWFsbG9jKVxccypcXCgvO1xyXG4gICAgY29uc3QgZnJlZVJlZ2V4ID0gL1xcYmZyZWVcXHMqXFwoXFxzKihcXHcrKVxccypcXCkvO1xyXG5cclxuICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICBjb25zdCBhbGxvY01hdGNoID0gbGluZS5tYXRjaChhbGxvY1JlZ2V4KTtcclxuICAgICAgaWYgKGFsbG9jTWF0Y2gpIHtcclxuICAgICAgICBhbGxvY2F0ZWRWYXJzLmFkZChhbGxvY01hdGNoWzFdKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldO1xyXG4gICAgICBjb25zdCBmcmVlTWF0Y2ggPSBsaW5lLm1hdGNoKGZyZWVSZWdleCk7XHJcbiAgICAgIGlmIChmcmVlTWF0Y2gpIHtcclxuICAgICAgICBjb25zdCB2YXJOYW1lID0gZnJlZU1hdGNoWzFdO1xyXG4gICAgICAgIGlmICghYWxsb2NhdGVkVmFycy5oYXModmFyTmFtZSkgJiYgdmFyTmFtZSAhPT0gJ05VTEwnICYmIHZhck5hbWUgIT09ICcwJykge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgIGBmcmVlKCkgY2FsbGVkIG9uICcke3Zhck5hbWV9JyB3aGljaCBtYXkgbm90IGhhdmUgYmVlbiBkeW5hbWljYWxseSBhbGxvY2F0ZWRgLFxyXG4gICAgICAgICAgICAgIGxpbmUudHJpbSgpXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==