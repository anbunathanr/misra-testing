"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_2_5_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 2-5-1
 * Digraphs shall not be used.
 * Detects digraph sequences which can reduce code clarity.
 */
class Rule_CPP_2_5_1 {
    id = 'MISRA-CPP-2.5.1';
    description = 'Digraphs shall not be used';
    severity = 'advisory';
    category = 'Lexical conventions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Digraph sequences: <%, %>, <:, :>, %:, %:%:
        const digraphs = ['<%', '%>', '<:', ':>', '%:', '%:%:'];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().startsWith('//'))
                continue;
            for (const digraph of digraphs) {
                if (line.includes(digraph)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, line.indexOf(digraph), `Digraph '${digraph}' detected`, line.trim()));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_2_5_1 = Rule_CPP_2_5_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yLTUtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMi01LTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyw0QkFBNEIsQ0FBQztJQUMzQyxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcscUJBQXFCLENBQUM7SUFDakMsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsOENBQThDO1FBQzlDLE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUV4RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO2dCQUFFLFNBQVM7WUFFM0MsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQzNCLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQ3JCLFlBQVksT0FBTyxZQUFZLEVBQy9CLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FDWixDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBbkNELHdDQW1DQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDItNS0xXHJcbiAqIERpZ3JhcGhzIHNoYWxsIG5vdCBiZSB1c2VkLlxyXG4gKiBEZXRlY3RzIGRpZ3JhcGggc2VxdWVuY2VzIHdoaWNoIGNhbiByZWR1Y2UgY29kZSBjbGFyaXR5LlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzJfNV8xIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtMi41LjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0RpZ3JhcGhzIHNoYWxsIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdhZHZpc29yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnTGV4aWNhbCBjb252ZW50aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBEaWdyYXBoIHNlcXVlbmNlczogPCUsICU+LCA8OiwgOj4sICU6LCAlOiU6XHJcbiAgICBjb25zdCBkaWdyYXBocyA9IFsnPCUnLCAnJT4nLCAnPDonLCAnOj4nLCAnJTonLCAnJTolOiddO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldO1xyXG4gICAgICBpZiAobGluZS50cmltKCkuc3RhcnRzV2l0aCgnLy8nKSkgY29udGludWU7XHJcbiAgICAgIFxyXG4gICAgICBmb3IgKGNvbnN0IGRpZ3JhcGggb2YgZGlncmFwaHMpIHtcclxuICAgICAgICBpZiAobGluZS5pbmNsdWRlcyhkaWdyYXBoKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICBsaW5lLmluZGV4T2YoZGlncmFwaCksXHJcbiAgICAgICAgICAgICAgYERpZ3JhcGggJyR7ZGlncmFwaH0nIGRldGVjdGVkYCxcclxuICAgICAgICAgICAgICBsaW5lLnRyaW0oKVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=