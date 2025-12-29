import { commonTypeDefs } from './common.typeDef';
import { authTypeDefs } from './auth.typeDef';
import { adminTypeDefs } from './admin.typeDef';
import { employeeTypeDefs } from './employee.typeDef';

export const typeDefs = [commonTypeDefs, authTypeDefs, adminTypeDefs, employeeTypeDefs];
