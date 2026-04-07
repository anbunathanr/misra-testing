"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_2_13_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 2-13-2
 * Octal constants (other than zero) and octal escape sequences shall not be used.
 * Detects octal literals which can be confusing.
 */
class Rule_CPP_2_13_2 {
    id = 'MISRA-CPP-2.13.2';
    description = 'Octal constants and escape sequences shall not be used';
    severity = 'required';
    category = 'Lexical conventions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Octal literals: 0123, 077 (but not 0, 0x, 0X, 0b, 0B)
        const octalLiteralRegex = /\b0[1-7][0-7]*\b/g;
        // Octal escape sequences: \123, \77
        const octalEscapeRegex = /\\[0-7]{1,3}/g;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().startsWith('//') || line.trim().startsWith('#'))
                continue;
            // Check for octal literals
            const octalLiterals = line.match(octalLiteralRegex);
            if (octalLiterals) {
                for (const literal of octalLiterals) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, line.indexOf(literal), `Octal literal '${literal}' detected`, line.trim()));
                }
            }
            // Check for octal escape sequences
            const octalEscapes = line.match(octalEscapeRegex);
            if (octalEscapes) {
                for (const escape of octalEscapes) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, line.indexOf(escape), `Octal escape sequence '${escape}' detected`, line.trim()));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_2_13_2 = Rule_CPP_2_13_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yLTEzLTIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTItMTMtMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7Ozs7R0FJRztBQUNILE1BQWEsZUFBZTtJQUMxQixFQUFFLEdBQUcsa0JBQWtCLENBQUM7SUFDeEIsV0FBVyxHQUFHLHdEQUF3RCxDQUFDO0lBQ3ZFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQztJQUNqQyxRQUFRLEdBQUcsS0FBYyxDQUFDO0lBRTFCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4Qix3REFBd0Q7UUFDeEQsTUFBTSxpQkFBaUIsR0FBRyxtQkFBbUIsQ0FBQztRQUU5QyxvQ0FBb0M7UUFDcEMsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQUM7UUFFekMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEIsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO2dCQUFFLFNBQVM7WUFFMUUsMkJBQTJCO1lBQzNCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUNwRCxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNsQixLQUFLLE1BQU0sT0FBTyxJQUFJLGFBQWEsRUFBRSxDQUFDO29CQUNwQyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUNyQixrQkFBa0IsT0FBTyxZQUFZLEVBQ3JDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FDWixDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7WUFFRCxtQ0FBbUM7WUFDbkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ2xELElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2pCLEtBQUssTUFBTSxNQUFNLElBQUksWUFBWSxFQUFFLENBQUM7b0JBQ2xDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQ3BCLDBCQUEwQixNQUFNLFlBQVksRUFDNUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUNaLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUF4REQsMENBd0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgMi0xMy0yXHJcbiAqIE9jdGFsIGNvbnN0YW50cyAob3RoZXIgdGhhbiB6ZXJvKSBhbmQgb2N0YWwgZXNjYXBlIHNlcXVlbmNlcyBzaGFsbCBub3QgYmUgdXNlZC5cclxuICogRGV0ZWN0cyBvY3RhbCBsaXRlcmFscyB3aGljaCBjYW4gYmUgY29uZnVzaW5nLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzJfMTNfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTIuMTMuMic7XHJcbiAgZGVzY3JpcHRpb24gPSAnT2N0YWwgY29uc3RhbnRzIGFuZCBlc2NhcGUgc2VxdWVuY2VzIHNoYWxsIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnTGV4aWNhbCBjb252ZW50aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBPY3RhbCBsaXRlcmFsczogMDEyMywgMDc3IChidXQgbm90IDAsIDB4LCAwWCwgMGIsIDBCKVxyXG4gICAgY29uc3Qgb2N0YWxMaXRlcmFsUmVnZXggPSAvXFxiMFsxLTddWzAtN10qXFxiL2c7XHJcbiAgICBcclxuICAgIC8vIE9jdGFsIGVzY2FwZSBzZXF1ZW5jZXM6IFxcMTIzLCBcXDc3XHJcbiAgICBjb25zdCBvY3RhbEVzY2FwZVJlZ2V4ID0gL1xcXFxbMC03XXsxLDN9L2c7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV07XHJcbiAgICAgIGlmIChsaW5lLnRyaW0oKS5zdGFydHNXaXRoKCcvLycpIHx8IGxpbmUudHJpbSgpLnN0YXJ0c1dpdGgoJyMnKSkgY29udGludWU7XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3Igb2N0YWwgbGl0ZXJhbHNcclxuICAgICAgY29uc3Qgb2N0YWxMaXRlcmFscyA9IGxpbmUubWF0Y2gob2N0YWxMaXRlcmFsUmVnZXgpO1xyXG4gICAgICBpZiAob2N0YWxMaXRlcmFscykge1xyXG4gICAgICAgIGZvciAoY29uc3QgbGl0ZXJhbCBvZiBvY3RhbExpdGVyYWxzKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIGxpbmUuaW5kZXhPZihsaXRlcmFsKSxcclxuICAgICAgICAgICAgICBgT2N0YWwgbGl0ZXJhbCAnJHtsaXRlcmFsfScgZGV0ZWN0ZWRgLFxyXG4gICAgICAgICAgICAgIGxpbmUudHJpbSgpXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3Igb2N0YWwgZXNjYXBlIHNlcXVlbmNlc1xyXG4gICAgICBjb25zdCBvY3RhbEVzY2FwZXMgPSBsaW5lLm1hdGNoKG9jdGFsRXNjYXBlUmVnZXgpO1xyXG4gICAgICBpZiAob2N0YWxFc2NhcGVzKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCBlc2NhcGUgb2Ygb2N0YWxFc2NhcGVzKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIGxpbmUuaW5kZXhPZihlc2NhcGUpLFxyXG4gICAgICAgICAgICAgIGBPY3RhbCBlc2NhcGUgc2VxdWVuY2UgJyR7ZXNjYXBlfScgZGV0ZWN0ZWRgLFxyXG4gICAgICAgICAgICAgIGxpbmUudHJpbSgpXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==