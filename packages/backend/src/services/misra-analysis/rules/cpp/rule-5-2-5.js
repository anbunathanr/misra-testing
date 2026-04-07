"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_5_2_5 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 5-2-5
 * A cast shall not remove any const or volatile qualification from the type of a pointer or reference.
 */
class Rule_CPP_5_2_5 {
    id = 'MISRA-CPP-5.2.5';
    description = 'Casts shall not remove const or volatile qualification';
    severity = 'required';
    category = 'Conversions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // const_cast usage
            if (/const_cast\s*</.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'const_cast removes const/volatile qualification', line));
            }
            // C-style cast removing const
            if (/\(\s*\w+\s*\*\s*\)/.test(line) && /const/.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Cast may remove const qualification', line));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_5_2_5 = Rule_CPP_5_2_5;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTItNS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNS0yLTUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7R0FHRztBQUNILE1BQWEsY0FBYztJQUN6QixFQUFFLEdBQUcsaUJBQWlCLENBQUM7SUFDdkIsV0FBVyxHQUFHLHdEQUF3RCxDQUFDO0lBQ3ZFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsbUJBQW1CO1lBQ25CLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxpREFBaUQsRUFDakQsSUFBSSxDQUNMLENBQ0YsQ0FBQztZQUNKLENBQUM7WUFFRCw4QkFBOEI7WUFDOUIsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUMxRCxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QscUNBQXFDLEVBQ3JDLElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTVDRCx3Q0E0Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQysrOjIwMDggUnVsZSA1LTItNVxyXG4gKiBBIGNhc3Qgc2hhbGwgbm90IHJlbW92ZSBhbnkgY29uc3Qgb3Igdm9sYXRpbGUgcXVhbGlmaWNhdGlvbiBmcm9tIHRoZSB0eXBlIG9mIGEgcG9pbnRlciBvciByZWZlcmVuY2UuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfNV8yXzUgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC01LjIuNSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQ2FzdHMgc2hhbGwgbm90IHJlbW92ZSBjb25zdCBvciB2b2xhdGlsZSBxdWFsaWZpY2F0aW9uJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udmVyc2lvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcvLycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8ICFsaW5lKSBjb250aW51ZTtcclxuXHJcbiAgICAgIC8vIGNvbnN0X2Nhc3QgdXNhZ2VcclxuICAgICAgaWYgKC9jb25zdF9jYXN0XFxzKjwvLnRlc3QobGluZSkpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAnY29uc3RfY2FzdCByZW1vdmVzIGNvbnN0L3ZvbGF0aWxlIHF1YWxpZmljYXRpb24nLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQy1zdHlsZSBjYXN0IHJlbW92aW5nIGNvbnN0XHJcbiAgICAgIGlmICgvXFwoXFxzKlxcdytcXHMqXFwqXFxzKlxcKS8udGVzdChsaW5lKSAmJiAvY29uc3QvLnRlc3QobGluZSkpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAnQ2FzdCBtYXkgcmVtb3ZlIGNvbnN0IHF1YWxpZmljYXRpb24nLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=