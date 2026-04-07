"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_3_2_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 3-2-2
 * The One Definition Rule shall not be violated.
 * Detects multiple definitions of the same entity.
 */
class Rule_CPP_3_2_2 {
    id = 'MISRA-CPP-3.2.2';
    description = 'The One Definition Rule shall not be violated';
    severity = 'required';
    category = 'Declarations';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Track function definitions
        const definitions = new Map();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Match function definitions: type name(...) {
            const defMatch = line.match(/^\s*\w+\s+(\w+)\s*\([^)]*\)\s*{/);
            if (!defMatch)
                continue;
            const name = defMatch[1];
            if (definitions.has(name)) {
                const prevLine = definitions.get(name);
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Multiple definitions of '${name}' (previously defined at line ${prevLine})`, line));
            }
            else {
                definitions.set(name, i + 1);
            }
        }
        return violations;
    }
}
exports.Rule_CPP_3_2_2 = Rule_CPP_3_2_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0zLTItMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMy0yLTIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRywrQ0FBK0MsQ0FBQztJQUM5RCxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLDZCQUE2QjtRQUM3QixNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUU5QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSwrQ0FBK0M7WUFDL0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1lBQy9ELElBQUksQ0FBQyxRQUFRO2dCQUFFLFNBQVM7WUFFeEIsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXpCLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUMxQixNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDO2dCQUN4QyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsNEJBQTRCLElBQUksaUNBQWlDLFFBQVEsR0FBRyxFQUM1RSxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztpQkFBTSxDQUFDO2dCQUNOLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTFDRCx3Q0EwQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQysrOjIwMDggUnVsZSAzLTItMlxyXG4gKiBUaGUgT25lIERlZmluaXRpb24gUnVsZSBzaGFsbCBub3QgYmUgdmlvbGF0ZWQuXHJcbiAqIERldGVjdHMgbXVsdGlwbGUgZGVmaW5pdGlvbnMgb2YgdGhlIHNhbWUgZW50aXR5LlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzNfMl8yIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtMy4yLjInO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBPbmUgRGVmaW5pdGlvbiBSdWxlIHNoYWxsIG5vdCBiZSB2aW9sYXRlZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0RlY2xhcmF0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBUcmFjayBmdW5jdGlvbiBkZWZpbml0aW9uc1xyXG4gICAgY29uc3QgZGVmaW5pdGlvbnMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBNYXRjaCBmdW5jdGlvbiBkZWZpbml0aW9uczogdHlwZSBuYW1lKC4uLikge1xyXG4gICAgICBjb25zdCBkZWZNYXRjaCA9IGxpbmUubWF0Y2goL15cXHMqXFx3K1xccysoXFx3KylcXHMqXFwoW14pXSpcXClcXHMqey8pO1xyXG4gICAgICBpZiAoIWRlZk1hdGNoKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGNvbnN0IG5hbWUgPSBkZWZNYXRjaFsxXTtcclxuXHJcbiAgICAgIGlmIChkZWZpbml0aW9ucy5oYXMobmFtZSkpIHtcclxuICAgICAgICBjb25zdCBwcmV2TGluZSA9IGRlZmluaXRpb25zLmdldChuYW1lKSE7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgYE11bHRpcGxlIGRlZmluaXRpb25zIG9mICcke25hbWV9JyAocHJldmlvdXNseSBkZWZpbmVkIGF0IGxpbmUgJHtwcmV2TGluZX0pYCxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZGVmaW5pdGlvbnMuc2V0KG5hbWUsIGkgKyAxKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=