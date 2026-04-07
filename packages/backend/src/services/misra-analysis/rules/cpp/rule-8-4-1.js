"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_8_4_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 8-4-1
 * Functions shall not be defined using the ellipsis notation.
 * Also detects: Unused function parameters.
 */
class Rule_CPP_8_4_1 {
    id = 'MISRA-CPP-8.4.1';
    description = 'Functions shall not be defined with unused parameters';
    severity = 'required';
    category = 'Declarations';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Find function definitions and check for unused parameters
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Match function definitions (with opening brace)
            const funcMatch = line.match(/\b(\w+)\s+(\w+)\s*\(([^)]*)\)\s*{?/);
            if (!funcMatch)
                continue;
            const params = funcMatch[3];
            if (!params || params === 'void' || params === '')
                continue;
            // Extract parameter names
            const paramList = params.split(',').map(p => p.trim());
            const paramNames = [];
            for (const param of paramList) {
                const nameMatch = param.match(/\b(\w+)\s*$/);
                if (nameMatch) {
                    paramNames.push(nameMatch[1]);
                }
            }
            // Find function body (scan until closing brace)
            let braceDepth = line.includes('{') ? 1 : 0;
            let functionBody = '';
            for (let j = i + 1; j < lines.length && braceDepth > 0; j++) {
                const bodyLine = lines[j];
                braceDepth += (bodyLine.match(/{/g) || []).length;
                braceDepth -= (bodyLine.match(/}/g) || []).length;
                functionBody += bodyLine + '\n';
            }
            // Check if each parameter is used in the function body
            for (const paramName of paramNames) {
                const usageRegex = new RegExp(`\\b${paramName}\\b`);
                if (!usageRegex.test(functionBody)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Function parameter '${paramName}' is not used in the function body`, line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_8_4_1 = Rule_CPP_8_4_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTQtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtOC00LTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyx1REFBdUQsQ0FBQztJQUN0RSxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLDREQUE0RDtRQUM1RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSxrREFBa0Q7WUFDbEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxTQUFTO2dCQUFFLFNBQVM7WUFFekIsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVCLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxLQUFLLE1BQU0sSUFBSSxNQUFNLEtBQUssRUFBRTtnQkFBRSxTQUFTO1lBRTVELDBCQUEwQjtZQUMxQixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZELE1BQU0sVUFBVSxHQUFhLEVBQUUsQ0FBQztZQUVoQyxLQUFLLE1BQU0sS0FBSyxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUM5QixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUM3QyxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNkLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hDLENBQUM7WUFDSCxDQUFDO1lBRUQsZ0RBQWdEO1lBQ2hELElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLElBQUksWUFBWSxHQUFHLEVBQUUsQ0FBQztZQUV0QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLElBQUksVUFBVSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM1RCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLFVBQVUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDO2dCQUNsRCxVQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztnQkFDbEQsWUFBWSxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDbEMsQ0FBQztZQUVELHVEQUF1RDtZQUN2RCxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNuQyxNQUFNLFVBQVUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLFNBQVMsS0FBSyxDQUFDLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7b0JBQ25DLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCx1QkFBdUIsU0FBUyxvQ0FBb0MsRUFDcEUsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFoRUQsd0NBZ0VDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgOC00LTFcclxuICogRnVuY3Rpb25zIHNoYWxsIG5vdCBiZSBkZWZpbmVkIHVzaW5nIHRoZSBlbGxpcHNpcyBub3RhdGlvbi5cclxuICogQWxzbyBkZXRlY3RzOiBVbnVzZWQgZnVuY3Rpb24gcGFyYW1ldGVycy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF84XzRfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTguNC4xJztcclxuICBkZXNjcmlwdGlvbiA9ICdGdW5jdGlvbnMgc2hhbGwgbm90IGJlIGRlZmluZWQgd2l0aCB1bnVzZWQgcGFyYW1ldGVycyc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0RlY2xhcmF0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBGaW5kIGZ1bmN0aW9uIGRlZmluaXRpb25zIGFuZCBjaGVjayBmb3IgdW51c2VkIHBhcmFtZXRlcnNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBNYXRjaCBmdW5jdGlvbiBkZWZpbml0aW9ucyAod2l0aCBvcGVuaW5nIGJyYWNlKVxyXG4gICAgICBjb25zdCBmdW5jTWF0Y2ggPSBsaW5lLm1hdGNoKC9cXGIoXFx3KylcXHMrKFxcdyspXFxzKlxcKChbXildKilcXClcXHMqez8vKTtcclxuICAgICAgaWYgKCFmdW5jTWF0Y2gpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgcGFyYW1zID0gZnVuY01hdGNoWzNdO1xyXG4gICAgICBpZiAoIXBhcmFtcyB8fCBwYXJhbXMgPT09ICd2b2lkJyB8fCBwYXJhbXMgPT09ICcnKSBjb250aW51ZTtcclxuXHJcbiAgICAgIC8vIEV4dHJhY3QgcGFyYW1ldGVyIG5hbWVzXHJcbiAgICAgIGNvbnN0IHBhcmFtTGlzdCA9IHBhcmFtcy5zcGxpdCgnLCcpLm1hcChwID0+IHAudHJpbSgpKTtcclxuICAgICAgY29uc3QgcGFyYW1OYW1lczogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgcGFyYW1MaXN0KSB7XHJcbiAgICAgICAgY29uc3QgbmFtZU1hdGNoID0gcGFyYW0ubWF0Y2goL1xcYihcXHcrKVxccyokLyk7XHJcbiAgICAgICAgaWYgKG5hbWVNYXRjaCkge1xyXG4gICAgICAgICAgcGFyYW1OYW1lcy5wdXNoKG5hbWVNYXRjaFsxXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBGaW5kIGZ1bmN0aW9uIGJvZHkgKHNjYW4gdW50aWwgY2xvc2luZyBicmFjZSlcclxuICAgICAgbGV0IGJyYWNlRGVwdGggPSBsaW5lLmluY2x1ZGVzKCd7JykgPyAxIDogMDtcclxuICAgICAgbGV0IGZ1bmN0aW9uQm9keSA9ICcnO1xyXG4gICAgICBcclxuICAgICAgZm9yIChsZXQgaiA9IGkgKyAxOyBqIDwgbGluZXMubGVuZ3RoICYmIGJyYWNlRGVwdGggPiAwOyBqKyspIHtcclxuICAgICAgICBjb25zdCBib2R5TGluZSA9IGxpbmVzW2pdO1xyXG4gICAgICAgIGJyYWNlRGVwdGggKz0gKGJvZHlMaW5lLm1hdGNoKC97L2cpIHx8IFtdKS5sZW5ndGg7XHJcbiAgICAgICAgYnJhY2VEZXB0aCAtPSAoYm9keUxpbmUubWF0Y2goL30vZykgfHwgW10pLmxlbmd0aDtcclxuICAgICAgICBmdW5jdGlvbkJvZHkgKz0gYm9keUxpbmUgKyAnXFxuJztcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ2hlY2sgaWYgZWFjaCBwYXJhbWV0ZXIgaXMgdXNlZCBpbiB0aGUgZnVuY3Rpb24gYm9keVxyXG4gICAgICBmb3IgKGNvbnN0IHBhcmFtTmFtZSBvZiBwYXJhbU5hbWVzKSB7XHJcbiAgICAgICAgY29uc3QgdXNhZ2VSZWdleCA9IG5ldyBSZWdFeHAoYFxcXFxiJHtwYXJhbU5hbWV9XFxcXGJgKTtcclxuICAgICAgICBpZiAoIXVzYWdlUmVnZXgudGVzdChmdW5jdGlvbkJvZHkpKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgYEZ1bmN0aW9uIHBhcmFtZXRlciAnJHtwYXJhbU5hbWV9JyBpcyBub3QgdXNlZCBpbiB0aGUgZnVuY3Rpb24gYm9keWAsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=