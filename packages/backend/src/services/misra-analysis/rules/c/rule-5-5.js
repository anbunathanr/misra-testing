"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_5_5 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 5.5
 * Identifiers shall be distinct from macro names.
 */
class Rule_C_5_5 {
    id = 'MISRA-C-5.5';
    description = 'Identifiers shall be distinct from macro names';
    severity = 'required';
    category = 'Identifiers';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const macros = new Set();
        const identifiers = new Map();
        // Collect macros
        for (const line of ast.lines) {
            const macroMatch = line.match(/^#define\s+(\w+)/);
            if (macroMatch) {
                macros.add(macroMatch[1]);
            }
        }
        // Check identifiers
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            const declMatch = line.match(/(?:int|char|float|double|long|short|void)\s+(\w+)/);
            if (declMatch && macros.has(declMatch[1])) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Identifier '${declMatch[1]}' conflicts with macro name`, line));
            }
        }
        return violations;
    }
}
exports.Rule_C_5_5 = Rule_C_5_5;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTUtNS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLGdEQUFnRCxDQUFDO0lBQy9ELFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDakMsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFFOUMsaUJBQWlCO1FBQ2pCLEtBQUssTUFBTSxJQUFJLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzdCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUNsRCxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNmLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUIsQ0FBQztRQUNILENBQUM7UUFFRCxvQkFBb0I7UUFDcEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNqQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7WUFFbEYsSUFBSSxTQUFTLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsZUFBZSxTQUFTLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixFQUN4RCxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUF4Q0QsZ0NBd0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDUuNVxyXG4gKiBJZGVudGlmaWVycyBzaGFsbCBiZSBkaXN0aW5jdCBmcm9tIG1hY3JvIG5hbWVzLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ181XzUgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtNS41JztcclxuICBkZXNjcmlwdGlvbiA9ICdJZGVudGlmaWVycyBzaGFsbCBiZSBkaXN0aW5jdCBmcm9tIG1hY3JvIG5hbWVzJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnSWRlbnRpZmllcnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IG1hY3JvcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAgY29uc3QgaWRlbnRpZmllcnMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xyXG5cclxuICAgIC8vIENvbGxlY3QgbWFjcm9zXHJcbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgYXN0LmxpbmVzKSB7XHJcbiAgICAgIGNvbnN0IG1hY3JvTWF0Y2ggPSBsaW5lLm1hdGNoKC9eI2RlZmluZVxccysoXFx3KykvKTtcclxuICAgICAgaWYgKG1hY3JvTWF0Y2gpIHtcclxuICAgICAgICBtYWNyb3MuYWRkKG1hY3JvTWF0Y2hbMV0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgaWRlbnRpZmllcnNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBjb25zdCBkZWNsTWF0Y2ggPSBsaW5lLm1hdGNoKC8oPzppbnR8Y2hhcnxmbG9hdHxkb3VibGV8bG9uZ3xzaG9ydHx2b2lkKVxccysoXFx3KykvKTtcclxuICAgICAgXHJcbiAgICAgIGlmIChkZWNsTWF0Y2ggJiYgbWFjcm9zLmhhcyhkZWNsTWF0Y2hbMV0pKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgYElkZW50aWZpZXIgJyR7ZGVjbE1hdGNoWzFdfScgY29uZmxpY3RzIHdpdGggbWFjcm8gbmFtZWAsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==