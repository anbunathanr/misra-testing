"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_3_2_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 3-2-4
 * An identifier with external linkage shall have exactly one definition.
 * Detects missing or duplicate definitions.
 */
class Rule_CPP_3_2_4 {
    id = 'MISRA-CPP-3.2.4';
    description = 'External identifiers shall have exactly one definition';
    severity = 'required';
    category = 'Declarations';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Track extern declarations and definitions
        const externDecls = new Map();
        const definitions = new Map();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Extern declaration
            const externMatch = line.match(/^\s*extern\s+\w+\s+(\w+)\s*;/);
            if (externMatch) {
                externDecls.set(externMatch[1], i + 1);
            }
            // Definition
            const defMatch = line.match(/^\s*\w+\s+(\w+)\s*=\s*[^;]+;/);
            if (defMatch && !line.includes('extern')) {
                const name = defMatch[1];
                if (definitions.has(name)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Multiple definitions of '${name}'`, line));
                }
                definitions.set(name, i + 1);
            }
        }
        return violations;
    }
}
exports.Rule_CPP_3_2_4 = Rule_CPP_3_2_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0zLTItNC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMy0yLTQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyx3REFBd0QsQ0FBQztJQUN2RSxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLDRDQUE0QztRQUM1QyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUM5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUU5QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSxxQkFBcUI7WUFDckIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1lBQy9ELElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2hCLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN6QyxDQUFDO1lBRUQsYUFBYTtZQUNiLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQztZQUM1RCxJQUFJLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN6QixJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDMUIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDRCQUE0QixJQUFJLEdBQUcsRUFDbkMsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO2dCQUNELFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTlDRCx3Q0E4Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQysrOjIwMDggUnVsZSAzLTItNFxyXG4gKiBBbiBpZGVudGlmaWVyIHdpdGggZXh0ZXJuYWwgbGlua2FnZSBzaGFsbCBoYXZlIGV4YWN0bHkgb25lIGRlZmluaXRpb24uXHJcbiAqIERldGVjdHMgbWlzc2luZyBvciBkdXBsaWNhdGUgZGVmaW5pdGlvbnMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfM18yXzQgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC0zLjIuNCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnRXh0ZXJuYWwgaWRlbnRpZmllcnMgc2hhbGwgaGF2ZSBleGFjdGx5IG9uZSBkZWZpbml0aW9uJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRGVjbGFyYXRpb25zJztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIFRyYWNrIGV4dGVybiBkZWNsYXJhdGlvbnMgYW5kIGRlZmluaXRpb25zXHJcbiAgICBjb25zdCBleHRlcm5EZWNscyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcbiAgICBjb25zdCBkZWZpbml0aW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcvLycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8ICFsaW5lKSBjb250aW51ZTtcclxuXHJcbiAgICAgIC8vIEV4dGVybiBkZWNsYXJhdGlvblxyXG4gICAgICBjb25zdCBleHRlcm5NYXRjaCA9IGxpbmUubWF0Y2goL15cXHMqZXh0ZXJuXFxzK1xcdytcXHMrKFxcdyspXFxzKjsvKTtcclxuICAgICAgaWYgKGV4dGVybk1hdGNoKSB7XHJcbiAgICAgICAgZXh0ZXJuRGVjbHMuc2V0KGV4dGVybk1hdGNoWzFdLCBpICsgMSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIERlZmluaXRpb25cclxuICAgICAgY29uc3QgZGVmTWF0Y2ggPSBsaW5lLm1hdGNoKC9eXFxzKlxcdytcXHMrKFxcdyspXFxzKj1cXHMqW147XSs7Lyk7XHJcbiAgICAgIGlmIChkZWZNYXRjaCAmJiAhbGluZS5pbmNsdWRlcygnZXh0ZXJuJykpIHtcclxuICAgICAgICBjb25zdCBuYW1lID0gZGVmTWF0Y2hbMV07XHJcbiAgICAgICAgaWYgKGRlZmluaXRpb25zLmhhcyhuYW1lKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgIGBNdWx0aXBsZSBkZWZpbml0aW9ucyBvZiAnJHtuYW1lfSdgLFxyXG4gICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGVmaW5pdGlvbnMuc2V0KG5hbWUsIGkgKyAxKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=