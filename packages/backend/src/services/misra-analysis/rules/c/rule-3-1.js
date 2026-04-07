"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_3_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 3.1
 * The character sequences /* and // shall not be used within a comment.
 */
class Rule_C_3_1 {
    id = 'MISRA-C-3.1';
    description = 'The character sequences /* and // shall not be used within a comment';
    severity = 'required';
    category = 'Comments';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Check for // within /* */ comment
            if (line.includes('/*') && line.includes('//')) {
                const commentStart = line.indexOf('/*');
                const slashSlash = line.indexOf('//');
                if (slashSlash > commentStart) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, slashSlash, 'Character sequence // used within comment', line.trim()));
                }
            }
            // Check for /* within // comment
            if (line.includes('//')) {
                const commentStart = line.indexOf('//');
                const slashStar = line.indexOf('/*', commentStart);
                if (slashStar > commentStart) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, slashStar, 'Character sequence /* used within comment', line.trim()));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_3_1 = Rule_C_3_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0zLTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTMtMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLHNFQUFzRSxDQUFDO0lBQ3JGLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxVQUFVLENBQUM7SUFDdEIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdEIsb0NBQW9DO1lBQ3BDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQy9DLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3hDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3RDLElBQUksVUFBVSxHQUFHLFlBQVksRUFBRSxDQUFDO29CQUM5QixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxVQUFVLEVBQ1YsMkNBQTJDLEVBQzNDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FDWixDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7WUFFRCxpQ0FBaUM7WUFDakMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3hCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3hDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUNuRCxJQUFJLFNBQVMsR0FBRyxZQUFZLEVBQUUsQ0FBQztvQkFDN0IsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsU0FBUyxFQUNULDJDQUEyQyxFQUMzQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQ1osQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQW5ERCxnQ0FtREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMy4xXHJcbiAqIFRoZSBjaGFyYWN0ZXIgc2VxdWVuY2VzIC8qIGFuZCAvLyBzaGFsbCBub3QgYmUgdXNlZCB3aXRoaW4gYSBjb21tZW50LlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18zXzEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMy4xJztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgY2hhcmFjdGVyIHNlcXVlbmNlcyAvKiBhbmQgLy8gc2hhbGwgbm90IGJlIHVzZWQgd2l0aGluIGEgY29tbWVudCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0NvbW1lbnRzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciAvLyB3aXRoaW4gLyogKi8gY29tbWVudFxyXG4gICAgICBpZiAobGluZS5pbmNsdWRlcygnLyonKSAmJiBsaW5lLmluY2x1ZGVzKCcvLycpKSB7XHJcbiAgICAgICAgY29uc3QgY29tbWVudFN0YXJ0ID0gbGluZS5pbmRleE9mKCcvKicpO1xyXG4gICAgICAgIGNvbnN0IHNsYXNoU2xhc2ggPSBsaW5lLmluZGV4T2YoJy8vJyk7XHJcbiAgICAgICAgaWYgKHNsYXNoU2xhc2ggPiBjb21tZW50U3RhcnQpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgc2xhc2hTbGFzaCxcclxuICAgICAgICAgICAgICAnQ2hhcmFjdGVyIHNlcXVlbmNlIC8vIHVzZWQgd2l0aGluIGNvbW1lbnQnLFxyXG4gICAgICAgICAgICAgIGxpbmUudHJpbSgpXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDaGVjayBmb3IgLyogd2l0aGluIC8vIGNvbW1lbnRcclxuICAgICAgaWYgKGxpbmUuaW5jbHVkZXMoJy8vJykpIHtcclxuICAgICAgICBjb25zdCBjb21tZW50U3RhcnQgPSBsaW5lLmluZGV4T2YoJy8vJyk7XHJcbiAgICAgICAgY29uc3Qgc2xhc2hTdGFyID0gbGluZS5pbmRleE9mKCcvKicsIGNvbW1lbnRTdGFydCk7XHJcbiAgICAgICAgaWYgKHNsYXNoU3RhciA+IGNvbW1lbnRTdGFydCkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICBzbGFzaFN0YXIsXHJcbiAgICAgICAgICAgICAgJ0NoYXJhY3RlciBzZXF1ZW5jZSAvKiB1c2VkIHdpdGhpbiBjb21tZW50JyxcclxuICAgICAgICAgICAgICBsaW5lLnRyaW0oKVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=