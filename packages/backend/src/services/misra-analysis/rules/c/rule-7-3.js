"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_7_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 7.3
 * The lowercase character "l" shall not be used in a literal suffix.
 */
class Rule_C_7_3 {
    id = 'MISRA-C-7.3';
    description = 'The lowercase character "l" shall not be used in a literal suffix';
    severity = 'required';
    category = 'Literals';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i];
            // Match numeric literals with lowercase 'l' suffix
            const lowercaseLMatch = line.match(/\b\d+l\b/g);
            if (lowercaseLMatch) {
                for (const literal of lowercaseLMatch) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, line.indexOf(literal), `Lowercase 'l' suffix used in literal '${literal}'`, line.trim()));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_7_3 = Rule_C_7_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS03LTMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTctMy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLG1FQUFtRSxDQUFDO0lBQ2xGLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxVQUFVLENBQUM7SUFDdEIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBRW5DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFMUIsbURBQW1EO1lBQ25ELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDaEQsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDcEIsS0FBSyxNQUFNLE9BQU8sSUFBSSxlQUFlLEVBQUUsQ0FBQztvQkFDdEMsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFDckIseUNBQXlDLE9BQU8sR0FBRyxFQUNuRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQ1osQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQWhDRCxnQ0FnQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgNy4zXHJcbiAqIFRoZSBsb3dlcmNhc2UgY2hhcmFjdGVyIFwibFwiIHNoYWxsIG5vdCBiZSB1c2VkIGluIGEgbGl0ZXJhbCBzdWZmaXguXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzdfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy03LjMnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBsb3dlcmNhc2UgY2hhcmFjdGVyIFwibFwiIHNoYWxsIG5vdCBiZSB1c2VkIGluIGEgbGl0ZXJhbCBzdWZmaXgnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdMaXRlcmFscyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV07XHJcbiAgICAgIFxyXG4gICAgICAvLyBNYXRjaCBudW1lcmljIGxpdGVyYWxzIHdpdGggbG93ZXJjYXNlICdsJyBzdWZmaXhcclxuICAgICAgY29uc3QgbG93ZXJjYXNlTE1hdGNoID0gbGluZS5tYXRjaCgvXFxiXFxkK2xcXGIvZyk7XHJcbiAgICAgIGlmIChsb3dlcmNhc2VMTWF0Y2gpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IGxpdGVyYWwgb2YgbG93ZXJjYXNlTE1hdGNoKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIGxpbmUuaW5kZXhPZihsaXRlcmFsKSxcclxuICAgICAgICAgICAgICBgTG93ZXJjYXNlICdsJyBzdWZmaXggdXNlZCBpbiBsaXRlcmFsICcke2xpdGVyYWx9J2AsXHJcbiAgICAgICAgICAgICAgbGluZS50cmltKClcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19