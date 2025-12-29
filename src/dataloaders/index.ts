import DataLoader from 'dataloader';
import { PrismaClient, Employee, User, Subject, Attendance } from '@prisma/client';

/**
 * Creates DataLoaders for batching and caching database queries
 * This prevents N+1 query problems in GraphQL resolvers
 */
export function createDataLoaders(prisma: PrismaClient) {
  return {
    // Batch load users by ID
    userLoader: new DataLoader<string, User | null>(async (userIds) => {
      const users = await prisma.user.findMany({
        where: { id: { in: [...userIds] } },
      });
      const userMap = new Map(users.map((user) => [user.id, user]));
      return userIds.map((id) => userMap.get(id) || null);
    }),

    // Batch load employees by ID
    employeeLoader: new DataLoader<string, Employee | null>(async (employeeIds) => {
      const employees = await prisma.employee.findMany({
        where: { id: { in: [...employeeIds] } },
      });
      const employeeMap = new Map(employees.map((emp) => [emp.id, emp]));
      return employeeIds.map((id) => employeeMap.get(id) || null);
    }),

    // Batch load employees by user ID
    employeeByUserIdLoader: new DataLoader<string, Employee | null>(async (userIds) => {
      const employees = await prisma.employee.findMany({
        where: { userId: { in: [...userIds] } },
      });
      const employeeMap = new Map(employees.map((emp) => [emp.userId, emp]));
      return userIds.map((id) => employeeMap.get(id) || null);
    }),

    // Batch load subjects by ID
    subjectLoader: new DataLoader<string, Subject | null>(async (subjectIds) => {
      const subjects = await prisma.subject.findMany({
        where: { id: { in: [...subjectIds] } },
      });
      const subjectMap = new Map(subjects.map((sub) => [sub.id, sub]));
      return subjectIds.map((id) => subjectMap.get(id) || null);
    }),

    // Batch load subjects by employee ID
    subjectsByEmployeeIdLoader: new DataLoader<string, Subject[]>(async (employeeIds) => {
      const employeeSubjects = await prisma.employeeSubject.findMany({
        where: { employeeId: { in: [...employeeIds] } },
        include: { subject: true },
      });

      const subjectsMap = new Map<string, Subject[]>();
      employeeIds.forEach((id) => subjectsMap.set(id, []));

      employeeSubjects.forEach((es) => {
        const subjects = subjectsMap.get(es.employeeId) || [];
        subjects.push(es.subject);
        subjectsMap.set(es.employeeId, subjects);
      });

      return employeeIds.map((id) => subjectsMap.get(id) || []);
    }),

    // Batch load employees by subject ID
    employeesBySubjectIdLoader: new DataLoader<string, Employee[]>(async (subjectIds) => {
      const employeeSubjects = await prisma.employeeSubject.findMany({
        where: { subjectId: { in: [...subjectIds] } },
        include: { employee: true },
      });

      const employeesMap = new Map<string, Employee[]>();
      subjectIds.forEach((id) => employeesMap.set(id, []));

      employeeSubjects.forEach((es) => {
        const employees = employeesMap.get(es.subjectId) || [];
        employees.push(es.employee);
        employeesMap.set(es.subjectId, employees);
      });

      return subjectIds.map((id) => employeesMap.get(id) || []);
    }),

    // Batch load attendance by employee ID
    attendanceByEmployeeIdLoader: new DataLoader<string, Attendance[]>(async (employeeIds) => {
      const attendances = await prisma.attendance.findMany({
        where: { employeeId: { in: [...employeeIds] } },
        orderBy: { date: 'desc' },
      });

      const attendanceMap = new Map<string, Attendance[]>();
      employeeIds.forEach((id) => attendanceMap.set(id, []));

      attendances.forEach((att) => {
        const atts = attendanceMap.get(att.employeeId) || [];
        atts.push(att);
        attendanceMap.set(att.employeeId, atts);
      });

      return employeeIds.map((id) => attendanceMap.get(id) || []);
    }),
  };
}

export type DataLoaders = ReturnType<typeof createDataLoaders>;

