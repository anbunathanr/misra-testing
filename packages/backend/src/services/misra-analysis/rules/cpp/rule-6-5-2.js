"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_6_5_2 = void 0;
/**
 * MISRA C++:2008 Rule 6-5-2
 * If loop-counter is not modified by -- or ++, then, within condition, the loop-counter shall only be used as an operand to <=, <, > or >=
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_6_5_2 {
    id = 'MISRA-CPP-6.5.2';
    description = 'If loop-counter is not modified by -- or ++, then, within condition, the loop-counter shall only be used as an operand to <=, <, > or >=';
    severity = 'required';
    category = 'Control flow';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_6_5_2 = Rule_CPP_6_5_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS02LTUtMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNi01LTIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBSUE7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRywwSUFBMEksQ0FBQztJQUN6SixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsOENBQThDO1FBQzlDLDJDQUEyQztRQUMzQyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQVpELHdDQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XG5cbi8qKlxuICogTUlTUkEgQysrOjIwMDggUnVsZSA2LTUtMlxuICogSWYgbG9vcC1jb3VudGVyIGlzIG5vdCBtb2RpZmllZCBieSAtLSBvciArKywgdGhlbiwgd2l0aGluIGNvbmRpdGlvbiwgdGhlIGxvb3AtY291bnRlciBzaGFsbCBvbmx5IGJlIHVzZWQgYXMgYW4gb3BlcmFuZCB0byA8PSwgPCwgPiBvciA+PVxuICogXG4gKiBOT1RFOiBUaGlzIGlzIGEgc3R1YiBpbXBsZW1lbnRhdGlvbi4gRnVsbCBpbXBsZW1lbnRhdGlvbiByZXF1aXJlczpcbiAqIC0gRGV0YWlsZWQgQVNUIGFuYWx5c2lzIGZvciB0aGlzIHNwZWNpZmljIHJ1bGVcbiAqIC0gQ29tcHJlaGVuc2l2ZSB0ZXN0IGNhc2VzXG4gKiAtIEludGVncmF0aW9uIHdpdGggdGhlIHJ1bGUgZW5naW5lXG4gKi9cbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF82XzVfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XG4gIGlkID0gJ01JU1JBLUNQUC02LjUuMic7XG4gIGRlc2NyaXB0aW9uID0gJ0lmIGxvb3AtY291bnRlciBpcyBub3QgbW9kaWZpZWQgYnkgLS0gb3IgKyssIHRoZW4sIHdpdGhpbiBjb25kaXRpb24sIHRoZSBsb29wLWNvdW50ZXIgc2hhbGwgb25seSBiZSB1c2VkIGFzIGFuIG9wZXJhbmQgdG8gPD0sIDwsID4gb3IgPj0nO1xuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XG4gIGNhdGVnb3J5ID0gJ0NvbnRyb2wgZmxvdyc7XG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XG5cbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gcmV0dXJucyBubyB2aW9sYXRpb25zXG4gICAgLy8gVE9ETzogSW1wbGVtZW50IGZ1bGwgcnVsZSBjaGVja2luZyBsb2dpY1xuICAgIHJldHVybiBbXTtcbiAgfVxufVxuIl19