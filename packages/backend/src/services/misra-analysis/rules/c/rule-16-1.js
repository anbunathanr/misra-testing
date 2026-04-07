"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_16_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 16.1
 * All switch statements shall be well-formed.
 */
class Rule_C_16_1 {
    id = 'MISRA-C-16.1';
    description = 'All switch statements shall be well-formed';
    severity = 'required';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            if (line.startsWith('switch')) {
                let braceCount = 0;
                let foundCase = false;
                let foundDefault = false;
                let codeBeforeCase = false;
                // Check lines within switch statement
                for (let j = i; j < ast.lines.length; j++) {
                    const switchLine = ast.lines[j].trim();
                    if (switchLine.includes('{'))
                        braceCount++;
                    if (switchLine.includes('}'))
                        braceCount--;
                    if (braceCount === 0 && j > i)
                        break;
                    // Check for code before first case
                    if (!foundCase && !switchLine.startsWith('case') && !switchLine.startsWith('default') &&
                        !switchLine.startsWith('switch') && !switchLine.startsWith('{') &&
                        switchLine.length > 0 && !switchLine.startsWith('//')) {
                        codeBeforeCase = true;
                    }
                    if (switchLine.startsWith('case'))
                        foundCase = true;
                    if (switchLine.startsWith('default'))
                        foundDefault = true;
                }
                if (codeBeforeCase) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Switch statement contains code before first case label', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_16_1 = Rule_C_16_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNi0xLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNi0xLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsNENBQTRDLENBQUM7SUFDM0QsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO2dCQUNuQixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7Z0JBQ3RCLElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQztnQkFDekIsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO2dCQUUzQixzQ0FBc0M7Z0JBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUMxQyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUV2QyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO3dCQUFFLFVBQVUsRUFBRSxDQUFDO29CQUMzQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO3dCQUFFLFVBQVUsRUFBRSxDQUFDO29CQUUzQyxJQUFJLFVBQVUsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7d0JBQUUsTUFBTTtvQkFFckMsbUNBQW1DO29CQUNuQyxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDO3dCQUNqRixDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQzt3QkFDL0QsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQzFELGNBQWMsR0FBRyxJQUFJLENBQUM7b0JBQ3hCLENBQUM7b0JBRUQsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQzt3QkFBRSxTQUFTLEdBQUcsSUFBSSxDQUFDO29CQUNwRCxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDO3dCQUFFLFlBQVksR0FBRyxJQUFJLENBQUM7Z0JBQzVELENBQUM7Z0JBRUQsSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDbkIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELHdEQUF3RCxFQUN4RCxJQUFJLENBQ0wsQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQXZERCxrQ0F1REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTYuMVxyXG4gKiBBbGwgc3dpdGNoIHN0YXRlbWVudHMgc2hhbGwgYmUgd2VsbC1mb3JtZWQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzE2XzEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTYuMSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQWxsIHN3aXRjaCBzdGF0ZW1lbnRzIHNoYWxsIGJlIHdlbGwtZm9ybWVkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udHJvbCBmbG93JztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QubGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXS50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCdzd2l0Y2gnKSkge1xyXG4gICAgICAgIGxldCBicmFjZUNvdW50ID0gMDtcclxuICAgICAgICBsZXQgZm91bmRDYXNlID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGZvdW5kRGVmYXVsdCA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBjb2RlQmVmb3JlQ2FzZSA9IGZhbHNlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENoZWNrIGxpbmVzIHdpdGhpbiBzd2l0Y2ggc3RhdGVtZW50XHJcbiAgICAgICAgZm9yIChsZXQgaiA9IGk7IGogPCBhc3QubGluZXMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgIGNvbnN0IHN3aXRjaExpbmUgPSBhc3QubGluZXNbal0udHJpbSgpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoc3dpdGNoTGluZS5pbmNsdWRlcygneycpKSBicmFjZUNvdW50Kys7XHJcbiAgICAgICAgICBpZiAoc3dpdGNoTGluZS5pbmNsdWRlcygnfScpKSBicmFjZUNvdW50LS07XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmIChicmFjZUNvdW50ID09PSAwICYmIGogPiBpKSBicmVhaztcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gQ2hlY2sgZm9yIGNvZGUgYmVmb3JlIGZpcnN0IGNhc2VcclxuICAgICAgICAgIGlmICghZm91bmRDYXNlICYmICFzd2l0Y2hMaW5lLnN0YXJ0c1dpdGgoJ2Nhc2UnKSAmJiAhc3dpdGNoTGluZS5zdGFydHNXaXRoKCdkZWZhdWx0JykgJiYgXHJcbiAgICAgICAgICAgICAgIXN3aXRjaExpbmUuc3RhcnRzV2l0aCgnc3dpdGNoJykgJiYgIXN3aXRjaExpbmUuc3RhcnRzV2l0aCgneycpICYmIFxyXG4gICAgICAgICAgICAgIHN3aXRjaExpbmUubGVuZ3RoID4gMCAmJiAhc3dpdGNoTGluZS5zdGFydHNXaXRoKCcvLycpKSB7XHJcbiAgICAgICAgICAgIGNvZGVCZWZvcmVDYXNlID0gdHJ1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKHN3aXRjaExpbmUuc3RhcnRzV2l0aCgnY2FzZScpKSBmb3VuZENhc2UgPSB0cnVlO1xyXG4gICAgICAgICAgaWYgKHN3aXRjaExpbmUuc3RhcnRzV2l0aCgnZGVmYXVsdCcpKSBmb3VuZERlZmF1bHQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBpZiAoY29kZUJlZm9yZUNhc2UpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAnU3dpdGNoIHN0YXRlbWVudCBjb250YWlucyBjb2RlIGJlZm9yZSBmaXJzdCBjYXNlIGxhYmVsJyxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==