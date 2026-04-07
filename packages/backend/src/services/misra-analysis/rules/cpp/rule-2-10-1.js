"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_2_10_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 2-10-1
 * Different identifiers shall be typographically unambiguous.
 * Detects identifiers starting with underscore (reserved) and identifiers that differ only in case.
 */
class Rule_CPP_2_10_1 {
    id = 'MISRA-CPP-2.10.1';
    description = 'Different identifiers shall be typographically unambiguous';
    severity = 'required';
    category = 'Identifiers';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Check for identifiers starting with underscore (reserved)
        const underscoreRegex = /\b_[a-zA-Z_]\w*/g;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().startsWith('//') || line.trim().startsWith('#'))
                continue;
            const matches = line.matchAll(underscoreRegex);
            for (const match of matches) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, match.index || 0, `Identifier '${match[0]}' starts with underscore (reserved)`, line.trim()));
            }
        }
        // Collect all unique identifiers with their first occurrence line
        const identifiers = new Map();
        const reported = new Set();
        for (const token of ast.tokens) {
            if (token.type !== 'identifier')
                continue;
            const lower = token.value.toLowerCase();
            if (identifiers.has(lower)) {
                const existing = identifiers.get(lower);
                // Only report if they differ in case (not the same identifier)
                if (existing.value !== token.value) {
                    const key = [existing.value, token.value].sort().join('|');
                    if (!reported.has(key)) {
                        reported.add(key);
                        const line = ast.lines[token.line - 1] || '';
                        violations.push((0, rule_engine_1.createViolation)(this, token.line, token.column, `Identifier '${token.value}' differs only in case from '${existing.value}' (line ${existing.line})`, line.trim()));
                    }
                }
            }
            else {
                identifiers.set(lower, { value: token.value, line: token.line });
            }
        }
        return violations;
    }
}
exports.Rule_CPP_2_10_1 = Rule_CPP_2_10_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yLTEwLTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTItMTAtMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7Ozs7R0FJRztBQUNILE1BQWEsZUFBZTtJQUMxQixFQUFFLEdBQUcsa0JBQWtCLENBQUM7SUFDeEIsV0FBVyxHQUFHLDREQUE0RCxDQUFDO0lBQzNFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsNERBQTREO1FBQzVELE1BQU0sZUFBZSxHQUFHLGtCQUFrQixDQUFDO1FBRTNDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztnQkFBRSxTQUFTO1lBRTFFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDL0MsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDNUIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsS0FBSyxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQ2hCLGVBQWUsS0FBSyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUMsRUFDNUQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUNaLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsa0VBQWtFO1FBQ2xFLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUEyQyxDQUFDO1FBQ3ZFLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFFbkMsS0FBSyxNQUFNLEtBQUssSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDL0IsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFlBQVk7Z0JBQUUsU0FBUztZQUMxQyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBRXhDLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMzQixNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBRSxDQUFDO2dCQUN6QywrREFBK0Q7Z0JBQy9ELElBQUksUUFBUSxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ25DLE1BQU0sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUMzRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUN2QixRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNsQixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUM3QyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osS0FBSyxDQUFDLElBQUksRUFDVixLQUFLLENBQUMsTUFBTSxFQUNaLGVBQWUsS0FBSyxDQUFDLEtBQUssZ0NBQWdDLFFBQVEsQ0FBQyxLQUFLLFdBQVcsUUFBUSxDQUFDLElBQUksR0FBRyxFQUNuRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQ1osQ0FDRixDQUFDO29CQUNKLENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7aUJBQU0sQ0FBQztnQkFDTixXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNuRSxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQWxFRCwwQ0FrRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQysrOjIwMDggUnVsZSAyLTEwLTFcclxuICogRGlmZmVyZW50IGlkZW50aWZpZXJzIHNoYWxsIGJlIHR5cG9ncmFwaGljYWxseSB1bmFtYmlndW91cy5cclxuICogRGV0ZWN0cyBpZGVudGlmaWVycyBzdGFydGluZyB3aXRoIHVuZGVyc2NvcmUgKHJlc2VydmVkKSBhbmQgaWRlbnRpZmllcnMgdGhhdCBkaWZmZXIgb25seSBpbiBjYXNlLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzJfMTBfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTIuMTAuMSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnRGlmZmVyZW50IGlkZW50aWZpZXJzIHNoYWxsIGJlIHR5cG9ncmFwaGljYWxseSB1bmFtYmlndW91cyc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0lkZW50aWZpZXJzJztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIENoZWNrIGZvciBpZGVudGlmaWVycyBzdGFydGluZyB3aXRoIHVuZGVyc2NvcmUgKHJlc2VydmVkKVxyXG4gICAgY29uc3QgdW5kZXJzY29yZVJlZ2V4ID0gL1xcYl9bYS16QS1aX11cXHcqL2c7XHJcbiAgICBcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldO1xyXG4gICAgICBpZiAobGluZS50cmltKCkuc3RhcnRzV2l0aCgnLy8nKSB8fCBsaW5lLnRyaW0oKS5zdGFydHNXaXRoKCcjJykpIGNvbnRpbnVlO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgbWF0Y2hlcyA9IGxpbmUubWF0Y2hBbGwodW5kZXJzY29yZVJlZ2V4KTtcclxuICAgICAgZm9yIChjb25zdCBtYXRjaCBvZiBtYXRjaGVzKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgbWF0Y2guaW5kZXggfHwgMCxcclxuICAgICAgICAgICAgYElkZW50aWZpZXIgJyR7bWF0Y2hbMF19JyBzdGFydHMgd2l0aCB1bmRlcnNjb3JlIChyZXNlcnZlZClgLFxyXG4gICAgICAgICAgICBsaW5lLnRyaW0oKVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBDb2xsZWN0IGFsbCB1bmlxdWUgaWRlbnRpZmllcnMgd2l0aCB0aGVpciBmaXJzdCBvY2N1cnJlbmNlIGxpbmVcclxuICAgIGNvbnN0IGlkZW50aWZpZXJzID0gbmV3IE1hcDxzdHJpbmcsIHsgdmFsdWU6IHN0cmluZzsgbGluZTogbnVtYmVyIH0+KCk7XHJcbiAgICBjb25zdCByZXBvcnRlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cclxuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgYXN0LnRva2Vucykge1xyXG4gICAgICBpZiAodG9rZW4udHlwZSAhPT0gJ2lkZW50aWZpZXInKSBjb250aW51ZTtcclxuICAgICAgY29uc3QgbG93ZXIgPSB0b2tlbi52YWx1ZS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuICAgICAgaWYgKGlkZW50aWZpZXJzLmhhcyhsb3dlcikpIHtcclxuICAgICAgICBjb25zdCBleGlzdGluZyA9IGlkZW50aWZpZXJzLmdldChsb3dlcikhO1xyXG4gICAgICAgIC8vIE9ubHkgcmVwb3J0IGlmIHRoZXkgZGlmZmVyIGluIGNhc2UgKG5vdCB0aGUgc2FtZSBpZGVudGlmaWVyKVxyXG4gICAgICAgIGlmIChleGlzdGluZy52YWx1ZSAhPT0gdG9rZW4udmFsdWUpIHtcclxuICAgICAgICAgIGNvbnN0IGtleSA9IFtleGlzdGluZy52YWx1ZSwgdG9rZW4udmFsdWVdLnNvcnQoKS5qb2luKCd8Jyk7XHJcbiAgICAgICAgICBpZiAoIXJlcG9ydGVkLmhhcyhrZXkpKSB7XHJcbiAgICAgICAgICAgIHJlcG9ydGVkLmFkZChrZXkpO1xyXG4gICAgICAgICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW3Rva2VuLmxpbmUgLSAxXSB8fCAnJztcclxuICAgICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgICB0b2tlbi5saW5lLFxyXG4gICAgICAgICAgICAgICAgdG9rZW4uY29sdW1uLFxyXG4gICAgICAgICAgICAgICAgYElkZW50aWZpZXIgJyR7dG9rZW4udmFsdWV9JyBkaWZmZXJzIG9ubHkgaW4gY2FzZSBmcm9tICcke2V4aXN0aW5nLnZhbHVlfScgKGxpbmUgJHtleGlzdGluZy5saW5lfSlgLFxyXG4gICAgICAgICAgICAgICAgbGluZS50cmltKClcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlkZW50aWZpZXJzLnNldChsb3dlciwgeyB2YWx1ZTogdG9rZW4udmFsdWUsIGxpbmU6IHRva2VuLmxpbmUgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19