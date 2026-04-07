"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_5_3_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 5-3-3
 * The unary & operator shall not be overloaded.
 */
class Rule_CPP_5_3_3 {
    id = 'MISRA-CPP-5.3.3';
    description = 'The unary & operator shall not be overloaded';
    severity = 'required';
    category = 'Operators';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // operator& overloading
            if (/operator\s*&\s*\(/.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Unary & operator overloading detected', line));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_5_3_3 = Rule_CPP_5_3_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTMtMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNS0zLTMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7R0FHRztBQUNILE1BQWEsY0FBYztJQUN6QixFQUFFLEdBQUcsaUJBQWlCLENBQUM7SUFDdkIsV0FBVyxHQUFHLDhDQUE4QyxDQUFDO0lBQzdELFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxXQUFXLENBQUM7SUFDdkIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsd0JBQXdCO1lBQ3hCLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCx1Q0FBdUMsRUFDdkMsSUFBSSxDQUNMLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBL0JELHdDQStCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDUtMy0zXHJcbiAqIFRoZSB1bmFyeSAmIG9wZXJhdG9yIHNoYWxsIG5vdCBiZSBvdmVybG9hZGVkLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzVfM18zIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtNS4zLjMnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSB1bmFyeSAmIG9wZXJhdG9yIHNoYWxsIG5vdCBiZSBvdmVybG9hZGVkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnT3BlcmF0b3JzJztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBvcGVyYXRvciYgb3ZlcmxvYWRpbmdcclxuICAgICAgaWYgKC9vcGVyYXRvclxccyomXFxzKlxcKC8udGVzdChsaW5lKSkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICdVbmFyeSAmIG9wZXJhdG9yIG92ZXJsb2FkaW5nIGRldGVjdGVkJyxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19