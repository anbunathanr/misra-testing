"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_2_13_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 2-13-1
 * Only those escape sequences that are defined in ISO/IEC 14882:2003 shall be used.
 * Detects invalid or non-standard escape sequences.
 */
class Rule_CPP_2_13_1 {
    id = 'MISRA-CPP-2.13.1';
    description = 'Only standard escape sequences shall be used';
    severity = 'required';
    category = 'Lexical conventions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Valid escape sequences: \n, \t, \r, \b, \f, \v, \\, \', \", \?, \0, \xHH, \ooo
        const validEscapes = /\\[ntrfvb\\'"?0]|\\x[0-9a-fA-F]{1,2}|\\[0-7]{1,3}/g;
        const escapeRegex = /\\./g;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().startsWith('//'))
                continue;
            // Find all escape sequences
            const escapes = line.match(escapeRegex);
            if (!escapes)
                continue;
            for (const escape of escapes) {
                if (!validEscapes.test(escape)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, line.indexOf(escape), `Invalid escape sequence '${escape}' detected`, line.trim()));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_2_13_1 = Rule_CPP_2_13_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yLTEzLTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTItMTMtMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7Ozs7R0FJRztBQUNILE1BQWEsZUFBZTtJQUMxQixFQUFFLEdBQUcsa0JBQWtCLENBQUM7SUFDeEIsV0FBVyxHQUFHLDhDQUE4QyxDQUFDO0lBQzdELFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQztJQUNqQyxRQUFRLEdBQUcsS0FBYyxDQUFDO0lBRTFCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4QixpRkFBaUY7UUFDakYsTUFBTSxZQUFZLEdBQUcsb0RBQW9ELENBQUM7UUFDMUUsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDO1FBRTNCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7Z0JBQUUsU0FBUztZQUUzQyw0QkFBNEI7WUFDNUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN4QyxJQUFJLENBQUMsT0FBTztnQkFBRSxTQUFTO1lBRXZCLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQy9CLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQ3BCLDRCQUE0QixNQUFNLFlBQVksRUFDOUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUNaLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUF4Q0QsMENBd0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgMi0xMy0xXHJcbiAqIE9ubHkgdGhvc2UgZXNjYXBlIHNlcXVlbmNlcyB0aGF0IGFyZSBkZWZpbmVkIGluIElTTy9JRUMgMTQ4ODI6MjAwMyBzaGFsbCBiZSB1c2VkLlxyXG4gKiBEZXRlY3RzIGludmFsaWQgb3Igbm9uLXN0YW5kYXJkIGVzY2FwZSBzZXF1ZW5jZXMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfMl8xM18xIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtMi4xMy4xJztcclxuICBkZXNjcmlwdGlvbiA9ICdPbmx5IHN0YW5kYXJkIGVzY2FwZSBzZXF1ZW5jZXMgc2hhbGwgYmUgdXNlZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0xleGljYWwgY29udmVudGlvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gVmFsaWQgZXNjYXBlIHNlcXVlbmNlczogXFxuLCBcXHQsIFxcciwgXFxiLCBcXGYsIFxcdiwgXFxcXCwgXFwnLCBcXFwiLCBcXD8sIFxcMCwgXFx4SEgsIFxcb29vXHJcbiAgICBjb25zdCB2YWxpZEVzY2FwZXMgPSAvXFxcXFtudHJmdmJcXFxcJ1wiPzBdfFxcXFx4WzAtOWEtZkEtRl17MSwyfXxcXFxcWzAtN117MSwzfS9nO1xyXG4gICAgY29uc3QgZXNjYXBlUmVnZXggPSAvXFxcXC4vZztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuICAgICAgaWYgKGxpbmUudHJpbSgpLnN0YXJ0c1dpdGgoJy8vJykpIGNvbnRpbnVlO1xyXG4gICAgICBcclxuICAgICAgLy8gRmluZCBhbGwgZXNjYXBlIHNlcXVlbmNlc1xyXG4gICAgICBjb25zdCBlc2NhcGVzID0gbGluZS5tYXRjaChlc2NhcGVSZWdleCk7XHJcbiAgICAgIGlmICghZXNjYXBlcykgY29udGludWU7XHJcbiAgICAgIFxyXG4gICAgICBmb3IgKGNvbnN0IGVzY2FwZSBvZiBlc2NhcGVzKSB7XHJcbiAgICAgICAgaWYgKCF2YWxpZEVzY2FwZXMudGVzdChlc2NhcGUpKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIGxpbmUuaW5kZXhPZihlc2NhcGUpLFxyXG4gICAgICAgICAgICAgIGBJbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZSAnJHtlc2NhcGV9JyBkZXRlY3RlZGAsXHJcbiAgICAgICAgICAgICAgbGluZS50cmltKClcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19