"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_17_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 17.2
 * Functions shall not call themselves, either directly or indirectly.
 */
class Rule_C_17_2 {
    id = 'MISRA-C-17.2';
    description = 'Functions shall not call themselves, either directly or indirectly';
    severity = 'required';
    category = 'Functions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        // Extract function names from source code
        const functionPattern = /(\w+)\s*\([^)]*\)\s*\{/g;
        const functions = [];
        let match;
        while ((match = functionPattern.exec(sourceCode)) !== null) {
            const funcName = match[1];
            const startPos = match.index;
            const startLine = sourceCode.substring(0, startPos).split('\n').length;
            // Find end of function (simplified - count braces)
            let braceCount = 1;
            let pos = startPos + match[0].length;
            while (braceCount > 0 && pos < sourceCode.length) {
                if (sourceCode[pos] === '{')
                    braceCount++;
                if (sourceCode[pos] === '}')
                    braceCount--;
                pos++;
            }
            const endLine = sourceCode.substring(0, pos).split('\n').length;
            functions.push({ name: funcName, startLine, endLine });
        }
        // Check for direct recursion
        for (const func of functions) {
            const funcName = func.name;
            // Check for function calls to itself
            for (let i = func.startLine - 1; i < func.endLine && i < ast.lines.length; i++) {
                const line = ast.lines[i];
                // Look for function calls to itself
                const callMatch = line.match(new RegExp(`\\b${funcName}\\s*\\(`));
                if (callMatch) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Function '${funcName}' calls itself (direct recursion)`, line.trim()));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_17_2 = Rule_C_17_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNy0yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNy0yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsb0VBQW9FLENBQUM7SUFDbkYsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLFdBQVcsQ0FBQztJQUN2QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsMENBQTBDO1FBQzFDLE1BQU0sZUFBZSxHQUFHLHlCQUF5QixDQUFDO1FBQ2xELE1BQU0sU0FBUyxHQUEyRCxFQUFFLENBQUM7UUFFN0UsSUFBSSxLQUFLLENBQUM7UUFDVixPQUFPLENBQUMsS0FBSyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQztZQUM3QixNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDO1lBRXZFLG1EQUFtRDtZQUNuRCxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7WUFDbkIsSUFBSSxHQUFHLEdBQUcsUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFDckMsT0FBTyxVQUFVLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2pELElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUc7b0JBQUUsVUFBVSxFQUFFLENBQUM7Z0JBQzFDLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUc7b0JBQUUsVUFBVSxFQUFFLENBQUM7Z0JBQzFDLEdBQUcsRUFBRSxDQUFDO1lBQ1IsQ0FBQztZQUNELE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFFaEUsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDekQsQ0FBQztRQUVELDZCQUE2QjtRQUM3QixLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQzdCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFFM0IscUNBQXFDO1lBQ3JDLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQy9FLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRTFCLG9DQUFvQztnQkFDcEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLFFBQVEsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDbEUsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZCxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsYUFBYSxRQUFRLG1DQUFtQyxFQUN4RCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQ1osQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTNERCxrQ0EyREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTcuMlxyXG4gKiBGdW5jdGlvbnMgc2hhbGwgbm90IGNhbGwgdGhlbXNlbHZlcywgZWl0aGVyIGRpcmVjdGx5IG9yIGluZGlyZWN0bHkuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzE3XzIgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTcuMic7XHJcbiAgZGVzY3JpcHRpb24gPSAnRnVuY3Rpb25zIHNoYWxsIG5vdCBjYWxsIHRoZW1zZWx2ZXMsIGVpdGhlciBkaXJlY3RseSBvciBpbmRpcmVjdGx5JztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRnVuY3Rpb25zJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgLy8gRXh0cmFjdCBmdW5jdGlvbiBuYW1lcyBmcm9tIHNvdXJjZSBjb2RlXHJcbiAgICBjb25zdCBmdW5jdGlvblBhdHRlcm4gPSAvKFxcdyspXFxzKlxcKFteKV0qXFwpXFxzKlxcey9nO1xyXG4gICAgY29uc3QgZnVuY3Rpb25zOiB7IG5hbWU6IHN0cmluZzsgc3RhcnRMaW5lOiBudW1iZXI7IGVuZExpbmU6IG51bWJlciB9W10gPSBbXTtcclxuICAgIFxyXG4gICAgbGV0IG1hdGNoO1xyXG4gICAgd2hpbGUgKChtYXRjaCA9IGZ1bmN0aW9uUGF0dGVybi5leGVjKHNvdXJjZUNvZGUpKSAhPT0gbnVsbCkge1xyXG4gICAgICBjb25zdCBmdW5jTmFtZSA9IG1hdGNoWzFdO1xyXG4gICAgICBjb25zdCBzdGFydFBvcyA9IG1hdGNoLmluZGV4O1xyXG4gICAgICBjb25zdCBzdGFydExpbmUgPSBzb3VyY2VDb2RlLnN1YnN0cmluZygwLCBzdGFydFBvcykuc3BsaXQoJ1xcbicpLmxlbmd0aDtcclxuICAgICAgXHJcbiAgICAgIC8vIEZpbmQgZW5kIG9mIGZ1bmN0aW9uIChzaW1wbGlmaWVkIC0gY291bnQgYnJhY2VzKVxyXG4gICAgICBsZXQgYnJhY2VDb3VudCA9IDE7XHJcbiAgICAgIGxldCBwb3MgPSBzdGFydFBvcyArIG1hdGNoWzBdLmxlbmd0aDtcclxuICAgICAgd2hpbGUgKGJyYWNlQ291bnQgPiAwICYmIHBvcyA8IHNvdXJjZUNvZGUubGVuZ3RoKSB7XHJcbiAgICAgICAgaWYgKHNvdXJjZUNvZGVbcG9zXSA9PT0gJ3snKSBicmFjZUNvdW50Kys7XHJcbiAgICAgICAgaWYgKHNvdXJjZUNvZGVbcG9zXSA9PT0gJ30nKSBicmFjZUNvdW50LS07XHJcbiAgICAgICAgcG9zKys7XHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgZW5kTGluZSA9IHNvdXJjZUNvZGUuc3Vic3RyaW5nKDAsIHBvcykuc3BsaXQoJ1xcbicpLmxlbmd0aDtcclxuICAgICAgXHJcbiAgICAgIGZ1bmN0aW9ucy5wdXNoKHsgbmFtZTogZnVuY05hbWUsIHN0YXJ0TGluZSwgZW5kTGluZSB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBmb3IgZGlyZWN0IHJlY3Vyc2lvblxyXG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGZ1bmN0aW9ucykge1xyXG4gICAgICBjb25zdCBmdW5jTmFtZSA9IGZ1bmMubmFtZTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBmdW5jdGlvbiBjYWxscyB0byBpdHNlbGZcclxuICAgICAgZm9yIChsZXQgaSA9IGZ1bmMuc3RhcnRMaW5lIC0gMTsgaSA8IGZ1bmMuZW5kTGluZSAmJiBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBMb29rIGZvciBmdW5jdGlvbiBjYWxscyB0byBpdHNlbGZcclxuICAgICAgICBjb25zdCBjYWxsTWF0Y2ggPSBsaW5lLm1hdGNoKG5ldyBSZWdFeHAoYFxcXFxiJHtmdW5jTmFtZX1cXFxccypcXFxcKGApKTtcclxuICAgICAgICBpZiAoY2FsbE1hdGNoKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgYEZ1bmN0aW9uICcke2Z1bmNOYW1lfScgY2FsbHMgaXRzZWxmIChkaXJlY3QgcmVjdXJzaW9uKWAsXHJcbiAgICAgICAgICAgICAgbGluZS50cmltKClcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19