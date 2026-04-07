"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_12_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 12.3
 * The comma operator should not be used.
 */
class Rule_C_12_3 {
    id = 'MISRA-C-12.3';
    description = 'The comma operator should not be used';
    severity = 'advisory';
    category = 'Expressions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Skip for loops (comma is allowed in for loop initialization/increment)
            if (line.startsWith('for'))
                continue;
            // Check for comma operator usage (not in function calls or declarations)
            // Look for comma outside of parentheses
            let parenDepth = 0;
            let inString = false;
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"' && (j === 0 || line[j - 1] !== '\\')) {
                    inString = !inString;
                }
                if (!inString) {
                    if (char === '(')
                        parenDepth++;
                    if (char === ')')
                        parenDepth--;
                    // Comma outside parentheses (not in function call/declaration)
                    if (char === ',' && parenDepth === 0 && !line.includes('=')) {
                        violations.push((0, rule_engine_1.createViolation)(this, i + 1, j, 'Comma operator should not be used', line));
                        break;
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_12_3 = Rule_C_12_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMi0zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMi0zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsdUNBQXVDLENBQUM7SUFDdEQsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGFBQWEsQ0FBQztJQUN6QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyx5RUFBeUU7WUFDekUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztnQkFBRSxTQUFTO1lBRXJDLHlFQUF5RTtZQUN6RSx3Q0FBd0M7WUFDeEMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQztZQUVyQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNyQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRXJCLElBQUksSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUNwRCxRQUFRLEdBQUcsQ0FBQyxRQUFRLENBQUM7Z0JBQ3ZCLENBQUM7Z0JBRUQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNkLElBQUksSUFBSSxLQUFLLEdBQUc7d0JBQUUsVUFBVSxFQUFFLENBQUM7b0JBQy9CLElBQUksSUFBSSxLQUFLLEdBQUc7d0JBQUUsVUFBVSxFQUFFLENBQUM7b0JBRS9CLCtEQUErRDtvQkFDL0QsSUFBSSxJQUFJLEtBQUssR0FBRyxJQUFJLFVBQVUsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQzVELFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxtQ0FBbUMsRUFDbkMsSUFBSSxDQUNMLENBQ0YsQ0FBQzt3QkFDRixNQUFNO29CQUNSLENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBbkRELGtDQW1EQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAxMi4zXHJcbiAqIFRoZSBjb21tYSBvcGVyYXRvciBzaG91bGQgbm90IGJlIHVzZWQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzEyXzMgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTIuMyc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIGNvbW1hIG9wZXJhdG9yIHNob3VsZCBub3QgYmUgdXNlZCc7XHJcbiAgc2V2ZXJpdHkgPSAnYWR2aXNvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0V4cHJlc3Npb25zJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QubGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXS50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBTa2lwIGZvciBsb29wcyAoY29tbWEgaXMgYWxsb3dlZCBpbiBmb3IgbG9vcCBpbml0aWFsaXphdGlvbi9pbmNyZW1lbnQpXHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ2ZvcicpKSBjb250aW51ZTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBjb21tYSBvcGVyYXRvciB1c2FnZSAobm90IGluIGZ1bmN0aW9uIGNhbGxzIG9yIGRlY2xhcmF0aW9ucylcclxuICAgICAgLy8gTG9vayBmb3IgY29tbWEgb3V0c2lkZSBvZiBwYXJlbnRoZXNlc1xyXG4gICAgICBsZXQgcGFyZW5EZXB0aCA9IDA7XHJcbiAgICAgIGxldCBpblN0cmluZyA9IGZhbHNlO1xyXG4gICAgICBcclxuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBsaW5lLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgY29uc3QgY2hhciA9IGxpbmVbal07XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGNoYXIgPT09ICdcIicgJiYgKGogPT09IDAgfHwgbGluZVtqLTFdICE9PSAnXFxcXCcpKSB7XHJcbiAgICAgICAgICBpblN0cmluZyA9ICFpblN0cmluZztcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKCFpblN0cmluZykge1xyXG4gICAgICAgICAgaWYgKGNoYXIgPT09ICcoJykgcGFyZW5EZXB0aCsrO1xyXG4gICAgICAgICAgaWYgKGNoYXIgPT09ICcpJykgcGFyZW5EZXB0aC0tO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBDb21tYSBvdXRzaWRlIHBhcmVudGhlc2VzIChub3QgaW4gZnVuY3Rpb24gY2FsbC9kZWNsYXJhdGlvbilcclxuICAgICAgICAgIGlmIChjaGFyID09PSAnLCcgJiYgcGFyZW5EZXB0aCA9PT0gMCAmJiAhbGluZS5pbmNsdWRlcygnPScpKSB7XHJcbiAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgICBqLFxyXG4gICAgICAgICAgICAgICAgJ0NvbW1hIG9wZXJhdG9yIHNob3VsZCBub3QgYmUgdXNlZCcsXHJcbiAgICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19