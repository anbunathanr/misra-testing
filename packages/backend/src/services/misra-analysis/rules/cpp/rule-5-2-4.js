"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_5_2_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 5-2-4
 * C-style casts (other than void casts) and functional notation casts (other than explicit constructor calls) shall not be used.
 */
class Rule_CPP_5_2_4 {
    id = 'MISRA-CPP-5.2.4';
    description = 'C-style casts shall not be used';
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
            // Skip C++ cast operators
            if (line.includes('static_cast') || line.includes('dynamic_cast') ||
                line.includes('const_cast') || line.includes('reinterpret_cast')) {
                continue;
            }
            // C-style cast: (type)expr
            if (/\(\s*\w+\s*\)/.test(line) && !line.includes('void')) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'C-style cast detected, use C++ cast operators', line));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_5_2_4 = Rule_CPP_5_2_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTItNC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNS0yLTQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7R0FHRztBQUNILE1BQWEsY0FBYztJQUN6QixFQUFFLEdBQUcsaUJBQWlCLENBQUM7SUFDdkIsV0FBVyxHQUFHLGlDQUFpQyxDQUFDO0lBQ2hELFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsMEJBQTBCO1lBQzFCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztnQkFDckUsU0FBUztZQUNYLENBQUM7WUFFRCwyQkFBMkI7WUFDM0IsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUN6RCxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsK0NBQStDLEVBQy9DLElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQXJDRCx3Q0FxQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQysrOjIwMDggUnVsZSA1LTItNFxyXG4gKiBDLXN0eWxlIGNhc3RzIChvdGhlciB0aGFuIHZvaWQgY2FzdHMpIGFuZCBmdW5jdGlvbmFsIG5vdGF0aW9uIGNhc3RzIChvdGhlciB0aGFuIGV4cGxpY2l0IGNvbnN0cnVjdG9yIGNhbGxzKSBzaGFsbCBub3QgYmUgdXNlZC5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF81XzJfNCBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTUuMi40JztcclxuICBkZXNjcmlwdGlvbiA9ICdDLXN0eWxlIGNhc3RzIHNoYWxsIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udmVyc2lvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcvLycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8ICFsaW5lKSBjb250aW51ZTtcclxuXHJcbiAgICAgIC8vIFNraXAgQysrIGNhc3Qgb3BlcmF0b3JzXHJcbiAgICAgIGlmIChsaW5lLmluY2x1ZGVzKCdzdGF0aWNfY2FzdCcpIHx8IGxpbmUuaW5jbHVkZXMoJ2R5bmFtaWNfY2FzdCcpIHx8IFxyXG4gICAgICAgICAgbGluZS5pbmNsdWRlcygnY29uc3RfY2FzdCcpIHx8IGxpbmUuaW5jbHVkZXMoJ3JlaW50ZXJwcmV0X2Nhc3QnKSkge1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDLXN0eWxlIGNhc3Q6ICh0eXBlKWV4cHJcclxuICAgICAgaWYgKC9cXChcXHMqXFx3K1xccypcXCkvLnRlc3QobGluZSkgJiYgIWxpbmUuaW5jbHVkZXMoJ3ZvaWQnKSkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICdDLXN0eWxlIGNhc3QgZGV0ZWN0ZWQsIHVzZSBDKysgY2FzdCBvcGVyYXRvcnMnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=